/**
 * Mobile home screen — answers "What can I calculate?" and routes the user
 * into the calculator hub. No calculation logic here.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, MIN_TOUCH_TARGET, spacing } from '../theme';
import type { translator } from '../i18n/strings';

interface HomeScreenProps {
  t: ReturnType<typeof translator>;
  onStart: () => void;
  onHistory: () => void;
  historyCount: number;
}

export function HomeScreen({ t, onStart, onHistory, historyCount }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.tagline}>{t('tagline')}</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={t('start')}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>{t('start')}</Text>
      </TouchableOpacity>
      <Text style={styles.guest}>{t('guestNote')}</Text>
      <TouchableOpacity
        style={styles.secondary}
        onPress={onHistory}
        accessibilityRole="button"
        accessibilityLabel={`${String(t('history'))} (${historyCount})`}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryText}>
          {t('history')} ({historyCount})
        </Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  ctaText: {
    color: colors.accentText,
    fontSize: 17,
    fontWeight: '700',
  },
  guest: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
