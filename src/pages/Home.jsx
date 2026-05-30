import SOSButton from '../components/SOSButton';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function Home() {
  const { isOnline } = useOfflineQueue();

  return (
    <div className="page home-page">
      <div className="home-header">
        <div className="home-logo">
          <span className="logo-icon">🚨</span>
          <div>
            <h1 className="logo-title">RoadSOS</h1>
            <p className="logo-sub">Emergency Response</p>
          </div>
        </div>
        {!isOnline && (
          <div className="offline-chip">📡 Offline</div>
        )}
      </div>

      <SOSButton />

      <div className="home-tip">
        <p>🔊 Press volume down 3 times in lock screen to send SOS</p>
      </div>
    </div>
  );
}
