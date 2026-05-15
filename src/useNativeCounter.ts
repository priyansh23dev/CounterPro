import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter } from 'react-native';
import CounterModule from './NativeCounterModule';
import { HISTORY_LIMIT } from './useCounter';

// One shared emitter — safe to create at module scope.
const emitter = new NativeEventEmitter(CounterModule as any);

/**
 * Same public interface as useCounter so App.tsx can swap between
 * JS and native implementations without any UI changes.
 *
 * State flow:
 *   User press → call native method → C++ mutates count → Kotlin emits event
 *   → NativeEventEmitter fires → this hook updates React state → UI re-renders
 *
 * History and UI-status flags are managed here in JS;
 * core counter logic (bonus, floor, timers) is in native (C++ + Kotlin).
 */
export function useNativeCounter() {
  const [count, setCount] = useState<number>(() => CounterModule.getValue());
  const [incrementCalls, setIncrementCalls] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoDecrementing, setIsAutoDecrementing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Track whether the latest CounterChanged came from an auto-decrement tick
  // so we can skip adding it to history (mirrors JS implementation behaviour).
  const isAutoDecrementingRef = useRef(false);

  useEffect(() => {
    const counterSub = emitter.addListener(
      'CounterChanged',
      ({ value, incrementCalls: calls }: { value: number; incrementCalls: number }) => {
        setCount(value);
        setIncrementCalls(calls);

        // Don't flood history with auto-decrement ticks.
        if (!isAutoDecrementingRef.current) {
          setHistory(prev => [value, ...prev].slice(0, HISTORY_LIMIT));
        }
      },
    );

    const statusSub = emitter.addListener(
      'CounterStatusChanged',
      ({
        isAutoDecrementing: autoDecr,
        isResetting: resetting,
      }: {
        isAutoDecrementing: boolean;
        isResetting: boolean;
      }) => {
        isAutoDecrementingRef.current = autoDecr;
        setIsAutoDecrementing(autoDecr);
        setIsResetting(resetting);
      },
    );

    return () => {
      counterSub.remove();
      statusSub.remove();
    };
  }, []);

  const increment = useCallback(() => {
    CounterModule.increment();
  }, []);

  const longPressIncrement = useCallback(() => {
    CounterModule.longPressIncrement();
  }, []);

  const decrement = useCallback(() => {
    CounterModule.decrement();
  }, []);

  const reset = useCallback(() => {
    CounterModule.reset();
  }, []);

  return {
    count,
    incrementCalls,
    history,
    isAutoDecrementing,
    isResetting,
    increment,
    longPressIncrement,
    decrement,
    reset,
  };
}
