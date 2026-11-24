# Rule34 Viewer for Android

Private Android client for browsing Rule34 directly from a phone. Posts, tags and media are requested from the upstream API by the app itself.

## What it does

- Search with autocomplete, exclusions and reversible named super-tags.
- Filter and sort by rating.
- Inline image viewing and custom video controls.
- Download or open the original media file.
- Stores active search, filters and super-tags only in the application's local storage on the device.

There are no accounts or cloud synchronisation. Reinstalling the app or clearing its data removes its local settings.

## API credentials in the app

Open the application settings and enter your API key and user ID in the **Rule34 API** section. They are saved only in Android's local application storage. The APK and the repository do not contain an API key. Nothing is sent to this project's server because it has no server component.

## Build

The Android project is in [`android/`](android/). It packages the interface from [`public/`](public/) into a WebView-based native application.

Then assemble the debug APK from Android Studio or with Gradle:

```powershell
cd android
./gradlew :app:assembleDebug
```

The result is `android/app/build/outputs/apk/debug/app-debug.apk`.

Do not commit personal API credentials or generated APK files.
