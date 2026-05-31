# 📱 Native Android APK Conversion Guide for RoadSOS (With Native GPS Injection)

When you deploy this Web PWA link to **Vercel** and convert it into a native Android **APK**, you must ensure that hardware volume button clicks can trigger the background SOS alert correctly (even when the lock screen is active), and that the native Android hardware GPS is fetched and injected directly into the Web view!

Here is the exact developer instructions prompt and complete codebase to feed into **Google AI Studio** or any Custom LLM / build tool when designing the wrapper/APK shell for your native Android wrapper app:

---

### 📝 EXACT GOOGLE AI STUDIO / BUILDER PROMPT TO USE:

```text
Please build a premium native Android wrapper (TWA / WebView Activity) for my emergency PWA website using Java or Kotlin. 

The app MUST intercept physical hardware Volume Up + Volume Down keys pressed together in the background and when the lock screen is active to trigger the SOS instantly, and MUST capture native Android high-accuracy hardware GPS locations and inject them directly into the Web PWA.

Specifically, implement these native capabilities in the Android Studio project:

1. SERVICE & RECEIVER HOOKS:
- Set up a background `Foreground Service` to keep the app process alive.
- Register a `MediaButtonReceiver` in `AndroidManifest.xml` to receive media button events:
  <receiver android:name="androidx.media.session.MediaButtonReceiver" android:exported="true">
      <intent-filter>
          <action android:name="android.intent.action.MEDIA_BUTTON" />
      </intent-filter>
  </receiver>

2. SIMULTANEOUS KEY COMBINATION EVENT CAPTURE IN LOCK SCREEN:
- Override `onKeyDown(int keyCode, KeyEvent event)` and `onKeyUp(int keyCode, KeyEvent event)` inside `MainActivity` to listen for Volume Up and Volume Down keys being pressed together:
  private boolean isVolumeUpPressed = false;
  private boolean isVolumeDownPressed = false;

  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
      if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
          isVolumeUpPressed = true;
      } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
          isVolumeDownPressed = true;
      }

      if (isVolumeUpPressed && isVolumeDownPressed) {
          webView.post(() -> webView.evaluateJavascript("if(window.triggerSOSVolumeAlert){ window.triggerSOSVolumeAlert(); }", null));
          return true; // prevent standard system volume overlay
      }
      return super.onKeyDown(keyCode, event);
  }

  @Override
  public boolean onKeyUp(int keyCode, KeyEvent event) {
      if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
          isVolumeUpPressed = false;
      } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
          isVolumeDownPressed = false;
      }
      return super.onKeyUp(keyCode, event);
  }

3. MEDIA SESSION IMPLEMENTATION:
- Initialize a `MediaSessionCompat` in the Foreground service:
  MediaSessionCompat mediaSession = new MediaSessionCompat(context, "RoadSOSMediaSession");
  mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
  mediaSession.setActive(true);

4. NATIVE HIGH-ACCURACY HARDWARE GPS CAPTURE:
- Use `FusedLocationProviderClient` from Google Play Services Location API to request high-precision hardware location coordinates (GPS + Cell Tower).
- Define a background location update listener:
  LocationRequest locationRequest = LocationRequest.create()
          .setInterval(5000)
          .setFastestInterval(2000)
          .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
- Every time a new location coordinate is captured, inject it dynamically into the web page by executing JavaScript on the WebView:
  String jsCode = String.format("if(window.updateNativeLocation){ window.updateNativeLocation(%f, %f, %f); }", 
          location.getLatitude(), location.getLongitude(), location.getAccuracy());
  webView.post(() -> webView.evaluateJavascript(jsCode, null));

5. REQUIRED PERMISSIONS (AndroidManifest.xml):
- <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
- <uses-permission android:name="android.permission.WAKE_LOCK" />
- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
- <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
- <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

### 💻 COMPLETE MainActivity.java SOURCE CODE FOR ANDROID STUDIO:

You can copy and paste this complete Java file directly into your Android Studio project to establish both volume triggers and native GPS injection:

```java
package com.roadsos.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private static final int PERMISSION_REQUEST_CODE = 123;

    private boolean isVolumeUpPressed = false;
    private boolean isVolumeDownPressed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize WebView
        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                startLocationUpdates(); // start pushing hardware GPS when page loads
            }
        });

        // Load production URL (replace with your live Vercel link)
        webView.loadUrl("https://roadsos.vercel.app");

        // Initialize GPS client
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                for (Location location : locationResult.getLocations()) {
                    if (location != null) {
                        injectGPSToWeb(location);
                    }
                }
            }
        };

        checkPermissions();
    }

    private void injectGPSToWeb(Location location) {
        String js = String.format("if(window.updateNativeLocation){ window.updateNativeLocation(%f, %f, %f); }", 
                location.getLatitude(), location.getLongitude(), (float)location.getAccuracy());
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        LocationRequest locationRequest = LocationRequest.create()
                .setInterval(5000)
                .setFastestInterval(2000)
                .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, null);
    }

    private void checkPermissions() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, 
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 
                    PERMISSION_REQUEST_CODE);
        } else {
            startLocationUpdates();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startLocationUpdates();
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            isVolumeUpPressed = true;
        } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            isVolumeDownPressed = true;
        }

        if (isVolumeUpPressed && isVolumeDownPressed) {
            webView.post(() -> webView.evaluateJavascript("if(window.triggerSOSVolumeAlert){ window.triggerSOSVolumeAlert(); }", null));
            return true; 
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            isVolumeUpPressed = false;
        } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            isVolumeDownPressed = false;
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    protected void onPause() {
        super.onPause();
        fusedLocationClient.removeLocationUpdates(locationCallback);
    }

    @Override
    protected void onResume() {
        super.onResume();
        startLocationUpdates();
    }
}
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
