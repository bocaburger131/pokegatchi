plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.shift4funding.tamagotchi"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.shift4funding.tamagotchi"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
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

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.ui)
    implementation(libs.ui.tooling.preview)
    implementation(libs.wear.compose)
    implementation(libs.wear.compose.foundation)
    implementation(libs.wear.compose.navigation)

    // Activity
    implementation(libs.activity.compose)

    // Lifecycle
    implementation(libs.lifecycle.runtime)
    implementation(libs.lifecycle.service)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)

    // Debug
    debugImplementation(libs.ui.tooling)
}
