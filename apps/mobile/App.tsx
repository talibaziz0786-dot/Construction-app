/**
 * Cunstruction mobile root — offline-first (imports part; body follows).
 * Online: Hub from GET /api/calculators -> server result.
 * Offline: cached catalog -> verified local mirror -> history + sync queue.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, MIN_TOUCH_TARGET, spacing } from './src/theme';
import { translator, type Language } from './src/i18n/strings';
import type { CalculatorHubCategory, CalculatorHubEntry } from './src/types/calculator';
import { HomeScreen } from './src/screens/HomeScreen';
import { HubScreen } from './src/screens/HubScreen';
import { CalculatorScreen } from './src/screens/CalculatorScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ConnectivityBanner } from './src/components/ConnectivityBanner';
import { useConnectivity } from './src/offline/connectivity';
import { loadHistory, loadSyncQueue, type HistoryEntry } from './src/offline/history';
import { syncPending, type SyncState } from './src/offline/syncEngine';
import { bundledHub } from './src/offline/hubCache';
import { FINISHING_HUB, loadCachedHub } from './src/offline/hubCacheFinishing';
import { StorageKeys, storageGet, storageSet } from './src/offline/storage';

type Screen =
  | { name: 'home' }
  | { name: 'hub' }
  | { name: 'calculator'; entry: CalculatorHubEntry }
  | { name: 'history' };

export default function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [language, setLanguage] = useState<Language>('en');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [cachedHub, setCachedHub] = useState<CalculatorHubCategory[] | null>(null);
  const t = translator(language);
  const current = stack[stack.length - 1];
  const { connectivity, isOnline } = useConnectivity();

  const refreshLocal = useCallback(async () => {
    setHistory(await loadHistory());
    setPendingCount((await loadSyncQueue()).length);
  }, []);

  useEffect(() => {
    void (async () => {
      const savedLang = await storageGet<Language | null>(StorageKeys.language, null);
      if (savedLang === 'en' || savedLang === 'hi') setLanguage(savedLang);
      const base = bundledHub().map((c) => (c.id === 'finishing' ? FINISHING_HUB : c));
      setCachedHub(await loadCachedHub(base));
      await refreshLocal();
    })();
  }, [refreshLocal]);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    void (async () => {
      const queue = await loadSyncQueue();
      if (queue.length === 0) {
        setPendingCount(0);
        return;
      }
      setSyncState('syncing');
      const hist = await loadHistory();
      const link: Record<string, string> = {};
      for (const q of queue) {
        const match = hist.find(
          (h) => !h.verified && h.calculatorId === q.calculatorId &&
            JSON.stringify(h.values) === JSON.stringify(q.values) &&
            !Object.values(link).includes(h.id),
        );
        if (match) link[q.id] = match.id;
      }
      const { failed } = await syncPending(link);
      if (cancelled) return;
      await refreshLocal();
      setSyncState(failed > 0 ? 'failed' : 'pending');
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, refreshLocal]);

  function push(screen: Screen) {
    setStack((previous) => [...previous, screen]);
  }

  function pop() {
    setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous));
  }

  function toggleLanguage() {
    setLanguage((previous) => {
      const next = previous === 'en' ? 'hi' : 'en';
      void storageSet(StorageKeys.language, next);
      return next;
    });
  }

  const headerTitle =
    current.name === 'home'
      ? t('appName')
      : current.name === 'hub'
        ? t('calculators')
        : current.name === 'history'
          ? t('history')
          : current.entry.name;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        {stack.length > 1 ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={pop}
            accessibilityRole="button"
            accessibilityLabel={String(t('back'))}
            activeOpacity={0.8}
          >
            <Text style={styles.headerButtonText}>‹ {t('back')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={toggleLanguage}
          accessibilityRole="button"
          accessibilityLabel={`${t('language')}: ${language === 'en' ? 'हिंदी' : 'English'}`}
          activeOpacity={0.8}
        >
          <Text style={styles.headerButtonText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
        </TouchableOpacity>
      </View>
      <ConnectivityBanner t={t} connectivity={connectivity} syncState={syncState} pendingCount={pendingCount} />
      {current.name === 'home' ? (
        <HomeScreen
          t={t}
          onStart={() => push({ name: 'hub' })}
          onHistory={() => push({ name: 'history' })}
          historyCount={history.length}
        />
      ) : current.name === 'hub' ? (
        <HubScreen t={t} onPick={(entry) => push({ name: 'calculator', entry })} initial={cachedHub} />
      ) : current.name === 'history' ? (
        <HistoryScreen t={t} history={history} />
      ) : (
        <CalculatorScreen
          key={current.entry.calculatorId}
          t={t}
          entry={current.entry}
          onCalculated={() => void refreshLocal()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    minWidth: 72,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});

