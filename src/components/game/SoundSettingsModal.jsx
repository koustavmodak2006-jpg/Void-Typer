import { useEffect } from 'react';
import { X, Volume2, Music, Zap, MousePointerClick } from 'lucide-react';
import { useAudioSettings } from '../../hooks/useAudio.js';
import { audio } from '../../game/audioEngine.js';

/**
 * Sound settings modal — master toggle, music toggle, SFX volume.
 * Preferences persist in localStorage. Audio starts only after user
 * interaction (autoplay-safe).
 */
export default function SoundSettingsModal({ onClose }) {
  const { settings, setEnabled, setMusic, setVolume } = useAudioSettings();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const testSound = () => {
    audio.unlock();
    audio.playLaser();
    setTimeout(() => audio.playExplosion(), 220);
  };

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Sound settings">
      <div className="vt-modal vt-panel vt-corners">
        <div className="vt-modal__header">
          <h2 className="vt-modal__title">
            <Volume2 size={17} style={{ marginRight: 8, verticalAlign: -3 }} />
            Audio Systems
          </h2>
          <button type="button" className="vt-modal__close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="vt-modal__body">
          <div className="vt-setting-row">
            <div className="vt-setting-row__info">
              <div className="vt-setting-row__name">Master Audio</div>
              <div className="vt-setting-row__hint">Silences the entire ship when off</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Master audio"
              className="vt-switch"
              onClick={() => setEnabled(!settings.enabled)}
            />
          </div>

          <div className="vt-setting-row">
            <div className="vt-setting-row__info">
              <div className="vt-setting-row__name">
                <Music size={13} style={{ marginRight: 7, verticalAlign: -2 }} />
                Space Ambience
              </div>
              <div className="vt-setting-row__hint">Synthesized background drone — no files, no network</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled && settings.music}
              aria-label="Background music"
              className="vt-switch"
              disabled={!settings.enabled}
              style={{ opacity: settings.enabled ? 1 : 0.4 }}
              onClick={() => setMusic(!settings.music)}
            />
          </div>

          <div className="vt-setting-row">
            <div className="vt-setting-row__info">
              <div className="vt-setting-row__name">
                <Zap size={13} style={{ marginRight: 7, verticalAlign: -2 }} />
                SFX Volume
              </div>
              <div className="vt-setting-row__hint">
                {Math.round(settings.volume * 100)}% — lasers, explosions, keystrokes
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.volume * 100)}
                className="vt-slider"
                style={{ marginTop: 12, ['--fill' ]: `${Math.round(settings.volume * 100)}%` }}
                aria-label="Sound effects volume"
                disabled={!settings.enabled}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
              />
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 11, letterSpacing: '0.1em', color: 'var(--vt-dim)', lineHeight: 1.7 }}>
            PREFERENCES ARE SAVED ON THIS DEVICE. THE GAME IS FULLY PLAYABLE WITH SOUND OFF.
          </p>
        </div>

        <div className="vt-modal__footer">
          <button type="button" className="vt-btn" onClick={testSound} disabled={!settings.enabled}>
            <MousePointerClick size={15} />
            Test Cannons
          </button>
          <button type="button" className="vt-btn vt-btn--primary" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
