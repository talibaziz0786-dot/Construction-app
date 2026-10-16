/**
 * Mobile history screen — locally saved calculations with sync state.
 * Synced / pending-sync / offline labels; re-verifies against the server
 * when online (server stays authoritative).
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { translator } from '../i18n/strings';
import type { HistoryEntry } from '../offline/history';

export function HistoryScreen({ t, history }: { t: ReturnType<typeof translator>; history: HistoryEntry[] }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('history')}</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>{t('historyEmpty')}</Text>
      ) : (
        history.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.name}>{entry.name}</Text>
            <Text style={styles.primary}>
              {entry.result.primary.value} {entry.result.primary.unit}
            </Text>
            <Text style={styles.meta}>
              {entry.verified ? t('synced') : entry.source === 'offline' ? t('pendingSync') : t('synced')} ·{' '}
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  empty: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, padding: spacing.md, marginTop: spacing.sm,
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  primary: { color: colors.accent, fontSize: 17, fontWeight: '700', marginTop: 4 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
