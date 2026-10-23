plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "lan.serverhome.r34viewer"
  compileSdk = 35

  defaultConfig {
    applicationId = "lan.serverhome.r34viewer"
    minSdk = 26
    targetSdk = 35
    versionCode = 1
    versionName = "1.0.0"
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  sourceSets {
    getByName("main").assets.srcDir("../../public")
  }
}

dependencies {
  implementation("androidx.activity:activity-ktx:1.10.1")
  implementation("androidx.webkit:webkit:1.12.1")
}
