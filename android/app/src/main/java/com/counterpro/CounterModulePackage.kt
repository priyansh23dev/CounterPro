package com.counterpro

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class CounterModulePackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == CounterModule.NAME) CounterModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                CounterModule.NAME to ReactModuleInfo(
                    CounterModule.NAME, // name
                    CounterModule.NAME, // className
                    false,              // canOverrideExistingModule
                    false,              // needsEagerInit
                    false,              // isCxxModule
                    true                // isTurboModule
                )
            )
        }
}
