# CounterPro — React Native Counter App

A React Native counter app built as part of a mobile engineering assignment. This branch (`js-implementation`) contains the pure JavaScript/TypeScript implementation. The TurboModule (C++ native) implementation is on the `turbomodule-implementation` branch.

## Demo Video

[Watch Demo](https://drive.google.com/file/d/1zN5o8FvdTEAtnDg9Vk65NOjamoi6UXNz/view?usp=sharing)

---

## How the logic is structured

All counter logic lives in a single custom hook: [`src/useCounter.ts`](src/useCounter.ts). The component (`App.tsx`) only handles rendering — it calls the hook and maps state to UI. There is no business logic in the component tree.

This separation means the logic can be tested or swapped independently of the UI. The TurboModule branch keeps the exact same `App.tsx` interface; only the hook changes.

---

## Where the state is stored and why

State is split across multiple `useState` calls rather than a single reducer:

| State | Why it's separate |
|---|---|
| `count` | Core value — updated on every interaction and every timer tick |
| `incrementCalls` | Only updates on `increment()` calls, not on auto-decrement ticks |
| `history` | Append-only log; decoupled from count so flooding is easy to prevent |
| `isAutoDecrementing` | UI-only flag with its own lifecycle |
| `isResetting` | UI-only flag with its own lifecycle |

Each piece has a different update cadence. Keeping them separate lets React batch what belongs together (multiple updates from a single button press) while still updating independently from timer callbacks.

**Why refs alongside state?**  
`countRef` and `incrementCallsRef` mirror their `useState` twins. `setInterval` / `setTimeout` callbacks capture variables at creation time, so they'd read a stale count without refs. The pattern I settled on: update the ref and call `setState` in the same synchronous step — the ref keeps the timer callback correct, the state triggers the re-render.

---

## Non-trivial behaviours

### 1. Every 5th increment → +5
`incrementCalls` tracks button presses. When `incrementCalls % 5 === 0` the delta becomes 5 instead of 1. The UI counts down ("NEXT BONUS IN 3 PRESSES") and shows "BONUS +5 READY" when the next press will trigger it.

### 2. Decrement floor at 0
`decrement()` exits early when `countRef.current <= 0`. The value never goes negative — the C check happens before any state update.

### 3. Auto-decrement after 3 s idle
After every user interaction, `scheduleAutoDecrement()` cancels any pending idle timer and sets a fresh 3-second `setTimeout`. When it fires, a 1-second `setInterval` starts decrementing until count hits 0. Any user interaction (tap, long-press, reset) cancels both the idle timer and the decrement interval immediately.

### 4. Gradual reset
`reset()` starts an `setInterval` at 80 ms. Each tick subtracts `max(1, ceil(count × 0.15))` — roughly 15% of the current value. This gives a fast initial drop that slows as it approaches zero, which looks much cleaner than snapping to 0 instantly.

---

## Optional features added

### Long-press for instant +5
`Pressable.onLongPress` (400 ms threshold) calls `longPressIncrement()`, which always adds 5 and does **not** advance the bonus counter. This means rapid long-presses don't interfere with the every-5th-press rule.

### Value history
The last 10 values are stored in `history[]` and shown as a horizontal scrollable list of badges. Auto-decrement ticks are intentionally excluded from history to avoid flooding it during idle decay.

---

## Edge cases handled

| Scenario | Behaviour |
|---|---|
| Rapid taps | `countRef` is updated synchronously so every tap reads the latest value before React re-renders |
| Reset during auto-decrement | `reset()` calls `stopAutoDecrement()` first |
| Increment/decrement during gradual reset | Both call `stopReset()` first to cancel the interval immediately |
| Reset when count is already 0 | Returns early — no interval starts |
| Auto-decrement reaching 0 | Interval clears itself; flag becomes false |
| Unmount with active timers | `useEffect` cleanup runs `stopAutoDecrement()` and `stopReset()` |

---

## Challenges and tradeoffs

**Stale closures in timer callbacks** — The biggest gotcha was `setInterval` callbacks reading stale state. The ref-mirroring pattern solved it cleanly without reaching for `useReducer` or adding extra complexity.

**Auto-decrement + history** — I chose not to push auto-decrement ticks to history. The alternative would be to limit them (e.g. only push every 5th tick), but skipping them entirely felt cleaner and matched what a user would actually want to review.

**useState vs useReducer** — I considered `useReducer` early on. It would have made the timer callbacks simpler to reason about, but the action types would have grown complex to accommodate the gradual reset and auto-decrement lifecycles. Separate `useState` calls with refs turned out to be more readable.

---

## Project structure

```
CounterPro/
├── src/
│   └── useCounter.ts   ← all counter logic (hook)
├── App.tsx             ← UI only
├── index.js            ← RN entry point
└── README.md
```

---

## Running the app

```bash
# Android
npm run android

# iOS
cd ios && bundle exec pod install && cd ..
npm run ios
```

---

## GitHub Repository

[https://github.com/priyansh23dev/CounterPro](https://github.com/priyansh23dev/CounterPro)
