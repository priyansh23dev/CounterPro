import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Codegen spec for the CounterModule TurboModule.
 * The `Native` prefix is required for Codegen to recognise this file.
 *
 * Business logic lives in C++ (CounterCore). Kotlin wires JNI and timers.
 * JavaScript receives state via the CounterChanged / CounterStatusChanged events.
 */
export interface Spec extends TurboModule {
  // Core operations — all return the new count value.
  increment(): number;
  longPressIncrement(): number; // +5, does not advance the bonus counter
  decrement(): number;          // floored at 0 in C++
  reset(): void;                // gradual in Kotlin; bonus counter reset in C++

  getValue(): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CounterModule');
