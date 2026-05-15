import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_DELAY_MS = 3000;          // idle before auto-decrement starts
const AUTO_DECREMENT_INTERVAL_MS = 1000; // auto-decrement tick rate
const RESET_STEP_MS = 80;            // gradual reset tick rate
export const HISTORY_LIMIT = 10;

export interface CounterState {
  count: number;
  history: number[];
  isAutoDecrementing: boolean;
  isResetting: boolean;
  incrementCalls: number; // used to compute "next bonus in X"
}

export interface CounterActions {
  increment: () => void;
  longPressIncrement: () => void;
  decrement: () => void;
  reset: () => void;
}

export function useCounter(): CounterState & CounterActions {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoDecrementing, setIsAutoDecrementing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [incrementCalls, setIncrementCalls] = useState(0);

  // Refs mirror mutable values so timer callbacks always read the latest value
  // without depending on stale closures.
  const countRef = useRef(0);
  const incrementCallsRef = useRef(0);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDecrementRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- helpers ---

  const updateCount = useCallback((value: number) => {
    countRef.current = value;
    setCount(value);
  }, []);

  const pushHistory = useCallback((value: number) => {
    setHistory(prev => [value, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const stopAutoDecrement = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (autoDecrementRef.current) {
      clearInterval(autoDecrementRef.current);
      autoDecrementRef.current = null;
      setIsAutoDecrementing(false);
    }
  }, []);

  const stopReset = useCallback(() => {
    if (resetIntervalRef.current) {
      clearInterval(resetIntervalRef.current);
      resetIntervalRef.current = null;
      setIsResetting(false);
    }
  }, []);

  // After any user interaction, schedule auto-decrement to kick in after idle.
  const scheduleAutoDecrement = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setIsAutoDecrementing(true);
      autoDecrementRef.current = setInterval(() => {
        if (countRef.current <= 0) {
          clearInterval(autoDecrementRef.current!);
          autoDecrementRef.current = null;
          setIsAutoDecrementing(false);
          return;
        }
        const next = countRef.current - 1;
        countRef.current = next;
        setCount(next);
      }, AUTO_DECREMENT_INTERVAL_MS);
    }, IDLE_DELAY_MS);
  }, []);

  // --- actions ---

  // Every 5th call gives +5 instead of +1.
  const increment = useCallback(() => {
    stopAutoDecrement();
    stopReset();
    const newCalls = incrementCallsRef.current + 1;
    incrementCallsRef.current = newCalls;
    setIncrementCalls(newCalls);
    const delta = newCalls % 5 === 0 ? 5 : 1;
    const next = countRef.current + delta;
    updateCount(next);
    pushHistory(next);
    scheduleAutoDecrement();
  }, [stopAutoDecrement, stopReset, updateCount, pushHistory, scheduleAutoDecrement]);

  // Long-press: always +5, does not count toward the 5th-increment bonus.
  const longPressIncrement = useCallback(() => {
    stopAutoDecrement();
    stopReset();
    const next = countRef.current + 5;
    updateCount(next);
    pushHistory(next);
    scheduleAutoDecrement();
  }, [stopAutoDecrement, stopReset, updateCount, pushHistory, scheduleAutoDecrement]);

  // Hard floor at 0.
  const decrement = useCallback(() => {
    stopAutoDecrement();
    stopReset();
    if (countRef.current <= 0) return;
    const next = countRef.current - 1;
    updateCount(next);
    pushHistory(next);
    scheduleAutoDecrement();
  }, [stopAutoDecrement, stopReset, updateCount, pushHistory, scheduleAutoDecrement]);

  // Gradually steps toward 0 (exponential-ish decay) instead of instant jump.
  const reset = useCallback(() => {
    stopAutoDecrement();
    stopReset();
    if (countRef.current === 0) return;
    incrementCallsRef.current = 0;
    setIncrementCalls(0);
    setIsResetting(true);

    resetIntervalRef.current = setInterval(() => {
      if (countRef.current <= 0) {
        clearInterval(resetIntervalRef.current!);
        resetIntervalRef.current = null;
        countRef.current = 0;
        setCount(0);
        setIsResetting(false);
        pushHistory(0);
        return;
      }
      // Decrease by ~15 % each tick so it slows as it approaches 0.
      const step = Math.max(1, Math.ceil(countRef.current * 0.15));
      const next = Math.max(0, countRef.current - step);
      countRef.current = next;
      setCount(next);
    }, RESET_STEP_MS);
  }, [stopAutoDecrement, stopReset, pushHistory]);

  // Cleanup all timers on unmount.
  useEffect(() => {
    return () => {
      stopAutoDecrement();
      stopReset();
    };
  }, [stopAutoDecrement, stopReset]);

  return {
    count,
    history,
    isAutoDecrementing,
    isResetting,
    incrementCalls,
    increment,
    longPressIncrement,
    decrement,
    reset,
  };
}
