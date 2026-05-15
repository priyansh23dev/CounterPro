# CounterPro

A React Native counter app with two implementations on separate branches:

| Branch | Implementation |
|---|---|
| `js-implementation` | All logic in JavaScript (custom hook) |
| `turbomodule-implementation` | Business logic in C++ exposed via TurboModule |

---

## JS Implementation (`js-implementation` branch)

### Logic structure

All counter logic lives in **`src/useCounter.ts`** as a single custom hook. `App.tsx` is pure UI — it calls the hook and renders.

### State

| State | Type | Purpose |
|---|---|---|
| `count` | `number` | Drives the display |
| `history` | `number[]` | Last 10 distinct values |
| `isAutoDecrementing` | `boolean` | UI status indicator |
| `isResetting` | `boolean` | UI status indicator |
| `incrementCalls` | `number` | Bonus counter (next +5 in X presses) |

**Why `useState` and not a reducer?** Each piece of state has a different update cadence. Separate `useState` lets React batch updates that happen together in user callbacks while still allowing independent updates from timer callbacks.

**Refs for timer callbacks** — `countRef` and `incrementCallsRef` mirror their state values so `setInterval`/`setTimeout` callbacks always read the current value without stale closures.

### Non-trivial behaviours

1. **Every 5th increment → +5** — tracked via `incrementCallsRef`.
2. **Decrement floor at 0** — returns early when already at zero.
3. **Auto-decrement after 3 s idle** — `setTimeout` → `setInterval`, cancelled on any interaction.
4. **Gradual reset** — 15% decay per 80 ms tick; slows as it approaches 0.

### Optional features

- **Long-press +** → instant +5 (bypasses bonus counter)
- **Value history** — last 10 values shown as scrollable badges

---

## TurboModule Implementation (`turbomodule-implementation` branch)

### Architecture

```
┌─────────────────────────────────────────────┐
│                 JavaScript                   │
│  App.tsx  →  useNativeCounter.ts             │
│              ↕ NativeEventEmitter            │
├─────────────────────────────────────────────┤
│              Kotlin (Android)                │
│  CounterModule.kt                            │
│  · TurboModule interface                     │
│  · Handler-based timers (auto-dec, reset)    │
│  · Emits CounterChanged / CounterStatusChanged│
├─────────────────────────────────────────────┤
│                  C++ (JNI)                   │
│  CounterCore.h/.cpp                          │
│  · increment / longPressIncrement / decrement│
│  · setValue / resetIncrementCalls            │
│  · getValue / getIncrementCalls              │
│  CounterJNI.cpp — JNI function bindings      │
└─────────────────────────────────────────────┘
```

### How data flows

```
User press
  → JS calls CounterModule.increment()
  → Kotlin CounterModule.increment() (TurboModule, JSI bridge)
  → JNI: nativeIncrement()
  → C++ CounterCore::increment() mutates count_, returns new value
  → Kotlin emits "CounterChanged" { value, incrementCalls }
  → NativeEventEmitter fires in JS
  → useNativeCounter updates React state
  → UI re-renders
```

For auto-decrement and gradual reset, Kotlin uses `Handler.postDelayed()` to schedule ticks. Each tick calls `nativeDecrement()` (C++) and emits `CounterChanged`. JS only reacts to events — it never polls.

### File layout

```
CounterPro/
├── src/
│   ├── NativeCounterModule.ts    ← Codegen spec (TurboModuleRegistry)
│   ├── useNativeCounter.ts       ← JS hook, subscribes to native events
│   └── useCounter.ts             ← JS-only hook (js-implementation branch)
├── android/app/src/main/
│   ├── cpp/
│   │   ├── CounterCore.h/.cpp    ← Pure C++ counter logic
│   │   ├── CounterJNI.cpp        ← JNI bindings
│   │   └── CMakeLists.txt        ← Builds libcounterpro.so
│   └── java/com/counterpro/
│       ├── CounterModule.kt      ← TurboModule + Kotlin timers
│       └── CounterModulePackage.kt
└── App.tsx                       ← UI, uses useNativeCounter on this branch
```

### Key differences: JS vs Native

| Aspect | JS implementation | Native (TurboModule) |
|---|---|---|
| Counter state | `useState` in JS hook | C++ `CounterCore` |
| Bonus logic | JS arithmetic in hook | C++ `CounterCore::increment()` |
| Floor-at-0 | JS guard in hook | C++ `CounterCore::decrement()` |
| Auto-decrement timer | `setInterval` in JS | `Handler.postDelayed` in Kotlin |
| Gradual reset | `setInterval` in JS | `Handler.postDelayed` in Kotlin |
| State sync to UI | Direct `setState` calls | `NativeEventEmitter` events |
| Thread safety | Single JS thread | `std::mutex` in C++ core |

### Codegen

The `codegenConfig` in `package.json` points Codegen at `src/NativeCounterModule.ts`. During build, Codegen generates `NativeCounterModuleSpec.kt` which `CounterModule.kt` extends. Build step:

```bash
# First build generates the spec — subsequent builds are incremental
npm run android
```

### Events

| Event | Payload | When |
|---|---|---|
| `CounterChanged` | `{ value: number, incrementCalls: number }` | Any count mutation |
| `CounterStatusChanged` | `{ isAutoDecrementing: boolean, isResetting: boolean }` | Timer state changes |

---

## Running the app

```bash
# Android
npm run android

# iOS (js-implementation branch only — TurboModule is Android-only for now)
cd ios && bundle exec pod install && cd ..
npm run ios
```
