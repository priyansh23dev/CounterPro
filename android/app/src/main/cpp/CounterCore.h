#pragma once
#include <mutex>

// Pure C++ counter state. No Android or JNI dependencies.
// Thread-safe via a single mutex — Kotlin TurboModule calls these from the
// main thread, but the mutex guards against any future concurrent access.
class CounterCore {
public:
    // Every 5th call to increment() gives +5 instead of +1.
    int increment();

    // Always +5; does NOT advance the bonus counter.
    int longPressIncrement();

    // Floor at 0 — never returns a negative value.
    int decrement();

    // Set count directly (used by the Kotlin gradual-reset ticker).
    void setValue(int value);

    // Reset bonus counter without touching count (called before a gradual reset).
    void resetIncrementCalls();

    int getValue() const;
    int getIncrementCalls() const;

private:
    int count_          = 0;
    int incrementCalls_ = 0;
    mutable std::mutex mutex_;
};
