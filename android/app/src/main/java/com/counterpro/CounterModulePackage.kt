package com.counterpro

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class CounterModulePackage : BaseReactPackage() {

    // Use the literal so CounterModule's companion object (and loadLibrary) is
    // never triggered during package scanning / bridge startup.
    private val moduleName = "CounterModule"

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == moduleName) CounterModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                moduleName to ReactModuleInfo(
                    moduleName, // name
                    moduleName, // className
                    false,      // canOverrideExistingModule
                    false,      // needsEagerInit
                    false,      // isCxxModule
                    true        // isTurboModule
                )
            )
        }
}
