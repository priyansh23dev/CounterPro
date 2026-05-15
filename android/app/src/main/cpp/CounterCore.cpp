#include "CounterCore.h"
#include <algorithm>

int CounterCore::increment() {
    std::lock_guard<std::mutex> lock(mutex_);
    ++incrementCalls_;
    count_ += (incrementCalls_ % 5 == 0) ? 5 : 1;
    return count_;
}

int CounterCore::longPressIncrement() {
    std::lock_guard<std::mutex> lock(mutex_);
    count_ += 5;
    return count_;
}

int CounterCore::decrement() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (count_ > 0) --count_;
    return count_;
}

void CounterCore::setValue(int value) {
    std::lock_guard<std::mutex> lock(mutex_);
    count_ = std::max(0, value);
}

void CounterCore::resetIncrementCalls() {
    std::lock_guard<std::mutex> lock(mutex_);
    incrementCalls_ = 0;
}

int CounterCore::getValue() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return count_;
}

int CounterCore::getIncrementCalls() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return incrementCalls_;
}
