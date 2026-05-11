package com.petapp.overlay

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "OverlayModule"

    @ReactMethod
    fun checkPermission(promise: Promise) {
        promise.resolve(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactApplicationContext)
            } else {
                true
            }
        )
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity")
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            )
            activity.startActivity(intent)
            promise.resolve(true)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun startOverlay(
        spritesheetUri: String,
        frameWidth: Int,
        columns: Int,
        animationsJson: String,
        scale: Float,
        promise: Promise
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !Settings.canDrawOverlays(reactApplicationContext)
            ) {
                promise.reject("NO_PERMISSION", "没有悬浮窗权限")
                return
            }

            val intent = Intent(reactApplicationContext, OverlayService::class.java).apply {
                putExtra("spritesheet_uri", spritesheetUri)
                putExtra("frame_width", frameWidth)
                putExtra("columns", columns)
                putExtra("animations_json", animationsJson)
                putExtra("scale", scale)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopOverlay(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, OverlayService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }
}
