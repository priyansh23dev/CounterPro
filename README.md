# CounterPro

A React Native counter app demonstrating non-trivial state management, timer-driven behaviour, and clean separation between logic and UI.

---

## Logic structure

All counter logic lives in **`src/useCounter.ts`** as a single custom hook. `App.tsx` is pure UI — it calls the hook and renders. No business logic lives in the component tree.

### State

| State | Type | Where |
|---|---|---|
| `count` | `number` | `useState` — drives the display |
| `history` | `number[]` | `useState` — last 10 distinct values |
| `isAutoDecrementing` | `boolean` | `useState` — UI status indicator |
| `isResetting` | `boolean` | `useState` — UI status indicator |
| `incrementCalls` | `number` | `useState` — counts calls to `increment()` for the bonus rule |

**Why `useState` and not a reducer?**
Each piece of state has a different update cadence. Keeping them separate lets React batch the updates that happen together (in user-triggered callbacks) while still allowing independent updates from timer callbacks. A reducer would have forced all state into one object and made the timer logic significantly more complex.

**Refs for timer callbacks**
`countRef` and `incrementCallsRef` mirror their corresponding state values so that `setInterval` / `setTimeout` callbacks always read the current value without depending on a stale closure. The pattern is: update the ref *and* call `setState` in the same synchronous pass.

---

## Non-trivial behaviours

### 1. Every 5th increment gives +5
`incrementCalls` tracks how many times the user has pressed Increment. When `incrementCalls % 5 === 0` the delta is 5 instead of 1. The UI shows a "NEXT BONUS IN N PRESSES" countdown and lights up "BONUS +5 READY" when the next press will trigger it.

### 2. Decrement floor at 0
`decrement()` returns early when `countRef.current <= 0`. The count never goes negative.

### 3. Auto-decrement after idle
After every user interaction, `scheduleAutoDecrement()` clears any pending idle timer and sets a new 3-second `setTimeout`. When it fires, a 1-second `setInterval` starts decrementing the counter until it reaches 0. Any new user interaction cancels both the idle timer and the decrement interval immediately.

### 4. Gradual reset
`reset()` starts a `setInterval` that fires every 80 ms. Each tick reduces the count by `max(1, ceil(count × 0.15))` — roughly 15 % of the remaining value. This produces a fast initial drop that slows as it approaches 0, giving a smooth visual decay rather than an instant jump. The interval clears itself (and `isResetting` becomes false) once count reaches 0.

---

## Optional features

### Long-press for +5
`Pressable` with `onLongPress` (400 ms delay) calls `longPressIncrement()`, which always adds 5. Long-press bypasses the 5th-increment bonus counter so rapid long-presses don't interfere with the bonus rhythm.

### Value history
The last 10 values are stored in `history[]`. Each user action that changes the count prepends the new value. History is shown as a horizontal scrollable list of badges below the buttons. Auto-decrement ticks intentionally do not append to history to avoid flooding the list.

---

## Edge-case handling

| Scenario | Behaviour |
|---|---|
| Rapid taps | `countRef` is updated synchronously so every tap reads the correct current value even before React re-renders |
| Reset during auto-decrement | `reset()` calls `stopAutoDecrement()` first — cancels both the idle timeout and decrement interval |
| Increment/decrement during gradual reset | Both call `stopReset()` first, clearing the reset interval immediately |
| Reset when count is already 0 | Returns early — no interval is started |
| Auto-decrement reaching 0 | The interval clears itself; `isAutoDecrementing` becomes false |
| Unmount with active timers | `useEffect` cleanup calls `stopAutoDecrement()` and `stopReset()` |

---

## Project layout

```
CounterPro/
├── src/
│   └── useCounter.ts   ← all counter logic (custom hook)
├── App.tsx             ← UI only, consumes the hook
├── index.js            ← React Native entry point
└── README.md
```

---

## Running the app

```bash
# Android
npm run android

# iOS (macOS only — install pods first)
cd ios && bundle exec pod install && cd ..
npm run ios
```

---

## TurboModule (C++ JSI) — coming on a separate branch

A second branch (`turbomodule-implementation`) will re-implement the counter logic as a C++ TurboModule exposed via JSI, moving all business logic to native code and keeping JavaScript responsible only for UI and user interaction. Data will flow from C++ to JS via an EventEmitter subscription so the UI updates automatically when native state changes.
