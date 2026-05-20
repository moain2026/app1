# ============================================================================
# AbbasiTahseel — ProGuard / R8 rules
# ----------------------------------------------------------------------------
# Target: android/app/proguard-rules.pro
# Used when minifyEnabled = true (release builds).
# Covers every dependency in package.json + the libs we add in Wave 5–7.
# ============================================================================

# ----------------------------------------------------------------------------
# Global stripping
# ----------------------------------------------------------------------------
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Keep generic signatures (needed by Gson/Moshi style libs, also RN bridge)
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes SourceFile,LineNumberTable

# Hide original source-file references in stack traces, keep line numbers
-renamesourcefileattribute SourceFile

# ============================================================================
# React Native core
# ============================================================================
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *

-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.UIProp <fields>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.devsupport.** { *; }
-dontwarn com.facebook.react.**

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.hermes.reactexecutor.** { *; }
-keep class com.facebook.hermes.intl.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.hermes.**

# JSC (in case Hermes is disabled for a build)
-keep class com.facebook.jsc.** { *; }
-dontwarn com.facebook.jsc.**

# ============================================================================
# Reanimated 3
# ============================================================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.swmansion.reanimated.**

# ============================================================================
# Gesture Handler
# ============================================================================
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ============================================================================
# Screens + Safe Area
# ============================================================================
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.swmansion.rnscreens.**
-dontwarn com.th3rdwave.safeareacontext.**

# ============================================================================
# WatermelonDB
# ============================================================================
-keep class com.nozbe.watermelondb.** { *; }
-dontwarn com.nozbe.watermelondb.**

# SQLite-cipher (transitive)
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**

# ============================================================================
# MMKV
# ============================================================================
-keep class com.tencent.mmkv.** { *; }
-dontwarn com.tencent.mmkv.**

# ============================================================================
# Keychain
# ============================================================================
-keep class com.oblador.keychain.** { *; }
-dontwarn com.oblador.keychain.**

# ============================================================================
# Vector Icons
# ============================================================================
-keep class com.oblador.vectoricons.** { *; }

# ============================================================================
# FlashList
# ============================================================================
-keep class com.shopify.reactnative.flash_list.** { *; }

# ============================================================================
# SVG
# ============================================================================
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ============================================================================
# Bottom Sheet (Gorhom)  — pure JS, no native rules needed
# ============================================================================

# ============================================================================
# NetInfo
# ============================================================================
-keep class com.reactnativecommunity.netinfo.** { *; }

# ============================================================================
# Async Storage
# ============================================================================
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ============================================================================
# Device Info
# ============================================================================
-keep class com.learnium.RNDeviceInfo.** { *; }

# ============================================================================
# Background Fetch (transistorsoft)
# ============================================================================
-keep class com.transistorsoft.** { *; }
-dontwarn com.transistorsoft.**

# ============================================================================
# react-native-config
# ============================================================================
-keep class com.lugg.RNCConfig.** { *; }

# ============================================================================
# react-native-share
# ============================================================================
-keep class cl.json.** { *; }

# ============================================================================
# Wave 5: Bluetooth Classic (kenjdavidson)
# ============================================================================
-keep class kjd.reactnative.bluetooth.** { *; }
-keep class com.kenjdavidson.bluetoothclassic.** { *; }
-dontwarn kjd.reactnative.bluetooth.**

# Android Bluetooth core (we use reflection in helpers)
-keep class android.bluetooth.** { *; }
-keep class android.bluetooth.BluetoothDevice { *; }
-keep class android.bluetooth.BluetoothSocket { *; }
-keep class android.bluetooth.BluetoothAdapter { *; }

# ============================================================================
# Wave 5: Vision Camera (mrousavy) — for noadad barcode scanning
# ============================================================================
-keep class com.mrousavy.camera.** { *; }
-keep class com.mrousavy.camera.frameprocessors.** { *; }
-dontwarn com.mrousavy.camera.**

# CameraX (transitive)
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ML Kit barcode scanning (if used as the scanner backend)
-keep class com.google.mlkit.vision.barcode.** { *; }
-keep class com.google.mlkit.vision.common.** { *; }
-dontwarn com.google.mlkit.**

# ============================================================================
# Wave 5: Datecs SDK (if we end up bundling the .jar — optional)
# ============================================================================
-keep class com.datecs.** { *; }
-dontwarn com.datecs.**

# ============================================================================
# Wave 7: Charts — MPAndroidChart (via react-native-chart-kit)
# ============================================================================
-keep class com.github.mikephil.charting.** { *; }
-keep class com.github.PhilJay.MPAndroidChart.** { *; }
-dontwarn com.github.mikephil.charting.**

# ============================================================================
# Wave 7: PDF (react-native-html-to-pdf)
# ============================================================================
-keep class com.christopherdro.htmltopdf.** { *; }
-dontwarn com.christopherdro.htmltopdf.**

# OR if we use react-native-pdf + rn-fetch-blob:
-keep class com.wonday.pdf.** { *; }
-keep class com.RNFetchBlob.** { *; }
-dontwarn com.wonday.pdf.**
-dontwarn com.RNFetchBlob.**

# ============================================================================
# OkHttp / Okio (used by axios on Android under the hood via fetch polyfill)
# ============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Conscrypt (TLS)
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ============================================================================
# Kotlin
# ============================================================================
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ============================================================================
# AndroidX / Material
# ============================================================================
-dontwarn androidx.**
-keep class androidx.appcompat.** { *; }
-keep class com.google.android.material.** { *; }

# ============================================================================
# Application classes (do NOT obfuscate the entry points referenced from XML)
# ============================================================================
-keep class com.alabbasi.tahseel.** { *; }
-keep class com.alabbasi.tahseel.MainActivity { *; }
-keep class com.alabbasi.tahseel.MainApplication { *; }

# Models that round-trip through JSON / WatermelonDB
-keep class com.alabbasi.tahseel.models.** { *; }

# ============================================================================
# Enums (always preserve valueOf()/values() — proguard sometimes strips these)
# ============================================================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Serializable
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# Strip log calls in release (saves ~50 KB and prevents leaking debug info)
# ============================================================================
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}

# ============================================================================
# END
# ============================================================================
