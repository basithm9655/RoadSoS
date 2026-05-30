# 🚨 RoadSOS — Emergency Response PWA

RoadSOS is a state-of-the-art, mobile-first Progressive Web App (PWA) designed to provide instant response and first aid support during road accidents and emergencies.

---

## 🛠️ Complete Tech Stack
* **UI Framework**: React 18 + Vite (configured for responsive standalone PWA deployment)
* **Styling**: Sleek custom premium CSS variables with native dark-navy theme (`#0A0E1A`) & emergency red (`#E53935`)
* **Database & Auth**: Firebase Auth (Anonymous + Email), Firestore, and FCM
* **Mapping**: Leaflet.js with OpenStreetMap CDN tiles (no API keys required)
* **Point of Interest Data**: Overpass API for parallel, real-time emergency facility lookup
* **Reverse Geocoding**: Nominatim OpenStreetMap Geocoder
* **AI Engine**: Anthropic Claude API (`claude-sonnet-4-5`) for the first aid guidance chatbot
* **Service Worker**: Workbox with runtime caching, IndexedDB backup queuing, and online-offline synchronization

---

## ⚙️ Core Feature Implementations

### 1. Two-Tap Pulsing SOS Button
* Prominently centered 60% viewport button with rich CSS keyframe pulsing animations.
* **Double-tap trigger system**:
  * **Tap 1**: Button enlarges, turns orange, glows, and displays `"TAP AGAIN TO CONFIRM"`.
  * **Tap 2**: Triggers full sequence (captures GPS, writes to Firestore, triggers WhatsApp alerts, alerts volunteers, notifies ambulances, and starts flashing visual/audio alarms).
  * Automatically reverts back to idle if not tapped again within 4 seconds.

### 2. Silent Hardware Button SOS Trigger
* **Android**: Uses keydown event listeners (`AudioVolumeDown` / `PageDown`) and MediaSession API workarounds.
  * Intercepts 3 quick volume-down keypresses within 2 seconds to auto-trigger SOS.
* **iOS**: Setup manual Back Tap triggering:
  1. Open iOS **Shortcuts** app.
  2. Create a new shortcut titled "Trigger RoadSOS".
  3. Add the action **Open URLs** and enter your hosted web app URL: `https://your-domain.com/?action=sos`
  4. Go to **Settings** → **Accessibility** → **Touch** → **Back Tap**.
  5. Choose **Double Tap** or **Triple Tap** and select your newly created "Trigger RoadSOS" shortcut.

### 3. Lock Screen / Background SOS Integration
* **Android Accessibility Service**:
  To enable volume trigger operation in the background or lock screen, bundle the PWA into a native Android wrapper using **Capacitor** or **TWA (Trusted Web Activity)** and include this AccessibilityService configuration:
  ```xml
  <!-- res/xml/accessibility_service_config.xml -->
  <accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
      android:accessibilityEventTypes="typeAllMask"
      android:accessibilityFeedbackType="feedbackGeneric"
      android:accessibilityFlags="flagRequestFilterKeyEvents"
      android:canRequestFilterKeyEvents="true"
      android:description="@string/accessibility_description" />
  ```
  And listen for volume events in your java/kotlin main activity to dispatch a local broadcast or deep-link to the PWA.

### 4. Google Assistant Voice Integration
* Register the app in the Google Actions Console with standard Built-In Intent (BII):
  * **BII**: `actions.intent.CALL_EMERGENCY_HELPLINE`
  * Add the following Assistant Web Action meta tag to the HTML header (already included in `index.html`):
    ```html
    <meta name="google-assistant-web-action" content="true">
    ```
  * Users can say: *"Hey Google, open RoadSOS"* to launch the application and immediately queue or trigger the SOS workflow.

### 5. Nearest Facilities Map
* Queries Overpass API in parallel for **Hospitals, Clinics, Police stations, Fire stations, and Pharmacies** within a 5km radius of the user's GPS coordinates.
* Renders custom Leaflet.js HTML markers with distinct theme colors and icons.
* Lists facilities sorted by Haversine distance with navigation & direct calling links.

### 6. First Aid AI Chatbot
* Connects directly to the Anthropic Claude API.
* Fully armed system prompt instructing the model to remain calm, give concise numbered steps, ask one clarifying question at a time, and persistently advise the user to call 108.

### 7. Google Sheets Community Directory
* Serves volunteer directory data directly from a public published Google Sheets CSV endpoint.
* Caches volunteer names, areas, roles, and availability in localStorage for instant loading.

---

## 🚀 Getting Started Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Build the production application (compiles the standalone service worker & assets):
   ```bash
   npm run build
   ```
