import { useState, useEffect, useRef } from 'react';

/**
 * Detects 3 volume-down presses within 2 seconds.
 * Uses keyboard shortcut simulation (PageDown key maps to volume on some browsers).
 * Also listens for MediaSession action workarounds.
 * @param {Function} onTrigger - callback when SOS volume pattern detected
 * @param {boolean} enabled
 */
export function useVolumeButton(onTrigger, enabled = true) {
  const pressTimestamps = useRef([]);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setArmed(true);

    const handleKey = (e) => {
      const keyName = e.key ? e.key.toLowerCase() : '';
      // Support all standard hardware key down events for volume keys
      if (
        keyName === 'audiovolumedown' ||
        keyName === 'volumedown' ||
        e.key === 'PageDown' ||
        e.keyCode === 182 ||
        e.keyCode === 25
      ) {
        const now = Date.now();
        pressTimestamps.current = [...pressTimestamps.current, now].filter(t => now - t < 3500);
        if (pressTimestamps.current.length >= 3) {
          pressTimestamps.current = [];
          onTrigger && onTrigger();
        }
      }
    };

    // Global handler for native Android wrapper APK to inject physical Volume Up + Down combo presses instantly
    window.triggerSOSVolumeAlert = () => {
      console.log('[Native Volume Signal] Instant emergency trigger received.');
      onTrigger && onTrigger(); // Trigger SOS instantly!
    };

    // MediaSession hack — intercept seekbackward / previoustrack as volume substitute
    if ('mediaSession' in navigator) {
      try {
        const handleMediaAction = () => {
          const now = Date.now();
          pressTimestamps.current = [...pressTimestamps.current, now].filter(t => now - t < 3500);
          if (pressTimestamps.current.length >= 3) {
            pressTimestamps.current = [];
            onTrigger && onTrigger();
          }
        };

        navigator.mediaSession.setActionHandler('seekbackward', handleMediaAction);
        navigator.mediaSession.setActionHandler('previoustrack', handleMediaAction);
      } catch (_) {}
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      delete window.triggerSOSVolumeAlert;
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
        } catch (_) {}
      }
      setArmed(false);
    };
  }, [onTrigger, enabled]);

  return { armed };
}
