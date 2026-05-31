import { createContext, useContext, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi' },
];

const TRANSLATIONS = {
  en: {
    // App
    appName: 'RoadSOS',
    appSub: 'Emergency Response',
    // Nav
    navHome: 'Home',
    navMap: 'Map',
    navNumbers: 'Numbers',
    navFirstAid: 'First Aid',
    navMore: 'More',
    // SOS Button
    sosPress: 'PRESS TO ACTIVATE',
    sosTapAgain: 'TAP AGAIN\nTO CONFIRM',
    sosActivated: 'SOS ACTIVATED',
    sosAlerted: 'Emergency services have been alerted',
    sosQueued: '📡 SOS queued — will send when online',
    sosTriggerTip: '🔊 Press Volume Up + Volume Down together to send SOS',
    sosSent: '🆘 SOS triggered! Emergency services alerted.',
    // Status
    gpsLocked: '🟢 GPS Locked',
    gpsLoading: '⏳ Locking GPS...',
    gpsBlocked: '⚠️ GPS Blocked - Tap to Enable',
    offline: 'Offline',
    offlineBanner: '📡 Offline — SOS will queue when connection restored',
    // Map Page
    mapTitle: '🗺 Nearest Facilities',
    mapAcquiring: 'Acquiring GPS satellite lock…',
    mapSearching: 'Searching emergency facilities near you…',
    mapUpdated: 'Facilities updated successfully',
    mapOffline: 'You are offline — showing last known facilities',
    mapSlow: 'Servers slow — tap 🔄 to retry',
    mapNoResults: 'No facilities found nearby',
    mapRetry: '🔄 Retry Now',
    mapNavigate: '🗺 Navigate',
    mapCall: '📞 Call',
    mapAway: 'away',
    mapFacilities: 'Facilities Nearby',
    // Filters
    filterAll: 'All',
    filterHospital: 'Hospital',
    filterClinic: 'Clinic',
    filterPolice: 'Police',
    filterFire: 'Fire Station',
    filterPharmacy: 'Pharmacy',
    filterTowing: 'Towing / Mechanic',
    // Quick calls
    callAmbulance: 'Ambulance',
    callPolice: 'Police',
    callFire: 'Fire',
    callHighway: 'Highway',
    callEmergency: 'Emergency',
    // Buttons
    findFacilities: '🗺️ Find Nearest Facilities',
    callNow: '📞 CALL 108 NOW',
    cancelSOS: '✕ Cancel SOS',
    viewLocation: '📍 View My Location on Maps',
    gettingLocation: '📍 Getting location...',
    // Family
    familyTitle: '👨‍👩‍👧 Family & Friends',
    familySub: 'These contacts will receive email notifications in emergencies',
    // Chatbot
    chatTitle: '🤖 First Aid AI',
    // Settings
    settingsTitle: '⚙️ Settings',
    languageLabel: 'Language',
  },

  ta: {
    appName: 'RoadSOS',
    appSub: 'அவசர மறுமொழி',
    navHome: 'முகப்பு',
    navMap: 'வரைபடம்',
    navNumbers: 'எண்கள்',
    navFirstAid: 'முதலுதவி',
    navMore: 'மேலும்',
    sosPress: 'அழுத்தி செயல்படுத்தவும்',
    sosTapAgain: 'உறுதிப்படுத்த\nமீண்டும் தட்டவும்',
    sosActivated: 'SOS செயல்படுத்தப்பட்டது',
    sosAlerted: 'அவசர சேவைகள் அறிவிக்கப்பட்டன',
    sosQueued: '📡 SOS வரிசையில் உள்ளது — இணைப்பு வரும்போது அனுப்பப்படும்',
    sosTriggerTip: '🔊 SOS அனுப்ப Volume Up + Volume Down ஒரே நேரத்தில் அழுத்தவும்',
    sosSent: '🆘 SOS தூண்டப்பட்டது! அவசர சேவைகள் அறிவிக்கப்பட்டன.',
    gpsLocked: '🟢 GPS பூட்டப்பட்டது',
    gpsLoading: '⏳ GPS தேடுகிறது...',
    gpsBlocked: '⚠️ GPS தடுக்கப்பட்டது - இயக்க தட்டவும்',
    offline: 'இணைப்பில்லை',
    offlineBanner: '📡 இணைப்பில்லை — இணைப்பு வரும்போது SOS அனுப்பப்படும்',
    mapTitle: '🗺 அருகிலுள்ள வசதிகள்',
    mapAcquiring: 'GPS சிக்னல் பெறுகிறது…',
    mapSearching: 'அருகிலுள்ள அவசர வசதிகள் தேடுகிறது…',
    mapUpdated: 'வசதிகள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன',
    mapOffline: 'இணைப்பில்லை — கடைசியாக அறியப்பட்ட வசதிகள் காட்டப்படுகின்றன',
    mapSlow: 'சேவையகம் மெதுவாக உள்ளது — 🔄 மீண்டும் முயற்சிக்கவும்',
    mapNoResults: 'அருகில் வசதிகள் இல்லை',
    mapRetry: '🔄 மீண்டும் முயற்சி',
    mapNavigate: '🗺 வழிசெலுத்தல்',
    mapCall: '📞 அழைக்க',
    mapAway: 'தூரத்தில்',
    mapFacilities: 'அருகிலுள்ள வசதிகள்',
    filterAll: 'அனைத்தும்',
    filterHospital: 'மருத்துவமனை',
    filterClinic: 'கிளினிக்',
    filterPolice: 'காவல்துறை',
    filterFire: 'தீயணைப்பு',
    filterPharmacy: 'மருந்தகம்',
    filterTowing: 'இழுவை / மெக்கானிக்',
    callAmbulance: 'ஆம்புலன்ஸ்',
    callPolice: 'காவல்துறை',
    callFire: 'தீயணைப்பு',
    callHighway: 'நெடுஞ்சாலை',
    callEmergency: 'அவசரநிலை',
    findFacilities: '🗺️ அருகிலுள்ள வசதிகள் கண்டறிக',
    callNow: '📞 இப்போது 108 அழைக்கவும்',
    cancelSOS: '✕ SOS ரத்துசெய்',
    viewLocation: '📍 வரைபடத்தில் என் இருப்பிடம்',
    gettingLocation: '📍 இருப்பிடம் பெறுகிறது...',
    familyTitle: '👨‍👩‍👧 குடும்பம் & நண்பர்கள்',
    familySub: 'இந்த தொடர்புகள் அவசர நிலையில் மின்னஞ்சல் பெறுவார்கள்',
    chatTitle: '🤖 முதலுதவி AI',
    settingsTitle: '⚙️ அமைப்புகள்',
    languageLabel: 'மொழி',
  },

  hi: {
    appName: 'RoadSOS',
    appSub: 'आपातकालीन प्रतिक्रिया',
    navHome: 'होम',
    navMap: 'नक्शा',
    navNumbers: 'नंबर',
    navFirstAid: 'प्राथमिक चिकित्सा',
    navMore: 'अधिक',
    sosPress: 'सक्रिय करने के लिए दबाएं',
    sosTapAgain: 'पुष्टि करने के लिए\nफिर टैप करें',
    sosActivated: 'SOS सक्रिय हुआ',
    sosAlerted: 'आपातकालीन सेवाओं को सूचित किया गया',
    sosQueued: '📡 SOS कतार में है — कनेक्शन आने पर भेजा जाएगा',
    sosTriggerTip: '🔊 SOS भेजने के लिए Volume Up + Volume Down एक साथ दबाएं',
    sosSent: '🆘 SOS सक्रिय! आपातकालीन सेवाओं को सूचित किया गया।',
    gpsLocked: '🟢 GPS लॉक हो गया',
    gpsLoading: '⏳ GPS खोज रहा है...',
    gpsBlocked: '⚠️ GPS अवरुद्ध - सक्षम करने के लिए टैप करें',
    offline: 'ऑफलाइन',
    offlineBanner: '📡 ऑफलाइन — कनेक्शन होने पर SOS भेजा जाएगा',
    mapTitle: '🗺 निकटतम सुविधाएं',
    mapAcquiring: 'GPS सिग्नल प्राप्त हो रहा है…',
    mapSearching: 'आपके पास आपातकालीन सुविधाएं खोज रहे हैं…',
    mapUpdated: 'सुविधाएं सफलतापूर्वक अपडेट हुईं',
    mapOffline: 'ऑफलाइन — अंतिम ज्ञात सुविधाएं दिखाई जा रही हैं',
    mapSlow: 'सर्वर धीमा है — 🔄 पुनः प्रयास करें',
    mapNoResults: 'पास में कोई सुविधा नहीं मिली',
    mapRetry: '🔄 पुनः प्रयास',
    mapNavigate: '🗺 नेविगेट',
    mapCall: '📞 कॉल करें',
    mapAway: 'दूर',
    mapFacilities: 'पास की सुविधाएं',
    filterAll: 'सभी',
    filterHospital: 'अस्पताल',
    filterClinic: 'क्लीनिक',
    filterPolice: 'पुलिस',
    filterFire: 'अग्निशमन',
    filterPharmacy: 'फार्मेसी',
    filterTowing: 'टोइंग / मैकेनिक',
    callAmbulance: 'एम्बुलेंस',
    callPolice: 'पुलिस',
    callFire: 'अग्निशमन',
    callHighway: 'राजमार्ग',
    callEmergency: 'आपातकाल',
    findFacilities: '🗺️ निकटतम सुविधाएं खोजें',
    callNow: '📞 अभी 108 कॉल करें',
    cancelSOS: '✕ SOS रद्द करें',
    viewLocation: '📍 मानचित्र पर मेरा स्थान देखें',
    gettingLocation: '📍 स्थान प्राप्त हो रहा है...',
    familyTitle: '👨‍👩‍👧 परिवार और मित्र',
    familySub: 'इन संपर्कों को आपात स्थिति में ईमेल अलर्ट मिलेगा',
    chatTitle: '🤖 प्राथमिक चिकित्सा AI',
    settingsTitle: '⚙️ सेटिंग्स',
    languageLabel: 'भाषा',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('roadsos_lang') || 'en');

  function switchLang(code) {
    setLang(code);
    localStorage.setItem('roadsos_lang', code);
  }

  function t(key) {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en'][key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
