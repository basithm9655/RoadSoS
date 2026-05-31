import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import FamilyPage from './pages/FamilyPage';
import EmergencyNumbers from './pages/EmergencyNumbers';
import CommunityPage from './pages/CommunityPage';
import ChatbotPage from './pages/ChatbotPage';
import CrowdRescuePage from './pages/CrowdRescuePage';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import SettingsPage from './pages/SettingsPage';
import MorePage from './pages/MorePage';
import { useGeolocation } from './hooks/useGeolocation';

function SilentLocationRequester({ children }) {
  // Mount the geolocation hook so that browser location permissions are requested silently.
  // There is no blocking screen. The user immediately lands on the Home Screen.
  useGeolocation();
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="app-shell">
              <SilentLocationRequester>
                <div className="app-content">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/family" element={<FamilyPage />} />
                    <Route path="/numbers" element={<EmergencyNumbers />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/chatbot" element={<ChatbotPage />} />
                    <Route path="/crowd-rescue" element={<CrowdRescuePage />} />
                    <Route path="/ambulance-dashboard" element={<AmbulanceDashboard />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/more" element={<MorePage />} />
                  </Routes>
                </div>
                <BottomNav />
              </SilentLocationRequester>
            </div>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
