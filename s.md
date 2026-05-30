so now i am creating a web also app from first  with a  big sos button . completly mobile friendly . so in thisapp  a big sos button , then showing ambulance , police , fire and rescue, highway help,unified  emergency . user friendly . also NEAREST

FACILITIEs.  also using api like OpenStreetMap + Overpass API



Free forever.



Get:



Hospitals

Clinics

Police stations

Fire stations

Ambulance locations (if mapped)

https://overpass-api.de/api/interpreter



[out:json];

(

  node["amenity"="hospital"](around:5000,11.0168,76.9558);

);

out;



and 



🚓 Police Stations



Use Overpass API.



Query:



node["amenity"="police"]



and



🚑 Ambulance Numbers

Government Emergency



Store:



{

  "ambulance": "108",

  "police": "100",

  "emergency": "112"

}

.    also add page to add family and friend number adding page . so when we click sos the family will get . then full page family alarm .also google assistant conncet . also a first aid community  like (nurse , doctor ). also a page for all emergency number dislpay page . crowd rescue network (to send 500m alert with location . so they know with location .). with ai chatbot (with asking question for first aid ). for now we using google sheet as data base for first aid community . also when i click the volume down button three time the sos will trigger . also work in lock screen . also here we added a new feature we need to click two time on sos for the automation (to avoid accidental click ) so when they click ones the button will hightlight as big also marked as clcik again to confirm . if iclick again it will change into call 108 i i clciked the call for 108 will gone . also in this app the ambulanace login need. so when the victim will click the sos the nearby ambulance app will notified . Emergency Control Dashboard

When SOS pressed:

Victim
↓
RoadSoS Server
↓
Family Alert
↓
Volunteer Alert
↓
Nearby Ambulance Network

For demo:

You create your own ambulance panel.

Example:

SOS Received

Victim:
John

Location:
PSG College

Distance:
2.1 km

[Accept]
[Navigate].  also offline support like store the sos with time sow waiting for coonction when the internet araive it works . 





You are building RoadSOS — a full-featured mobile-first emergency PWA (Progressive Web App) with React + Vite + Firebase. Build the COMPLETE app with ALL features below. No placeholders, no "TODO" comments. Every feature must be fully functional.

=== TECH STACK ===
- React 18 + Vite (PWA with vite-plugin-pwa)
- Firebase: Auth (anonymous + email), Firestore, FCM (push notifications), Firebase Hosting
- Overpass API (https://overpass-api.de/api/interpreter) — free, no key needed
- OpenStreetMap for map tiles (Leaflet.js)
- Google Sheets API v4 (for first aid community directory)
- Anthropic Claude API (claude-sonnet-4-20250514) for AI first aid chatbot
- Service Worker with Workbox (offline support + background sync)
- Android: use MediaButtonReceiver for volume button detection
  iOS: use iOS Shortcuts + Back Tap shortcut workaround (document both)

=== FIREBASE COLLECTIONS ===
users/{uid}           → { name, phone, fcmToken, familyContacts: [{name,phone}], role: "user"|"ambulance"|"volunteer" }
sos_events/{id}       → { uid, userName, lat, lon, timestamp, status: "pending"|"accepted"|"resolved", acceptedBy }
ambulances/{uid}      → { name, phone, lat, lon, available: bool, fcmToken }
volunteers/{uid}      → { name, phone, lat, lon, fcmToken }
offline_queue/{id}    → { type: "sos", payload, createdAt }

=== PAGE STRUCTURE (React Router) ===
/ → Home (SOS button + quick call buttons)
/map → Nearest Facilities map
/family → Family & Friends contacts
/emergency-numbers → All emergency numbers directory
/community → First Aid Community (nurse/doctor directory from Google Sheets)
/chatbot → AI First Aid Chatbot
/crowd-rescue → Crowd Rescue Network
/ambulance-dashboard → Ambulance login + panel
/settings → App settings

=== FEATURE 1: SOS BUTTON (HOME PAGE) ===
- Giant red pulsing SOS button centered on screen — mobile-friendly, takes 60% of viewport width
- TWO-TAP CONFIRMATION to avoid accidental trigger:
  Tap 1: button enlarges, turns bright orange, shows "TAP AGAIN TO CONFIRM" text
  Tap 2: triggers full SOS sequence
- After confirmation → show "CALLING 108" button prominently
- SOS trigger sequence:
  1. Get GPS coords (navigator.geolocation)
  2. Write to Firestore sos_events
  3. Send FCM push to all family contacts stored in users/{uid}.familyContacts
  4. Send FCM push to all volunteers within 500m (query Firestore for nearby volunteers)
  5. Send FCM push to available ambulances sorted by distance
  6. If offline: store in IndexedDB offline_queue, sync when online (Background Sync API)
- Show quick call buttons below SOS: Ambulance (108), Police (100), Fire (101), Highway (1033), Unified Emergency (112)
- Each call button opens tel: link directly

=== FEATURE 2: VOLUME BUTTON TRIGGER ===
- Detect volume-down button pressed 3 times within 2 seconds → trigger SOS automatically
- Use MediaSession API + keydown event listener on Android
- On iOS: document instructions for creating iOS Shortcut with Back Tap
- Works when app is in foreground; for background/lock screen use Android Accessibility Service (document the setup)
- Show a small floating indicator when volume-trigger mode is armed

=== FEATURE 3: NEAREST FACILITIES MAP ===
- Use Leaflet.js with OpenStreetMap tiles
- Get user GPS location
- Query Overpass API for these in parallel (5km radius):
  Hospitals: node["amenity"="hospital"](around:5000,LAT,LON)
  Clinics: node["amenity"="clinic"](around:5000,LAT,LON)
  Police: node["amenity"="police"](around:5000,LAT,LON)
  Fire stations: node["amenity"="fire_station"](around:5000,LAT,LON)
  Pharmacies: node["amenity"="pharmacy"](around:5000,LAT,LON)
- Show colored markers (red=hospital, blue=police, orange=fire, green=clinic)
- Clicking marker shows: name, distance from user, "Call" button (if phone in OSM data), "Navigate" button (opens Google Maps directions)
- Show list view below map sorted by distance
- Cache last results in localStorage for offline viewing

=== FEATURE 4: EMERGENCY NUMBERS PAGE ===
Display styled cards for ALL Indian emergency numbers:
- Ambulance: 108
- Police: 100
- Fire: 101
- Highway Help: 1033
- Unified Emergency: 112
- Women Helpline: 1091
- Child Helpline: 1098
- Disaster Management: 1078
- Coast Guard: 1554
- Railway Police: 1512
- Anti-Poison: 1066
- Mental Health (iCall): 9152987821
- Blood Bank: 104
Each card has a large CALL button that opens tel: link.

=== FEATURE 5: FAMILY & FRIENDS PAGE ===
- Add/edit/delete family contacts (name + phone number)
- Store in Firestore users/{uid}.familyContacts array
- Show list of saved contacts with edit/delete options
- "Test Alert" button — sends a test FCM notification to all saved contacts
- When SOS is triggered, all contacts receive FCM push notification with message:
  "[User Name] has triggered an SOS! Location: [Google Maps link with lat/lon]. Time: [timestamp]. Please respond immediately."
- Full-screen alarm UI when receiving family SOS: red flashing screen, loud alarm sound (Web Audio API), victim name + location link, "I'm Responding" dismiss button

=== FEATURE 6: CROWD RESCUE NETWORK ===
- Users can register as volunteers (toggle in settings)
- When SOS triggered: query Firestore for all volunteers with lat/lon within 500m using geohash queries
- Send FCM push to all nearby volunteers with: victim name, distance, Google Maps link
- Volunteer receives push → opens app → sees map with victim pin + "I'm on my way" button
- Show live count of responders en route on SOS screen
- Use geohash library (ngeohash npm package) for efficient geo queries

=== FEATURE 7: FIRST AID COMMUNITY PAGE ===
- Directory of nurses and doctors who volunteered
- Data source: Google Sheet (public, read-only via Google Sheets API v4)
  Sheet columns: Name, Role (nurse/doctor), Phone, Area, Available (yes/no)
- Display as cards with: name, role badge, area, availability indicator, CALL button
- Search/filter by role and area
- "Join Community" button → opens a Google Form link to register
- Cache in localStorage, refresh on page load

=== FEATURE 8: AI FIRST AID CHATBOT ===
- Full chat UI (messages bubble style, mobile-friendly)
- Powered by Anthropic API (claude-sonnet-4-20250514)
- System prompt: "You are RoadSOS First Aid Assistant. You help users with emergency first aid guidance. Ask clarifying questions about the emergency situation. Provide step-by-step first aid instructions. Always remind users to call 108 for professional help. Be calm, clear, and concise. Do not provide diagnosis."
- Suggested quick prompts shown before chat starts:
  "Someone is unconscious"
  "Heavy bleeding"
  "Suspected fracture"
  "Heart attack symptoms"
  "Burns"
  "Choking"
- Each quick prompt auto-sends to chatbot
- Show typing indicator while waiting for response
- Chat history stored in component state (not persisted)

=== FEATURE 9: AMBULANCE PANEL ===
Login page for ambulance drivers (separate from user login).
After login:
- Driver sees live SOS alerts in real-time (Firestore onSnapshot listener)
- Each alert card shows:
  Victim name
  Location (address if possible via reverse geocode, else lat/lon)
  Distance from driver (calculated using Haversine formula)
  Time elapsed since SOS (live counter: "2 min 34 sec ago")
  [Accept] button → marks sos_events status = "accepted", sets acceptedBy = driver uid
  [Navigate] button → opens Google Maps with victim coords
- Driver's own location updated to Firestore every 30 seconds (background geolocation)
- Only shows "pending" SOS events
- Driver availability toggle (Available / Busy)

=== FEATURE 10: OFFLINE SUPPORT ===
- Service Worker (Workbox) caches: app shell, emergency numbers page, last known facility list
- When SOS triggered offline:
  Store in IndexedDB: { type:"sos", lat, lon, timestamp, userId }
  Show "SOS queued — will send when connected"
  Background Sync API: sync tag "sos-sync" → sends when connection restored
- Detect online/offline via navigator.onLine + online/offline events
- Show persistent banner "You are offline — SOS will queue" when offline
- Family contacts list cached in localStorage

=== FEATURE 11: GOOGLE ASSISTANT INTEGRATION ===
- Register app as Android App Action with BII: actions.intent.CALL_EMERGENCY_HELPLINE
- Add shortcuts.xml in Android wrapper (document setup for Capacitor/TWA wrapper)
- User can say "Hey Google, open RoadSOS SOS" → triggers SOS flow
- Document the App Actions console registration steps

=== FEATURE 12: LOCK SCREEN SOS ===
Android:
- Document Accessibility Service setup for volume button detection in background
- Provide AccessibilityService XML config
- Explain how to package as TWA (Trusted Web Activity) + native Android wrapper
iOS:
- Document Back Tap shortcut setup (Settings → Accessibility → Touch → Back Tap)
- Provide iOS Shortcut file instructions to trigger the PWA SOS URL scheme

=== SETTINGS PAGE ===
- Toggle: Register as volunteer (saves to Firestore)
- Ambulance driver mode link
- Notification permission request button
- Test notification button
- App version info
- Link to Google Form for community registration

=== UI / UX REQUIREMENTS ===
- Mobile-first, works on 375px wide screens
- Dark mode support (CSS variables)
- Bottom navigation bar: Home | Map | Community | Chatbot | More
- Home screen shows: SOS button (top, large), Quick call buttons row, Offline status banner
- Color scheme: Emergency red (#E53935) for SOS, dark navy background (#0A0E1A) for main
- Pulsing animation on SOS button (CSS keyframes)
- All touch targets minimum 48px height
- Loading skeletons for map and community pages
- Toast notifications for actions (saved, sent, etc.)

=== FOLDER STRUCTURE ===
src/
  components/
    SOSButton.jsx
    QuickCallBar.jsx
    FamilyAlarm.jsx  (full-screen alarm component)
    ChatMessage.jsx
    FacilityCard.jsx
    AmbulanceCard.jsx
  pages/
    Home.jsx
    MapPage.jsx
    FamilyPage.jsx
    EmergencyNumbers.jsx
    CommunityPage.jsx
    ChatbotPage.jsx
    CrowdRescuePage.jsx
    AmbulanceDashboard.jsx
    SettingsPage.jsx
  hooks/
    useGeolocation.js
    useFirestore.js
    useOfflineQueue.js
    useVolumeButton.js
  utils/
    overpassQuery.js
    haversine.js
    geohash.js
    firebaseHelpers.js
    emergencyNumbers.js
  firebase.js   (Firebase init)


  

Build a complete, production-ready **RoadSOS Emergency Response Web App** — a mobile-first Progressive Web App (PWA) with offline support. Use **React + Tailwind CSS** (single JSX file). No backend required for MVP — use Google Sheets as DB, Overpass API for maps, and Anthropic Claude API for AI chatbot.

---

## 🎨 Design System
- Deep red `#C0392B` primary, white, dark gray
- Large tap targets (min 56px)
- Bottom nav bar (mobile)
- Smooth animations, haptic-feel buttons
- Inter font, bold headings

---

## 📱 Pages / Screens

### 1. 🏠 Home Screen
- Giant pulsing **SOS button** (center, 180px diameter, red with white text)
- **Double-tap to confirm** logic:
  - First tap → button expands, glows, shows "TAP AGAIN TO CONFIRM"
  - Second tap → triggers full SOS flow + shows "CALL 108" button
  - If "CALL 108" dismissed → returns to normal
- Below SOS: icon grid — Ambulance (108), Police (100), Fire & Rescue (101), Highway Help (1033), Unified Emergency (112)
- Each icon opens a call confirmation modal
- Bottom nav: Home | Nearby | Family | Community | Dashboard

### 2. 📍 Nearest Facilities (Overpass API)
- On load: get user GPS
- Query Overpass API (`https://overpass-api.de/api/interpreter`) for within 5km:
  - `node["amenity"="hospital"]`
  - `node["amenity"="clinic"]`
  - `node["amenity"="police"]`
  - `node["amenity"="fire_station"]`
- Show results as cards: name, distance, "Call" + "Navigate" (opens Google Maps)
- Filter tabs: All | Hospital | Police | Fire
- Show loading skeleton while fetching

### 3. 👨‍👩‍👧 Family & Friends
- Add contacts: Name, Phone, Relation
- Store in localStorage
- On SOS trigger: show "Alerting family..." with simulated SMS/WhatsApp deep link (`https://wa.me/91XXXXXXXXXX?text=SOS+I+need+help+My+location:+[lat,lng]`)
- Full-screen **FAMILY ALARM** overlay — red flashing screen, siren icon, "SOS ACTIVATED" — shows all family members being notified

### 4. 🚑 Emergency Numbers Directory
- Full page list of all Indian emergency numbers:
  - National Emergency: 112
  - Ambulance: 108
  - Police: 100
  - Fire: 101
  - Highway: 1033
  - Women Helpline: 1091
  - Child Helpline: 1098
  - Disaster: 1078
  - Poison Control: 1800-11-6117
  - Coast Guard: 1554
  - Railway: 139
  - Blood Bank: 104
  - And 10+ more
- Each card has a direct Call button

### 5. 🤝 First Aid Community (Google Sheets DB)
- Google Sheets used as backend (via published CSV URL)
- List volunteer helpers: Name, Role (Doctor/Nurse/Paramedic), Area, Phone
- Filter by role
- "Join as Volunteer" form → submits via Google Forms embed or `fetch` POST to Apps Script webhook
- Show volunteer cards with distance (mock or GPS-based)

### 6. 🌐 Crowd Rescue Network
- On activation: show map (Leaflet.js via CDN)
- Send alert to everyone within 500m (simulated with localStorage broadcast + BroadcastChannel API)
- Show "RESCUE ALERT SENT" with victim's location link
- Nearby volunteers see a notification card:  
  `⚠️ SOS Alert — John Doe — PSG College — 0.3 km away — [Navigate]`

### 7. 🚑 Ambulance Panel (Login)
- Simple PIN login (1234 for demo)
- Dashboard shows incoming SOS requests:
  - Victim name, location, time of SOS
  - Distance (mock 2.1 km)
  - [Accept] → shows navigation link
  - [Navigate] → opens Google Maps directions
- Real-time feel with polling every 5s from localStorage

### 8. 🤖 AI First Aid Chatbot
- Uses Anthropic Claude API (`claude-sonnet-4-20250514`)
- System prompt: "You are a certified first aid assistant. Ask one question at a time to diagnose the emergency. Give step-by-step first aid instructions. Be calm, clear, and concise."
- Chat UI: bubbles, send button, quick-reply chips (Bleeding, Burn, Choking, Fracture, Heart Attack, Unconscious)
- Floating chat button (💬) on Home screen

### 9. 📊 Emergency Control Dashboard
- Shows SOS event log
- Each event: Victim, Location, Time, Status (Pending/Accepted/Resolved)
- Family alert status, Volunteer alert status, Ambulance status
- Visual pipeline:  
  `Victim → RoadSOS → Family Alert → Volunteer Alert → Ambulance Network`

---

## ⚙️ Core Features & Logic

### SOS Trigger Sources:
1. Double-tap SOS button on screen
2. **Volume Down × 3** — listen via `MediaSession` API or keyboard shortcut simulation
3. **Lock screen support** — register as PWA, use `beforeinstallprompt`, show persistent notification via Service Worker

### Offline Support:
- Cache app shell with Service Worker
- Queue SOS events in IndexedDB when offline
- On reconnect: sync pending SOS (log to console / localStorage)
- Show "Offline Mode" banner

### Location:
- Use `navigator.geolocation.getCurrentPosition`
- Reverse geocode with Nominatim (`https://nominatim.openstreetmap.org/reverse`)
- Store last known location in localStorage for offline fallback

### Google Assistant Integration:
- Add Web App Manifest with shortcuts
- Include `<meta name="google-assistant-web-action">` tags
- Deep link: `roadsos://sos` for assistant trigger

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| UI | React + Tailwind (CDN) |
| Maps | Leaflet.js (CDN) |
| POI Data | Overpass API |
| Geocoding | Nominatim |
| AI Chatbot | Anthropic Claude API |
| Community DB | Google Sheets (published CSV) |
| Offline | Service Worker + IndexedDB |
| State | React useState/useEffect/useContext |
| Storage | localStorage + IndexedDB |

---

## 📦 Output Requirements
- Single HTML file OR single React JSX artifact
- All CSS via Tailwind CDN classes
- Leaflet via CDN script tag
- Mobile viewport meta tags
- PWA manifest inline
- Service worker registered inline via blob URL
- No build step required — runs in browser directly
- Anthropic API key field in Settings page (stored in localStorage)

---

**Make it beautiful, fast, and fully functional. Prioritize mobile UX. Use red/white color scheme. Make the SOS button the hero element. Every screen should feel like a real emergency app.**

-