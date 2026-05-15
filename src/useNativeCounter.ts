import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import CounterModule from './NativeCounterModule';
import { HISTORY_LIMIT } from './useCounter';

/**
 * Same public interface as useCounter so App.tsx can swap between
 * JS and native implementations without any UI changes.
 *
 * State flow:
 *   User press → call native method → C++ mutates count → Kotlin emits event
 *   via RCTDeviceEventEmitter → DeviceEventEmitter fires in JS
 *   → this hook updates React state → UI re-renders
 *
 * We use DeviceEventEmitter (not NativeEventEmitter) because Kotlin emits
 * through RCTDeviceEventEmitter, which maps directly to DeviceEventEmitter in JS.
 * NativeEventEmitter requires real addListener/removeListeners accounting which
 * causes "platform constants" warnings when the methods are no-ops.
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
    const counterSub = DeviceEventEmitter.addListener(
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

    const statusSub = DeviceEventEmitter.addListener(
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
