import React, { useMemo, useState } from 'react';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import type { CalculatorInputField, OpeningInputValue } from '../../types/calculator-types.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage as useLanguage2 } from '../../contexts/LanguageContext.js';
import { fromMeters, fromSqMeters, roundTo, toMeters, toSqMeters } from '../../utils/unitConversion.js';

interface CalculatorInputFormProps {
  calculatorName: string;
  fields: CalculatorInputField[];
  isBusy: boolean;
  onSubmit: (canonicalValues: Record<string, unknown>) => void;
}

const OPENING_TYPES: OpeningInputValue['type'][] = ['door', 'window', 'ventilator', 'other'];

function defaultOpening(): OpeningInputValue {
  return { type: 'door', width: 0.9, height: 2.1, quantity: 1 };
}

function isMetricUnit(unit: string): boolean {
  return unit === 'm' || unit === 'cm' || unit === 'mm';
}

function isThicknessField(name: string, label: string): boolean {
  const s = `${name} ${label}`.toLowerCase();
  return s.includes('thickness') || s.includes('joint') || s.includes('plaster') || s.includes('slab');
}

function friendlyFieldMeta(field: CalculatorInputField): { hi: string; en: string; example: string } {
  const s = `${field.name} ${field.label}`.toLowerCase();
  if (s.includes('wall') && s.includes('length')) return { hi: 'दीवार की लंबाई', en: 'Wall Length', example: '10 ft' };
  if (s.includes('wall') && s.includes('height')) return { hi: 'दीवार की ऊंचाई', en: 'Wall Height', example: '10 ft' };
  if (s.includes('wall') && s.includes('thickness')) return { hi: 'दीवार कितनी मोटी है?', en: 'Wall Thickness', example: '9 in' };
  if (s.includes('plaster')) return { hi: 'प्लास्टर की मोटाई', en: 'Plaster Thickness', example: '0.5 in' };
  if (s.includes('slab') || s.includes('roof')) return { hi: 'छत की मोटाई', en: 'Slab Thickness', example: '5 in' };
  if (field.isLength) return { hi: field.label, en: field.label, example: '10 ft' };
  return { hi: field.label, en: field.label, example: '' };
}

/**
 * Server-driven calculator form.
 *
 * The field list, ranges and defaults come from the calculator catalog API, so
 * adding a verified calculator never requires client-side input knowledge.
 * Values are entered in the user's measurement system and converted to canonical
 * SI units before being sent to the server.
 */
export const CalculatorInputForm: React.FC<CalculatorInputFormProps> = ({
  calculatorName,
  fields,
  isBusy,
  onSubmit,
}) => {
  const { lengthUnit, areaUnit, setLengthUnit } = useUnit();
  const { t } = useLanguage2();
  const numericFields = useMemo(() => fields.filter((field) => field.kind !== 'openings'), [fields]);
  const openingsField = useMemo(() => fields.find((field) => field.kind === 'openings'), [fields]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [openings, setOpenings] = useState<OpeningInputValue[]>([]);

  const primaryFields = numericFields.slice(0, 4);
  const advancedFields = numericFields.slice(4);

  const stepHintId = `calc-step-hint-${calculatorName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  const toDisplay = (field: CalculatorInputField, canonical: number): string => {
    if (field.isLength) {
      return String(roundTo(fromMeters(canonical, lengthUnit), 4));
    }
    if (field.unit === 'sq.m') {
      return String(roundTo(fromSqMeters(canonical, areaUnit), 4));
    }
    return String(canonical);
  };

  const [ftInValues, setFtInValues] = useState<Record<string, { ft: string; inch: string }>>(() => {
    const initial: Record<string, { ft: string; inch: string }> = {};
    for (const field of numericFields) {
      if (!field.isLength || isThicknessField(field.name, field.label)) continue;
      const totalFt = fromMeters(field.defaultValue, 'ft');
      const ft = Math.floor(totalFt);
      const inch = roundTo((totalFt - ft) * 12, 1);
      initial[field.name] = { ft: String(ft), inch: String(inch) };
    }
    return initial;
  });
  const [inchValues, setInchValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of numericFields) {
      if (!field.isLength || !isThicknessField(field.name, field.label)) continue;
      initial[field.name] = String(roundTo(fromMeters(field.defaultValue, 'in'), 2));
    }
    return initial;
  });

  const [displayValues, setDisplayValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of numericFields) {
      if (f.isLength) continue;
      if (f.unit === 'sq.m') init[f.name] = String(roundTo(fromSqMeters(f.defaultValue, areaUnit), 4));
      else init[f.name] = String(f.defaultValue);
    }
    return init;
  });

  const unitLabelFor = (field: CalculatorInputField): string => {
    if (field.kind === 'percentage') return '%';
    if (field.unit === 'sq.m') return isMetricUnit(lengthUnit) ? 'sq.m' : 'sq ft';
    return field.unit ?? '';
  };

  const handleLengthUnitChange = (nextUnit: typeof lengthUnit) => {
    const nextAreaUnit = isMetricUnit(nextUnit) ? 'sq.m' : 'sq.ft';
    const converted: Record<string, string> = {};
    for (const field of numericFields) {
      if (field.isLength) continue;
      const parsed = Number.parseFloat(displayValues[field.name] ?? '');
      if (!Number.isFinite(parsed)) { converted[field.name] = displayValues[field.name] ?? ''; continue; }
      if (field.unit === 'sq.m') converted[field.name] = String(roundTo(fromSqMeters(toSqMeters(parsed, areaUnit), nextAreaUnit), 4));
      else converted[field.name] = String(parsed);
    }
    setDisplayValues(converted);
    setLengthUnit(nextUnit);
  };

  const updateOpening = (index: number, patch: Partial<OpeningInputValue>) => {
    setOpenings((previous) =>
      previous.map((opening, position) => (position === index ? { ...opening, ...patch } : opening))
    );
  };

  const canonicalLengthOf = (field: CalculatorInputField): number => {
    if (isThicknessField(field.name, field.label)) {
      const inches = Number.parseFloat(inchValues[field.name] ?? '');
      if (!Number.isFinite(inches)) return NaN;
      return inches * 0.0254;
    }
    const pair = ftInValues[field.name] ?? { ft: '', inch: '' };
    const ft = Number.parseFloat(pair.ft || '0');
    const inch = Number.parseFloat(pair.inch || '0');
    if (pair.ft === '' && pair.inch === '') return NaN;
    if (!Number.isFinite(ft) || !Number.isFinite(inch)) return NaN;
    return (Math.max(0, ft) * 12 + Math.max(0, inch)) * 0.0254;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const canonical: Record<string, unknown> = {};
    const nextErrors: Record<string, string> = {};

    for (const field of numericFields) {
      let canonicalValue: number;
      if (field.isLength) {
        canonicalValue = canonicalLengthOf(field);
        if (!Number.isFinite(canonicalValue)) { nextErrors[field.name] = t('formEnterNumber'); continue; }
      } else {
        const parsed = Number.parseFloat(displayValues[field.name] ?? '');
        if (!Number.isFinite(parsed)) { nextErrors[field.name] = t('formEnterNumber'); continue; }
        canonicalValue = field.unit === 'sq.m' ? toSqMeters(parsed, areaUnit) : parsed;
      }

      if (canonicalValue < field.min || canonicalValue > field.max) {
        nextErrors[field.name] = t('formOutOfRange');
        continue;
      }

      canonical[field.name] = canonicalValue;
    }

    if (openingsField) {
      canonical[openingsField.name] = openings.map((opening) => ({
        type: opening.type,
        width: opening.width,
        height: opening.height,
        quantity: Math.max(1, Math.round(opening.quantity)),
      }));
    }

    setErrors(nextErrors);
    setFieldTouched(Object.fromEntries(Object.keys(nextErrors).map((name) => [name, true])));

    if (Object.keys(nextErrors).length === 0) {
      onSubmit(canonical);
    }
  };

  const THICKNESS_PRESETS = [0.5, 1, 2, 4, 5, 6, 9, 13.5];

  const renderLengthField = (field: CalculatorInputField) => {
    const meta = friendlyFieldMeta(field);
    const err = errors[field.name];
    const showErr = Boolean(err) && fieldTouched[field.name] !== false;
    if (isThicknessField(field.name, field.label)) {
      const cur = inchValues[field.name] ?? '';
      const curNum = Number.parseFloat(cur);
      return (
        <div key={field.name}>
          <span className="block text-base font-semibold" id={`lbl-${field.name}`}>{meta.hi}</span>
          <span className="block text-xs opacity-70">{meta.en}</span>
          <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-labelledby={`lbl-${field.name}`}>
            {THICKNESS_PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={Math.abs(curNum - p) < 0.001} onClick={() => { setInchValues((pr) => ({ ...pr, [field.name]: String(p) })); setFieldTouched((pr) => ({ ...pr, [field.name]: true })); }}
                className={`min-h-[44px] min-w-[52px] rounded-lg border px-3 py-2 text-sm font-semibold ${Math.abs(curNum - p) < 0.001 ? 'bg-amber-500 text-slate-950 border-amber-500' : ''}`}>{p}&quot;</button>
            ))}
          </div>
          <div className="relative mt-2">
            <input id={`field-${field.name}`} type="number" inputMode="decimal" min={0} step="any" value={cur}
              onChange={(e) => { setInchValues((pr) => ({ ...pr, [field.name]: e.target.value })); setFieldTouched((pr) => ({ ...pr, [field.name]: true })); }}
              onBlur={() => setFieldTouched((pr) => ({ ...pr, [field.name]: true }))}
              aria-invalid={Boolean(err)} aria-label={meta.en} aria-describedby={showErr ? `err-${field.name}` : undefined}
              className="w-full rounded-xl border px-3.5 py-3 pr-12 text-base min-h-[48px]" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-60">in</span>
          </div>
          <p className="mt-1 text-xs opacity-60">{t('formExample')}: {meta.example}</p>
          {showErr && <p id={`err-${field.name}`} className="mt-1 text-xs text-rose-500" role="alert">{err}</p>}
        </div>
      );
    }
    const pair = ftInValues[field.name] ?? { ft: '', inch: '' };
    return (
      <div key={field.name}>
        <span className="block text-base font-semibold" id={`lbl-${field.name}`}>{meta.hi}</span>
        <span className="block text-xs opacity-70">{meta.en}</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div className="relative">
            <input id={`field-${field.name}-ft`} type="number" inputMode="decimal" min={0} step="any" value={pair.ft}
              onChange={(e) => { setFtInValues((pr) => ({ ...pr, [field.name]: { ft: e.target.value, inch: pr[field.name]?.inch ?? '' } })); setFieldTouched((pr) => ({ ...pr, [field.name]: true })); }}
              onBlur={() => setFieldTouched((pr) => ({ ...pr, [field.name]: true }))}
              aria-label={`${meta.en} feet`} aria-invalid={Boolean(err)} aria-describedby={showErr ? `err-${field.name}` : undefined} className="w-full rounded-xl border px-3.5 py-3 pr-12 text-base min-h-[48px]" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-60">ft</span>
          </div>
          <div className="relative">
            <input id={`field-${field.name}-in`} type="number" inputMode="decimal" min={0} max={11.99} step="any" value={pair.inch}
              onChange={(e) => { setFtInValues((pr) => ({ ...pr, [field.name]: { ft: pr[field.name]?.ft ?? '', inch: e.target.value } })); setFieldTouched((pr) => ({ ...pr, [field.name]: true })); }}
              onBlur={() => setFieldTouched((pr) => ({ ...pr, [field.name]: true }))}
              aria-label={`${meta.en} inches`} aria-invalid={Boolean(err)} aria-describedby={showErr ? `err-${field.name}` : undefined} className="w-full rounded-xl border px-3.5 py-3 pr-12 text-base min-h-[48px]" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-60">in</span>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-60">{t('formExample')}: {meta.example}</p>
        {showErr && <p id={`err-${field.name}`} className="mt-1 text-xs text-rose-500" role="alert">{err}</p>}
      </div>
    );
  };

  const renderPlainField = (field: CalculatorInputField) => (
    <div key={field.name}>
      <label htmlFor={`field-${field.name}`} className="block text-base font-semibold mb-1.5">{field.label}</label>
      <div className="relative">
        <input id={`field-${field.name}`} type="number" inputMode="decimal" value={displayValues[field.name] ?? ''} min={0} step={field.step}
          onChange={(e) => setDisplayValues((pr) => ({ ...pr, [field.name]: e.target.value }))}
          aria-invalid={Boolean(errors[field.name])}
          aria-describedby={errors[field.name] ? `err-${field.name}` : undefined}
          className="w-full rounded-xl border px-3.5 py-3 pr-16 text-base min-h-[48px]" />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-60">{unitLabelFor(field)}</span>
      </div>
      {field.help && !errors[field.name] && <p className="mt-1 text-xs opacity-60">{field.help}</p>}
      {field.name === 'wastagePercentage' && <p className="mt-1 text-xs opacity-60">{t('explainWastageBody')}</p>}
      {errors[field.name] && fieldTouched[field.name] && (
        <p id={`err-${field.name}`} className="mt-1 text-xs text-rose-500" role="alert">{errors[field.name]}</p>
      )}
    </div>
  );

  const renderNumericField = (field: CalculatorInputField) =>
    field.isLength ? renderLengthField(field) : renderPlainField(field);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">{calculatorName}</h2>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {([
            { value: 'm', label: 'Metric (m)' },
            { value: 'ft', label: 'Imperial (ft)' },
          ] as const).map((option) => {
            const active = isMetricUnit(lengthUnit) === (option.value === 'm');
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleLengthUnitChange(option.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  active ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {primaryFields.map(renderNumericField)}
      </div>

      {advancedFields.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowAdvanced((previous) => !previous)}
            aria-expanded={showAdvanced}
            aria-controls={stepHintId}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 transition min-h-[48px]"
          >
            <span>{t('formAdvanced')}</span>
            <ChevronDown className={`w-4 h-4 transition ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          <p id={stepHintId} className="px-4 pb-1 text-xs opacity-60">{t('formStepHint')}</p>
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 p-4">
              {advancedFields.map(renderNumericField)}
            </div>
          )}
        </div>
      )}

      {openingsField && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{openingsField.label}</h3>
              <p className="text-xs text-slate-500">{openingsField.help}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenings((previous) => [...previous, defaultOpening()])}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-400 transition min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('formAddOpening')}
            </button>
          </div>

          {openings.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              {t('formNoOpenings')}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {openings.map((opening, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] sm:items-end"
                >
                  <label className="sr-only" htmlFor={`opening-type-${index}`}>
                    Opening type
                  </label>
                  <select
                    id={`opening-type-${index}`}
                    value={opening.type}
                    onChange={(event) =>
                      updateOpening(index, { type: event.target.value as OpeningInputValue['type'] })
                    }
                    className="bg-slate-900/70 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {OPENING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Opening width"
                    type="number"
                    inputMode="decimal"
                    value={opening.width}
                    onChange={(event) =>
                      updateOpening(index, { width: Number.parseFloat(event.target.value) || 0 })
                    }
                    className="bg-slate-900/70 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <input
                    aria-label="Opening height"
                    type="number"
                    inputMode="decimal"
                    value={opening.height}
                    onChange={(event) =>
                      updateOpening(index, { height: Number.parseFloat(event.target.value) || 0 })
                    }
                    className="bg-slate-900/70 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <input
                    aria-label="Opening quantity"
                    type="number"
                    inputMode="numeric"
                    value={opening.quantity}
                    onChange={(event) =>
                      updateOpening(index, {
                        quantity: Number.parseFloat(event.target.value) || 1,
                      })
                    }
                    className="bg-slate-900/70 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setOpenings((previous) =>
                        previous.filter((_, position) => position !== index)
                      )
                    }
                    aria-label="Remove opening"
                    className="justify-self-end rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-500/40 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Width and height in {lengthUnit}. Use the quantity column for identical openings.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isBusy ? t('formCalculating') : t('formCalculate')}
          </button>
          <button
            type="button"
            onClick={() => {
              const cleared: Record<string, string> = {};
              for (const field of numericFields) cleared[field.name] = '';
              setDisplayValues(cleared);
              setFtInValues({});
              setInchValues({});
              setOpenings([]);
              setErrors({});
              setFieldTouched({});
            }}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 disabled:opacity-60 min-h-[48px]"
          >
            {t('formClear')}
          </button>
          <button
            type="button"
            onClick={() => {
              const filled: Record<string, string> = {};
              for (const field of numericFields) filled[field.name] = toDisplay(field, field.defaultValue);
              setDisplayValues(filled);
              setErrors({});
              setFieldTouched({});
            }}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-60 min-h-[48px]"
          >
            {t('formFillExample')}
          </button>
        </div>
        <p className="text-xs opacity-70">{t('explainRateBody')} {t('explainCostBody')}</p>
      </div>
    </form>
  );
};


