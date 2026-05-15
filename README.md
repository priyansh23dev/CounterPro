# CounterPro — React Native Counter App

A React Native counter app built as part of a mobile engineering assignment. The project has two separate implementations on different branches to explore the difference between JavaScript-only state management and native module integration via the New Architecture TurboModule system.

## Demo Video

[Watch Demo](https://drive.google.com/file/d/1zN5o8FvdTEAtnDg9Vk65NOjamoi6UXNz/view?usp=sharing)

---

## Branches

| Branch | What it does |
|---|---|
| `js-implementation` | Counter logic written entirely in JavaScript/TypeScript |
| `turbomodule-implementation` | Counter logic moved to C++ and exposed via a TurboModule |

---

## Part 1 — JavaScript Implementation

### How the logic is structured

All counter logic lives in a single custom hook: `src/useCounter.ts`. The component (`App.tsx`) only handles rendering — it calls the hook and maps state to UI. There is no business logic in the component tree.

### Where state is stored and why

State is split across multiple `useState` calls rather than a single reducer:

| State | Why it's separate |
|---|---|
| `count` | Core value — updated on every interaction and every timer tick |
| `incrementCalls` | Only updates on `increment()` calls, not on auto-decrement |
| `history` | Append-only log; updating it separately avoids re-deriving it from count |
| `isAutoDecrementing` | UI-only flag, independent lifecycle from count |
| `isResetting` | UI-only flag, independent lifecycle from count |

Each piece has a different update cadence, so keeping them separate means React can batch what belongs together without coupling unrelated updates.

**Refs alongside state** — `countRef` and `incrementCallsRef` mirror their `useState` twins. Timer callbacks (`setInterval` / `setTimeout`) capture variables at the time they're created; without refs, they'd read a stale count. The pattern is: update the ref and call `setState` in the same synchronous step.

### Non-trivial behaviours implemented

1. **Every 5th increment → +5**  
   `incrementCalls` tracks button presses. When `incrementCalls % 5 === 0` the delta becomes 5. The UI counts down and shows "BONUS +5 READY" when it's about to fire.

2. **Decrement floor at 0**  
   `decrement()` exits early when `countRef.current <= 0`. The count never goes negative.

3. **Auto-decrement after 3 s idle**  
   After every user interaction, `scheduleAutoDecrement()` resets a 3-second `setTimeout`. When it fires it starts a 1-second `setInterval` that decrements until the count hits 0. Any new interaction cancels both timers immediately.

4. **Gradual reset**  
   `reset()` starts an `setInterval` that fires every 80 ms. Each tick subtracts `max(1, ceil(count × 0.15))` — roughly 15% of the remaining value. This makes the counter decay quickly at first and slow down near zero, giving a smooth visual effect instead of an instant jump.

### Optional features

- **Long-press + for instant +5** — `Pressable.onLongPress` (400 ms threshold) calls `longPressIncrement()`, which always adds 5 without advancing the bonus counter.
- **Value history** — the last 10 values are stored and shown as a horizontal scrollable list of badges.

### Edge cases handled

| Scenario | Behaviour |
|---|---|
| Rapid taps | `countRef` is updated synchronously so every tap reads the latest value before React re-renders |
| Reset during auto-decrement | `reset()` calls `stopAutoDecrement()` first |
| Increment during gradual reset | Calls `stopReset()` first, clearing the interval immediately |
| Reset at 0 | Returns early — no interval starts |
| Auto-decrement reaching 0 | Interval clears itself |
| Unmount with active timers | `useEffect` cleanup runs `stopAutoDecrement()` and `stopReset()` |

---

## Part 2 — TurboModule Implementation (Android)

### How the TurboModule is implemented

The counter logic was moved from JavaScript into C++ and exposed to React Native via the New Architecture TurboModule system. The implementation is split into three layers:

```
┌─────────────────────────────────────────────┐
│              JavaScript (UI only)            │
│  App.tsx  →  useNativeCounter.ts             │
│              ↕  DeviceEventEmitter           │
├─────────────────────────────────────────────┤
│          Kotlin (TurboModule + timers)       │
│  CounterModule.kt                            │
│  · Implements NativeCounterModuleSpec        │
│  · Calls C++ via JNI                         │
│  · Runs auto-decrement + reset timers        │
│    using Android Handler                     │
│  · Emits CounterChanged /                    │
│    CounterStatusChanged events               │
├─────────────────────────────────────────────┤
│              C++ (business logic)            │
│  CounterCore.h / CounterCore.cpp             │
│  · increment() — bonus every 5th call        │
│  · longPressIncrement() — always +5          │
│  · decrement() — floored at 0                │
│  · setValue() / resetIncrementCalls()        │
│  · getValue() / getIncrementCalls()          │
│  CounterJNI.cpp — JNI bindings               │
└─────────────────────────────────────────────┘
```

**Codegen** — `src/NativeCounterModule.ts` is the TypeScript spec file. React Native's Codegen reads it during the Gradle build and generates the abstract Kotlin class `NativeCounterModuleSpec`, which `CounterModule.kt` extends.

**C++ build** — CMakeLists.txt compiles `CounterCore.cpp` and `CounterJNI.cpp` into `libcounterpro.so` (arm64-v8a + x86_64). The Kotlin class loads it in its constructor (`System.loadLibrary("counterpro")`), not at class-loading time, to avoid interfering with the bridge startup.

### How data flows between native and JavaScript

```
User taps button
  │
  ▼
JS calls CounterModule.increment()       ← TurboModule call over JSI
  │
  ▼
Kotlin CounterModule.increment()
  │
  ▼
JNI: nativeIncrement()                   ← crosses the JNI boundary
  │
  ▼
C++ CounterCore::increment()
  · increments count_
  · applies 5th-increment bonus rule
  · returns new count
  │
  ▼
Kotlin emits "CounterChanged" event
  { value: Int, incrementCalls: Int }    ← via RCTDeviceEventEmitter
  │
  ▼
JS DeviceEventEmitter fires
  │
  ▼
useNativeCounter hook updates React state
  │
  ▼
UI re-renders
```

For **auto-decrement** and **gradual reset**, Kotlin uses `Handler.postDelayed()` to schedule ticks. Each tick calls the relevant JNI method, gets the new value, and emits `CounterChanged`. JavaScript only reacts to events — it never polls or manages timers for these behaviours.

### Key differences between the JS and native implementations

| Aspect | JavaScript | Native (TurboModule) |
|---|---|---|
| Counter state | `useState` in JS hook | `count_` / `incrementCalls_` in C++ |
| Bonus logic (+5 every 5th) | JS arithmetic | `CounterCore::increment()` in C++ |
| Floor-at-0 | JS guard | `CounterCore::decrement()` in C++ |
| Auto-decrement timer | `setInterval` in JS | `Handler.postDelayed` in Kotlin |
| Gradual reset timer | `setInterval` in JS | `Handler.postDelayed` in Kotlin |
| State → UI sync | Direct `setState` calls | `DeviceEventEmitter` events |
| Thread safety | Single JS thread | `std::mutex` in C++ core |
| Reset style | Gradual (15% decay) | Gradual (same decay, driven from Kotlin) |

### Events

| Event | Payload | Fired when |
|---|---|---|
| `CounterChanged` | `{ value, incrementCalls }` | Any count mutation |
| `CounterStatusChanged` | `{ isAutoDecrementing, isResetting }` | Timer state changes |

### Challenges and tradeoffs

**1. Library load timing**  
Initially I put `System.loadLibrary("counterpro")` in the Kotlin companion object's `init` block. Companion object initialisation fires the moment any static member is read — including during package registration at bridge startup. This caused the entire TurboModule registry to crash before `PlatformConstants` registered. The fix was to move the load into the class `init` block, so it only runs when JS actually requests the module.

**2. NativeEventEmitter vs DeviceEventEmitter**  
`NativeEventEmitter` expects the native module to track listener counts via `addListener` / `removeListeners`. With TurboModules those are no-ops in the Codegen spec, which triggers a "platform constants" warning and breaks event delivery. The fix was to use `DeviceEventEmitter` directly in JS — Kotlin emits via `RCTDeviceEventEmitter`, which maps to the same channel.

**3. Global C++ state**  
`CounterCore` is a global singleton in the JNI layer (`static CounterCore gCounter`). This keeps things simple for a single-user counter but would need a per-instance approach in a multi-screen app. The `std::mutex` guards against any future concurrent access without adding observable overhead.

**4. History stays in JS**  
Auto-decrement ticks don't append to history (same decision as the JS implementation). This avoids flooding the list during idle decay. History is tracked in `useNativeCounter.ts` by listening to `CounterChanged` events and skipping ticks that happen while `isAutoDecrementing` is true.

---

## File Structure

```
CounterPro/
├── src/
│   ├── useCounter.ts          ← JS hook (js-implementation branch)
│   ├── NativeCounterModule.ts ← Codegen spec for TurboModule
│   └── useNativeCounter.ts    ← JS hook wrapping native module
├── android/app/src/main/
│   ├── cpp/
│   │   ├── CounterCore.h/.cpp ← Pure C++ counter logic
│   │   ├── CounterJNI.cpp     ← JNI bindings
│   │   └── CMakeLists.txt     ← Builds libcounterpro.so
│   └── java/com/counterpro/
│       ├── CounterModule.kt       ← TurboModule + Handler timers
│       └── CounterModulePackage.kt
└── App.tsx                    ← UI only
```

---

## Running the App

### Prerequisites
- Android Studio with NDK installed
- Android emulator or physical device (API 24+)
- Node.js 22+

### Android

```bash
npm install
npm run android
```

> The first build runs Codegen to generate `NativeCounterModuleSpec.kt` and compiles the C++ shared library. Subsequent builds are incremental.

---

## GitHub Repository

[https://github.com/priyansh23dev/CounterPro](https://github.com/priyansh23dev/CounterPro)
