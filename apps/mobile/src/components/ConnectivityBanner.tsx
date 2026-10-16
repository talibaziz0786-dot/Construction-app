/**
 * Connectivity banner — lightweight online/offline/sync indicator.
 * Offline mode is a normal supported capability, not an error state.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { translator } from '../i18n/strings';
import type { SyncState } from '../offline/syncEngine';
import type { ConnectivityState } from '../offline/connectivity';

export function ConnectivityBanner({
  t, connectivity, syncState, pendingCount,
}: {
  t: ReturnType<typeof translator>;
  connectivity: ConnectivityState;
  syncState: SyncState;
  pendingCount: number;
}) {
  let label: string = String(t('online'));
  let dot: string = colors.success;
  if (connectivity === 'offline') {
    label = String(t('offline'));
    dot = colors.warning;
  } else if (connectivity === 'checking') {
    label = String(t('checking'));
    dot = colors.textMuted;
  }
  if (syncState === 'syncing') {
    label = `${label} · ${String(t('syncing'))}`;
    dot = colors.accent;
  } else if (pendingCount > 0 && connectivity === 'online') {
    label = `${label} · ${String(t('syncPending'))} (${pendingCount})`;
  } else if (syncState === 'failed') {
    label = `${label} · ${String(t('syncFailed'))}`;
    dot = colors.danger;
  }
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});
