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

/**
 * 📱 Native Android MainActivity wrapper for RoadSOS PWA
 * Intercepts simultaneous Volume Up + Volume Down hardware clicks to trigger instant SOS alerts
 * Acquires native high-accuracy GPS coordinates and injects them to Web view.
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private static final int PERMISSION_REQUEST_CODE = 123;

    // Track states of both volume keys to detect simultaneous press
    private boolean isVolumeUpPressed = false;
    private boolean isVolumeDownPressed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize WebView settings
        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                startLocationUpdates(); // start pushing native GPS when page finishes loading
            }
        });

        // Load Vercel Production Web URL
        webView.loadUrl("https://roadsos.vercel.app");

        // Initialize Hardware Fused GPS client
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
        // Stringify values safely to avoid local decimal formatting discrepancies
        String js = String.format("if(window.updateNativeLocation){ window.updateNativeLocation(%f, %f, %f); }", 
                location.getLatitude(), location.getLongitude(), (float)location.getAccuracy());
        
        // Push coordinate payloads to Web PWA instantly on the main thread
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

    // Detect hardware Volume Up and Volume Down buttons being pressed together
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            isVolumeUpPressed = true;
        } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            isVolumeDownPressed = true;
        }

        if (isVolumeUpPressed && isVolumeDownPressed) {
            // Signal PWA to trigger its volume press pattern counter
            webView.post(() -> webView.evaluateJavascript("if(window.triggerSOSVolumeAlert){ window.triggerSOSVolumeAlert(); }", null));
            return true; // Consume volume keys to prevent volume overlay popup
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
