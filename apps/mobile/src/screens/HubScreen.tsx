/**
 * Calculator hub screen — loads the server-driven calculator catalog and
 * renders it as a searchable list grouped by category.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchCalculatorHub } from '../api/calculatorApi';
import { bundledHub } from '../offline/hubCache';
import { FINISHING_HUB, loadCachedHub, saveHubCache } from '../offline/hubCacheFinishing';
import { colors, MIN_TOUCH_TARGET, spacing } from '../theme';
import type { translator } from '../i18n/strings';
import type { CalculatorHubCategory, CalculatorHubEntry } from '../types/calculator';

interface HubScreenProps {
  t: ReturnType<typeof translator>;
  onPick: (entry: CalculatorHubEntry) => void;
}

function mergedBundledHub(): CalculatorHubCategory[] {
  const base = bundledHub();
  return base.map((c) => (c.id === 'finishing' ? FINISHING_HUB : c));
}

export function HubScreen({ t, onPick, initial }: HubScreenProps & { initial?: CalculatorHubCategory[] | null }) {
  const [categories, setCategories] = useState<CalculatorHubCategory[] | null>(initial ?? null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(initial ? false : true);
  const [usingCache, setUsingCache] = useState(initial ? true : false);

  const load = useCallback(async () => {
    setReloading(true);
    setError(null);
    try {
      const hub = await fetchCalculatorHub();
      setCategories(hub);
      setUsingCache(false);
      await saveHubCache(hub);
    } catch (loadError) {
      const cached = await loadCachedHub(mergedBundledHub());
      setCategories(cached);
      setUsingCache(true);
      if (!cached || cached.length === 0) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    } finally {
      setReloading(false);
    }
  }, []);

  // Sync late-arriving cached hub (App loads it async) and refresh in
  // the background so cached entries upgrade to the live catalog.
  useEffect(() => {
    if (initial && !categories) {
      setCategories(initial);
      setUsingCache(true);
      setReloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!categories) return [];
    const needle = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        calculators: category.calculators.filter(
          (entry) =>
            needle === '' ||
            entry.name.toLowerCase().includes(needle) ||
            entry.summary.toLowerCase().includes(needle)
        ),
      }))
      .filter((category) => category.calculators.length > 0);
  }, [categories, query]);

  const resultCount = useMemo(
    () => filtered.reduce((total, category) => total + category.calculators.length, 0),
    [filtered]
  );

  if (error && !categories) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('errorServer')}</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity
          style={styles.retry}
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel={t('retry')}
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!categories || reloading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.status}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {usingCache ? <Text style={styles.cacheNote}>{t('cachedCatalog')}</Text> : null}
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityRole="search"
        accessibilityLabel={t('searchPlaceholder')}
        returnKeyType="search"
      />
      <Text style={styles.count} accessibilityLiveRegion="polite">
        {t('resultsCount')(resultCount)}
      </Text>
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.status}>{t('noResults')}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('clearSearch')}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>{t('clearSearch')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filtered.map((category) => (
          <View key={category.id} style={styles.category}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {category.summary ? <Text style={styles.categorySummary}>{category.summary}</Text> : null}
            {category.calculators.map((entry) => (
              <TouchableOpacity
                key={entry.calculatorId}
                style={[styles.card, entry.status !== 'available' && styles.cardDisabled]}
                onPress={() => entry.status === 'available' && onPick(entry)}
                disabled={entry.status !== 'available'}
                accessibilityRole="button"
                accessibilityLabel={entry.name}
                accessibilityState={{ disabled: entry.status !== 'available' }}
                activeOpacity={0.85}
              >
                <Text style={styles.cardTitle}>{entry.name}</Text>
                {entry.summary ? <Text style={styles.cardSummary}>{entry.summary}</Text> : null}
                {entry.status !== 'available' ? (
                  <Text style={styles.soonBadge}>{t('comingSoon')}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}

    </ScrollView>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  search: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 16,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  cacheNote: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  category: {
    marginBottom: spacing.lg,
  },
  categoryName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  categorySummary: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSummary: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  soonBadge: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  status: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorDetail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  retryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
