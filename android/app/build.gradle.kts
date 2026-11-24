import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

val localProperties = Properties().apply {
  val file = rootProject.file("local.properties")
  if (file.exists()) file.inputStream().use(::load)
}
val signingStore = localProperties.getProperty("r34SigningStore").orEmpty()
val signingStorePassword = localProperties.getProperty("r34SigningStorePassword").orEmpty()
val signingKeyAlias = localProperties.getProperty("r34SigningKeyAlias").orEmpty()
val signingKeyPassword = localProperties.getProperty("r34SigningKeyPassword").orEmpty()

android {
  namespace = "lan.serverhome.r34viewer"
  compileSdk = 35

  defaultConfig {
    applicationId = "lan.serverhome.r34viewer"
    minSdk = 26
    targetSdk = 35
    versionCode = 13
    versionName = "1.1.2"
  }

  signingConfigs {
    if (signingStore.isNotBlank() && signingStorePassword.isNotBlank() &&
      signingKeyAlias.isNotBlank() && signingKeyPassword.isNotBlank()) {
      create("personalRelease") {
        storeFile = rootProject.file(signingStore)
        storePassword = signingStorePassword
        keyAlias = signingKeyAlias
        keyPassword = signingKeyPassword
      }
    }
  }

  buildTypes {
    getByName("release") {
      isMinifyEnabled = false
      signingConfigs.findByName("personalRelease")?.let { signingConfig = it }
    }
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
