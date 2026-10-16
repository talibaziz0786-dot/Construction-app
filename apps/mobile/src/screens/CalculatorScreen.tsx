/**
 * Calculator detail screen — server-authoritative when online, verified
 * offline mirror when the network is unavailable. Offline results are
 * labelled, saved locally, and queued for server verification on reconnect.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalculatorApiError,
  isNetworkError,
  runCalculator,
} from '../api/calculatorApi';
import { runOfflineCalculator } from '../offline/offlineRunner';
import { OfflineInputError } from '../offline/methodology';
import { appendHistory, enqueueSync } from '../offline/history';
import { colors, MIN_TOUCH_TARGET, spacing } from '../theme';
import type { translator } from '../i18n/strings';
import type {
  CalculatorHubEntry,
  CalculatorInputField,
  CalculatorRunResponse,
  OpeningInputValue,
  OpeningType,
} from '../types/calculator';

interface CalculatorScreenProps {
  t: ReturnType<typeof translator>;
  entry: CalculatorHubEntry;
}

type FieldErrors = Record<string, string>;

const OPENING_TYPES: OpeningType[] = ['door', 'window', 'ventilator', 'other'];

function defaultOpening(): OpeningInputValue {
  return { type: 'door', width: 1, height: 2, quantity: 1 };
}

export function CalculatorScreen({ t, entry, onCalculated }: CalculatorScreenProps & { onCalculated?: () => void }) {
  const numericFields = useMemo(
    () => entry.fields.filter((field) => field.kind !== 'openings'),
    [entry]
  );
  const openingsField = useMemo(
    () => entry.fields.find((field) => field.kind === 'openings'),
    [entry]
  );

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(numericFields.map((field) => [field.name, String(field.defaultValue)]))
  );
  const [openings, setOpenings] = useState<OpeningInputValue[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<CalculatorRunResponse | null>(null);
  const [resultSource, setResultSource] = useState<'server' | 'offline' | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [runError, setRunError] = useState<{ title: string; detail: string; points?: string[] } | null>(null);

  function setValue(name: string, text: string) {
    setValues((previous) => ({ ...previous, [name]: text }));
    setResult(null);
    setResultSource(null);
  }

  function touch(name: string) {
    setTouched((previous) => ({ ...previous, [name]: true }));
  }

  function validateField(field: CalculatorInputField, text: string): string | null {
    if (text.trim() === '') return t('errorRequired');
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return t('errorNumber');
    if (parsed < field.min || parsed > field.max) return t('errorRange')(field.min, field.max);
    return null;
  }

  function validateAll(current: Record<string, string>): FieldErrors {
    const next: FieldErrors = {};
    for (const field of numericFields) {
      const message = validateField(field, current[field.name] ?? '');
      if (message) next[field.name] = message;
    }
    return next;
  }

  function handleCalculate() {
    if (calculating) return;
    const nextErrors = validateAll(values);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(numericFields.map((field) => [field.name, true])));
    if (Object.keys(nextErrors).length > 0) return;

    const canonical: Record<string, unknown> = {};
    for (const field of numericFields) {
      canonical[field.name] = Number(values[field.name]);
    }
    if (openingsField) {
      canonical[openingsField.name] = openings.map((opening) => ({
        type: opening.type,
        width: opening.width,
        height: opening.height,
        quantity: opening.quantity,
      }));
    }

    // Offline-first: try the server, fall back to the verified local mirror
    // on device-level network failure. Offline results are labelled, saved
    // to history, and queued for server verification when online returns.
    async function useOfflineResult(reason: string) {
      try {
        const offline = runOfflineCalculator(entry.calculatorId, canonical);
        setResult(offline);
        setResultSource('offline');
        setRunError(null);
        const historyEntry = await appendHistory({
          calculatorId: entry.calculatorId,
          name: entry.name,
          values: canonical,
          result: offline,
          source: 'offline',
          verified: false,
        });
        const queueItem = await enqueueSync(entry.calculatorId, canonical);
        void historyEntry;
        void queueItem;
        onCalculated?.();
      } catch (offlineError) {
        if (offlineError instanceof OfflineInputError) {
          setRunError({ title: t('errorServer'), detail: offlineError.message });
        } else {
          setRunError({ title: t('errorNetwork'), detail: reason });
        }
      }
    }

    setCalculating(true);
    setRunError(null);
    void runCalculator(entry.calculatorId, { values: canonical })
      .then(async (response) => {
        setResult(response);
        setResultSource('server');
        await appendHistory({
          calculatorId: entry.calculatorId,
          name: entry.name,
          values: canonical,
          result: response,
          source: 'server',
          verified: true,
        });
        onCalculated?.();
      })
      .catch((failure: unknown) => {
        if (isNetworkError(failure)) {
          void useOfflineResult(failure instanceof Error ? failure.message : String(failure));
        } else if (failure instanceof CalculatorApiError) {
          setRunError({
            title: t('errorServer'),
            detail: failure.message,
            points: failure.details,
          });
        } else {
          setRunError({
            title: t('errorServer'),
            detail: failure instanceof Error ? failure.message : String(failure),
          });
        }
      })
      .finally(() => setCalculating(false));
  }

  function handleReset() {
    setValues(Object.fromEntries(numericFields.map((field) => [field.name, String(field.defaultValue)])));
    setOpenings([]);
    setTouched({});
    setErrors({});
    setResult(null);
    setResultSource(null);
    setRunError(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.calcName}>{entry.name}</Text>
      {entry.summary ? <Text style={styles.summary}>{entry.summary}</Text> : null}

      <Text style={styles.section}>{t('formSection')}</Text>
      {numericFields.map((field) => {
        const message = touched[field.name]
          ? errors[field.name] ?? validateField(field, values[field.name] ?? '')
          : null;
        return (
          <View key={field.name} style={styles.field}>
            <Text style={styles.label}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ''}
            </Text>
            <TextInput
              style={[styles.input, message ? styles.inputError : null]}
              value={values[field.name] ?? ''}
              onChangeText={(text) => setValue(field.name, text)}
              onBlur={() => touch(field.name)}
              keyboardType="decimal-pad"
              accessibilityLabel={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}
              returnKeyType="next"
            />
            {field.help ? <Text style={styles.help}>{field.help}</Text> : null}
            {message ? <Text style={styles.fieldError}>{message}</Text> : null}
          </View>
        );
      })}

      {openingsField ? (
        <View style={styles.openings}>
          <Text style={styles.label}>{openingsField.label}</Text>
          {openingsField.help ? <Text style={styles.help}>{openingsField.help}</Text> : null}
          {openings.map((opening, index) => (
            <View
              key={`opening-${index}`}
              style={styles.openingCard}
              accessibilityLabel={`${t('openingsTitle')} ${index + 1}`}
            >
              <View style={styles.typeRow}>
                {OPENING_TYPES.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.typeChip, opening.type === option && styles.typeChipActive]}
                    onPress={() =>
                      setOpenings((previous) =>
                        previous.map((item, i) => (i === index ? { ...item, type: option } : item))
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={option}
                    accessibilityState={{ selected: opening.type === option }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.typeText, opening.type === option && styles.typeTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.openingInputs}>
                <LabeledNumber
                  label={String(t('width'))}
                  value={String(opening.width)}
                  onChange={(text) =>
                    setOpenings((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, width: Number(text) || 0 } : item
                      )
                    )
                  }
                />
                <LabeledNumber
                  label={String(t('height'))}
                  value={String(opening.height)}
                  onChange={(text) =>
                    setOpenings((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, height: Number(text) || 0 } : item
                      )
                    )
                  }
                />
                <LabeledNumber
                  label={String(t('qty'))}
                  value={String(opening.quantity)}
                  onChange={(text) =>
                    setOpenings((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, quantity: Math.max(1, Math.round(Number(text) || 1)) } : item
                      )
                    )
                  }
                />
              </View>
              <TouchableOpacity
                style={styles.remove}
                onPress={() => setOpenings((previous) => previous.filter((_, i) => i !== index))}
                accessibilityRole="button"
                accessibilityLabel={String(t('remove'))}
                activeOpacity={0.85}
              >
                <Text style={styles.removeText}>{t('remove')}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setOpenings((previous) => [...previous, defaultOpening()])}
            accessibilityRole="button"
            accessibilityLabel={String(t('addOpening'))}
            activeOpacity={0.85}
          >
            <Text style={styles.addText}>{t('addOpening')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.calculate, calculating && styles.calculateDisabled]}
          onPress={handleCalculate}
          disabled={calculating}
          accessibilityRole="button"
          accessibilityLabel={t('calculate')}
          accessibilityState={{ busy: calculating, disabled: calculating }}
          activeOpacity={0.85}
        >
          {calculating ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.calculateText}>{t('calculate')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reset}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel={t('reset')}
          activeOpacity={0.85}
        >
          <Text style={styles.resetText}>{t('reset')}</Text>
        </TouchableOpacity>
      </View>

      {calculating ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.status}>{t('calculating')}</Text>
        </View>
      ) : null}

      {runError ? (
        <View style={styles.errorBox} accessibilityLiveRegion="assertive">
          <Text style={styles.errorTitle}>{runError.title}</Text>
          {runError.detail ? <Text style={styles.errorDetail}>{runError.detail}</Text> : null}
          {runError.points?.map((point) => (
            <Text key={point} style={styles.errorDetail}>
              • {point}
            </Text>
          ))}
        </View>
      ) : null}

      {result ? <ResultView t={t} result={result} source={resultSource} /> : null}
    </ScrollView>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <View style={styles.smallField}>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
      />
    </View>
  );
}

function ResultView({
  t,
  result,
  source,
}: {
  t: ReturnType<typeof translator>;
  result: CalculatorRunResponse;
  source: 'server' | 'offline' | null;
}) {
  return (
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text style={styles.section}>{t('resultSection')}</Text>
      <Text style={styles.verified}>{t('verifiedMethod')}</Text>
      <Text style={source === 'offline' ? styles.offlineBadge : styles.serverBadge}>
        {source === 'offline' ? t('offlineResult') : t('serverVerified')}
      </Text>
      <Text style={styles.resultLabel}>{result.resultLabel}</Text>
      <Text style={styles.primary}>
        {result.primary.value} {result.primary.unit}
      </Text>
      {result.rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>
            {row.value} {row.unit}
          </Text>
        </View>
      ))}

      {result.warnings.length > 0 ? (
        <View>
          <Text style={styles.subSection}>{t('warningsSection')}</Text>
          {result.warnings.map((warning) => (
            <Text key={warning.code} style={styles.warning}>
              {warning.message}
            </Text>
          ))}
        </View>
      ) : null}

      {result.assumptions.length > 0 ? (
        <View>
          <Text style={styles.subSection}>{t('assumptionsSection')}</Text>
          {result.assumptions.map((assumption) => (
            <Text key={assumption.id} style={styles.assumption}>
              • {assumption.description}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.subSection}>{t('boqSection')}</Text>
      {result.boq.sections.every((section) => section.items.length === 0) ? (
        <Text style={styles.status}>{t('noBoq')}</Text>
      ) : (
        result.boq.sections.map((section) =>
          section.items.map((item) => (
            <View key={item.id} style={styles.boqCard}>
              <Text style={styles.boqName}>{item.description}</Text>
              <Text style={styles.boqLine}>
                {t('theoretical')}: {item.theoreticalQuantity} {item.unit}
              </Text>
              <Text style={styles.boqLine}>
                {t('procurement')} ({t('wastage')} {item.wastagePercentage}%): {item.procurementQuantity}{' '}
                {item.unit}
              </Text>
            </View>
          ))
        )
      )}
      {result.boq.hasMissingRates ? <Text style={styles.status}>{t('ratesNote')}</Text> : null}

      <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  calcName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  summary: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subSection: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 16,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  help: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  openings: {
    marginTop: spacing.md,
  },
  openingCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeChip: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  typeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextActive: {
    color: colors.accentText,
  },
  openingInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  smallField: {
    flex: 1,
  },
  smallLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  remove: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  removeText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  calculate: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculateDisabled: {
    opacity: 0.6,
  },
  calculateText: {
    color: colors.accentText,
    fontSize: 17,
    fontWeight: '700',
  },
  reset: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  status: {
    color: colors.textMuted,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  errorDetail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  result: {
    marginTop: spacing.lg,
  },
  verified: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  offlineBadge: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  serverBadge: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  primary: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  assumption: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  boqCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  boqName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  boqLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
  },
});
