#include <jni.h>
#include "CounterCore.h"

// Single global instance shared across the lifetime of the process.
// The Kotlin TurboModule calls these from the Android main thread, and
// CounterCore's internal mutex makes it safe if that ever changes.
static CounterCore gCounter;

extern "C" {

JNIEXPORT jint JNICALL
Java_com_counterpro_CounterModule_nativeIncrement(JNIEnv*, jobject) {
    return static_cast<jint>(gCounter.increment());
}

JNIEXPORT jint JNICALL
Java_com_counterpro_CounterModule_nativeLongPressIncrement(JNIEnv*, jobject) {
    return static_cast<jint>(gCounter.longPressIncrement());
}

JNIEXPORT jint JNICALL
Java_com_counterpro_CounterModule_nativeDecrement(JNIEnv*, jobject) {
    return static_cast<jint>(gCounter.decrement());
}

JNIEXPORT void JNICALL
Java_com_counterpro_CounterModule_nativeSetValue(JNIEnv*, jobject, jint value) {
    gCounter.setValue(static_cast<int>(value));
}

JNIEXPORT void JNICALL
Java_com_counterpro_CounterModule_nativeResetIncrementCalls(JNIEnv*, jobject) {
    gCounter.resetIncrementCalls();
}

JNIEXPORT jint JNICALL
Java_com_counterpro_CounterModule_nativeGetValue(JNIEnv*, jobject) {
    return static_cast<jint>(gCounter.getValue());
}

JNIEXPORT jint JNICALL
Java_com_counterpro_CounterModule_nativeGetIncrementCalls(JNIEnv*, jobject) {
    return static_cast<jint>(gCounter.getIncrementCalls());
}

} // extern "C"
