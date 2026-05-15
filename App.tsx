import React, { memo, useCallback, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNativeCounter } from './src/useNativeCounter';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  border: '#2a2a4a',
  text: '#e8e8f0',
  muted: '#6b6b8a',
  increment: '#22c55e',
  decrement: '#ef4444',
  reset: '#6366f1',
  bonus: '#f59e0b',
  auto: '#f97316',
  white: '#ffffff',
};

// ─── CounterButton ────────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  subLabel?: string;
  color: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

const CounterButton = memo(
  ({ label, subLabel, color, onPress, onLongPress, disabled }: ButtonProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
      Animated.spring(scale, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }, [scale]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }).start();
    }, [scale]);

    return (
      <Animated.View style={[{ transform: [{ scale }] }, styles.buttonWrap]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={400}
          disabled={disabled}
          style={[styles.button, { borderColor: color }, disabled && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
          {subLabel ? (
            <Text style={[styles.buttonSub, { color }]}>{subLabel}</Text>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  },
);

// ─── HistoryBadge ─────────────────────────────────────────────────────────────
const HistoryBadge = memo(({ value, index }: { value: number; index: number }) => (
  <View style={[styles.badge, index === 0 && styles.badgeLatest]}>
    <Text style={[styles.badgeText, index === 0 && styles.badgeTextLatest]}>
      {value}
    </Text>
  </View>
));

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const {
    count,
    history,
    isAutoDecrementing,
    isResetting,
    incrementCalls,
    increment,
    longPressIncrement,
    decrement,
    reset,
  } = useNativeCounter();

  const nextBonusIn = 5 - (incrementCalls % 5);
  const isBonus = nextBonusIn === 5 && incrementCalls > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>CounterPro</Text>
        <View style={styles.nativeBadge}>
          <Text style={styles.nativeBadgeText}>C++ · TURBOMODULE</Text>
        </View>
      </View>

      {/* ── Counter display ────────────────────────────── */}
      <View style={styles.displayCard}>
        <Text style={styles.countLabel}>COUNT</Text>
        <Text
          style={[
            styles.countValue,
            isAutoDecrementing && styles.countValueAuto,
            isResetting && styles.countValueResetting,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {count}
        </Text>

        {/* Status row */}
        <View style={styles.statusRow}>
          {isAutoDecrementing && (
            <View style={[styles.statusPill, { borderColor: C.auto }]}>
              <Text style={[styles.statusText, { color: C.auto }]}>
                AUTO-DECREMENTING
              </Text>
            </View>
          )}
          {isResetting && (
            <View style={[styles.statusPill, { borderColor: C.reset }]}>
              <Text style={[styles.statusText, { color: C.reset }]}>
                RESETTING...
              </Text>
            </View>
          )}
          {!isAutoDecrementing && !isResetting && (
            <View style={[styles.statusPill, { borderColor: isBonus ? C.bonus : C.muted }]}>
              <Text style={[styles.statusText, { color: isBonus ? C.bonus : C.muted }]}>
                {isBonus
                  ? 'BONUS +5 READY'
                  : `NEXT BONUS IN ${nextBonusIn} PRESS${nextBonusIn === 1 ? '' : 'ES'}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Buttons ────────────────────────────────────── */}
      <View style={styles.buttonRow}>
        <CounterButton
          label="−"
          subLabel="DECREMENT"
          color={C.decrement}
          onPress={decrement}
          disabled={isResetting}
        />
        <CounterButton
          label="↺"
          subLabel="RESET"
          color={C.reset}
          onPress={reset}
          disabled={isResetting || count === 0}
        />
        <CounterButton
          label="+"
          subLabel="INCREMENT"
          color={C.increment}
          onPress={increment}
          onLongPress={longPressIncrement}
          disabled={isResetting}
        />
      </View>

      <Text style={styles.longPressHint}>Hold + for a fast +5</Text>

      {/* ── History ────────────────────────────────────── */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>RECENT HISTORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScroll}
          >
            {history.map((v, i) => (
              <HistoryBadge key={i} value={v} index={i} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Idle notice ────────────────────────────────── */}
      <Text style={styles.idleNotice}>
        No interaction for 3 s triggers auto-decrement
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    color: C.text,
  },
  nativeBadge: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.bonus,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  nativeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.bonus,
  },

  // Display card
  displayCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: C.muted,
    marginBottom: 8,
  },
  countValue: {
    fontSize: 96,
    fontWeight: '800',
    color: C.white,
    lineHeight: 112,
    minWidth: 160,
    textAlign: 'center',
  },
  countValueAuto: {
    color: C.auto,
  },
  countValueResetting: {
    color: C.reset,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  buttonWrap: {
    flex: 1,
  },
  button: {
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: C.card,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonLabel: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  buttonSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    opacity: 0.8,
  },
  longPressHint: {
    textAlign: 'center',
    fontSize: 12,
    color: C.muted,
    marginBottom: 28,
  },

  // History
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: C.muted,
    marginBottom: 10,
  },
  historyScroll: {
    gap: 8,
    paddingRight: 4,
  },
  badge: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeLatest: {
    borderColor: C.text,
    backgroundColor: '#2a2a4a',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  badgeTextLatest: {
    color: C.text,
  },

  // Footer
  idleNotice: {
    textAlign: 'center',
    fontSize: 11,
    color: C.muted,
    opacity: 0.6,
  },
});
