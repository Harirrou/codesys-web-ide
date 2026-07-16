plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.wispbloom.game"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.wispbloom.game"
        minSdk = 26  // adaptive icon only; lower needs legacy mipmap fallbacks
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    // The HTML5 game in /game is the single source of truth; it is packaged
    // straight into the APK as WebView assets.
    sourceSets {
        getByName("main") {
            assets.srcDirs("../../game")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
