# 📱 Native Android APK Conversion Guide for RoadSOS

When you deploy this Web PWA link to **Vercel** and convert it into a native Android **APK**, you must ensure that hardware volume button clicks can trigger the background SOS alert correctly (even when the lock screen is active).

Here is the exact developer instructions prompt to feed into **Google AI Studio** or any Custom LLM / build tool when designing the wrapper/APK shell for your native Android wrapper app:

---

### 📝 EXACT GOOGLE AI STUDIO / BUILDER PROMPT TO USE:

```text
Please build a premium native Android wrapper (TWA / WebView Activity) for my emergency PWA website using Java or Kotlin. 

The app MUST intercept physical hardware Volume Down presses in the background and when the lock screen is active to send a simulated media event so the Web PWA can trigger a silent SOS.

Specifically, implement these native capabilities in the Android Studio project:

1. SERVICE & RECEIVER HOOKS:
- Set up a background `Foreground Service` to keep the app process alive.
- Register a `MediaButtonReceiver` in `AndroidManifest.xml` to receive media button events:
  <receiver android:name="androidx.media.session.MediaButtonReceiver" android:exported="true">
      <intent-filter>
          <action android:name="android.intent.action.MEDIA_BUTTON" />
      </intent-filter>
  </receiver>

2. KEY EVENT CAPTURE IN LOCK SCREEN:
- Override `onKeyDown(int keyCode, KeyEvent event)` inside the main `MainActivity` to listen for Volume Down presses:
  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
      if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
          // Send seek backward media button event to PWA WebView to trigger useVolumeButton hook
          dispatchMediaButtonEvent(KeyEvent.KEYCODE_MEDIA_PREVIOUS);
          return true; // prevent standard system volume overlay
      }
      return super.onKeyDown(keyCode, event);
  }

3. MEDIA SESSION IMPLEMENTATION:
- Initialize a `MediaSessionCompat` in the Foreground service:
  MediaSessionCompat mediaSession = new MediaSessionCompat(context, "RoadSOSMediaSession");
  mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
  mediaSession.setActive(true);
- Set up state playback so volume buttons map to `seekbackward` or `previoustrack` trigger signals inside the HTML5 Media Session API inside the PWA WebView.

4. REQUIRED PERMISSIONS (AndroidManifest.xml):
- <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
- <uses-permission android:name="android.permission.WAKE_LOCK" />
- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
- <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

### 🚀 HOW TO DEPLOY TO VERCEL IN 1 MINUTE:

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Build the project locally to make sure there are no errors:
   ```bash
   npm run build
   ```
3. Deploy to production from your terminal:
   ```bash
   vercel --prod
   ```
   *Follow the command line prompts: select "Yes" to link, default options for settings, and your web app will be live on a custom `.vercel.app` URL in seconds!*

4. Ensure your Vercel deployment has your API keys set in the project Dashboard Environment Variables:
   - `VITE_ANTHROPIC_API_KEY`: *[Your Anthropic Claude API Key]*
   - `VITE_COMMUNITY_SHEET_URL`: *[Your Published Volunteer Google Sheets CSV URL]*
