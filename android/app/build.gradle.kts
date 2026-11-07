import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

val localProperties = Properties().apply {
  val file = rootProject.file("local.properties")
  if (file.exists()) file.inputStream().use(::load)
}
val rule34ApiKey = providers.gradleProperty("r34ApiKey")
  .orElse(localProperties.getProperty("r34ApiKey") ?: "").get()
val rule34UserId = providers.gradleProperty("r34UserId")
  .orElse(localProperties.getProperty("r34UserId") ?: "").get()

android {
  namespace = "lan.serverhome.r34viewer"
  compileSdk = 35

  defaultConfig {
    applicationId = "lan.serverhome.r34viewer"
    minSdk = 26
    targetSdk = 35
    versionCode = 3
    versionName = "1.0.2"
    buildConfigField("String", "R34_API_KEY", "\"$rule34ApiKey\"")
    buildConfigField("String", "R34_USER_ID", "\"$rule34UserId\"")
  }

  buildFeatures { buildConfig = true }

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

