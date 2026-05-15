package com.counterpro

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.ceil
import kotlin.math.max

@ReactModule(name = CounterModule.NAME)
class CounterModule(reactContext: ReactApplicationContext) :
    NativeCounterModuleSpec(reactContext) {

    companion object {
        const val NAME = "CounterModule"

        private const val IDLE_DELAY_MS       = 3000L
        private const val AUTO_DEC_INTERVAL   = 1000L
        private const val RESET_STEP_MS       = 80L

        init {
            // Load the shared library built from CMakeLists.txt
            System.loadLibrary("counterpro")
        }
    }

    // ── JNI declarations (implemented in CounterCore / CounterJNI.cpp) ─────────
    private external fun nativeIncrement(): Int
    private external fun nativeLongPressIncrement(): Int
    private external fun nativeDecrement(): Int
    private external fun nativeSetValue(value: Int)
    private external fun nativeResetIncrementCalls()
    private external fun nativeGetValue(): Int
    private external fun nativeGetIncrementCalls(): Int

    // ── Timer machinery ─────────────────────────────────────────────────────────
    private val handler = Handler(Looper.getMainLooper())

    private var isAutoDecrementing = false
    private var isResetting        = false

    // Named Runnable references so we can remove them individually.
    private val idleRunnable = Runnable {
        isAutoDecrementing = true
        emitStatus()
        handler.post(autoDecrementTickRunnable)
    }

    private val autoDecrementTickRunnable: Runnable = object : Runnable {
        override fun run() {
            val current = nativeGetValue()
            if (current <= 0) {
                isAutoDecrementing = false
                emitStatus()
                return
            }
            val next = nativeDecrement()
            emitCounterChanged(next)
            handler.postDelayed(this, AUTO_DEC_INTERVAL)
        }
    }

    private var resetRunnable: Runnable? = null

    // ── TurboModule interface ────────────────────────────────────────────────────
    override fun getName(): String = NAME

    override fun increment(): Double {
        cancelAutoDecrement()
        cancelReset()
        val next = nativeIncrement()
        emitCounterChanged(next)
        scheduleAutoDecrement()
        return next.toDouble()
    }

    override fun longPressIncrement(): Double {
        cancelAutoDecrement()
        cancelReset()
        val next = nativeLongPressIncrement()
        emitCounterChanged(next)
        scheduleAutoDecrement()
        return next.toDouble()
    }

    override fun decrement(): Double {
        cancelAutoDecrement()
        cancelReset()
        val next = nativeDecrement()
        emitCounterChanged(next)
        scheduleAutoDecrement()
        return next.toDouble()
    }

    override fun reset() {
        cancelAutoDecrement()
        cancelReset()
        if (nativeGetValue() == 0) return

        // Reset the bonus counter immediately in C++; count is stepped down gradually.
        nativeResetIncrementCalls()
        isResetting = true
        emitStatus()
        scheduleResetTick()
    }

    override fun getValue(): Double = nativeGetValue().toDouble()

    // ── Timer helpers ────────────────────────────────────────────────────────────
    private fun scheduleAutoDecrement() {
        handler.removeCallbacks(idleRunnable)
        handler.postDelayed(idleRunnable, IDLE_DELAY_MS)
    }

    private fun cancelAutoDecrement() {
        handler.removeCallbacks(idleRunnable)
        handler.removeCallbacks(autoDecrementTickRunnable)
        if (isAutoDecrementing) {
            isAutoDecrementing = false
            emitStatus()
        }
    }

    private fun scheduleResetTick() {
        val r = Runnable {
            val current = nativeGetValue()
            if (current <= 0) {
                nativeSetValue(0)
                isResetting = false
                emitCounterChanged(0)
                emitStatus()
                resetRunnable = null
                return@Runnable
            }
            // Mirror the JS 15%-per-tick decay so behaviour is identical.
            val step = max(1, ceil(current * 0.15f).toInt())
            val next = max(0, current - step)
            nativeSetValue(next)
            emitCounterChanged(next)
            scheduleResetTick()
        }
        resetRunnable = r
        handler.postDelayed(r, RESET_STEP_MS)
    }

    private fun cancelReset() {
        resetRunnable?.let { handler.removeCallbacks(it) }
        resetRunnable = null
        if (isResetting) {
            isResetting = false
            emitStatus()
        }
    }

    // ── Event emitters ───────────────────────────────────────────────────────────
    private fun emitCounterChanged(value: Int) {
        val params: WritableMap = Arguments.createMap().apply {
            putInt("value", value)
            putInt("incrementCalls", nativeGetIncrementCalls())
        }
        emit("CounterChanged", params)
    }

    private fun emitStatus() {
        val params: WritableMap = Arguments.createMap().apply {
            putBoolean("isAutoDecrementing", isAutoDecrementing)
            putBoolean("isResetting", isResetting)
        }
        emit("CounterStatusChanged", params)
    }

    private fun emit(event: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, params)
    }
}
