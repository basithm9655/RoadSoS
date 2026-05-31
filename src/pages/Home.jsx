import SOSButton from '../components/SOSButton';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useLang, LANGUAGES } from '../context/LanguageContext';

export default function Home() {
  const { isOnline } = useOfflineQueue();
  const { t, lang, switchLang } = useLang();

  return (
    <div className="page home-page">
      <div className="home-header">
        <div className="home-logo">
          <span className="logo-icon">🚨</span>
          <div>
            <h1 className="logo-title">{t('appName')}</h1>
            <p className="logo-sub">{t('appSub')}</p>
          </div>
        </div>
        <div className="home-header-right">
          {!isOnline && (
            <div className="offline-chip">📡 {t('offline')}</div>
          )}
          {/* Language Switcher */}
          <div className="lang-switcher">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`lang-btn ${lang === l.code ? 'lang-btn-active' : ''}`}
                onClick={() => switchLang(l.code)}
                aria-label={`Switch to ${l.name}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SOSButton />

      <div className="home-tip">
        <p>{t('sosTriggerTip')}</p>
      </div>
    </div>
  );
}
