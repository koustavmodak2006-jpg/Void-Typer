import { useEffect, useRef, useState } from 'react';
import { Rocket, X, User } from 'lucide-react';
import { audio } from '../../game/audioEngine.js';
import { useUISound } from '../../hooks/useAudio.js';

const MAX_NAME = 20;

/**
 * Player identification modal — "IDENTIFY YOURSELF, PILOT".
 * Name is mandatory, max 20 chars, trimmed, no email/password.
 */
export default function PlayerModal({ initialName = '', onConfirm, onCancel }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const playUI = useUISound();

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = () => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) {
      setError('PILOT DESIGNATION REQUIRED — EMPTY CALL SIGNS ARE REJECTED');
      inputRef.current?.focus();
      return;
    }
    if (clean.length > MAX_NAME) {
      setError(`CALL SIGN TOO LONG — MAX ${MAX_NAME} CHARACTERS`);
      return;
    }
    playUI();
    audio.unlock();
    onConfirm(clean.slice(0, MAX_NAME));
  };

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Identify yourself, pilot">
      <div className="vt-modal vt-panel vt-corners">
        <div className="vt-modal__header">
          <h2 className="vt-modal__title">Identify Yourself, Pilot</h2>
          <button type="button" className="vt-modal__close" onClick={onCancel} aria-label="Cancel">
            <X size={17} />
          </button>
        </div>

        <div className="vt-modal__body">
          <p
            style={{
              fontSize: 12.5,
              letterSpacing: '0.12em',
              color: 'var(--vt-dim)',
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            ENTER YOUR CALL SIGN TO REGISTER THIS MISSION.
            <br />
            NO EMAIL. NO PASSWORD. NOTHING LEAVES YOUR DEVICE.
          </p>

          <label className="vt-label" htmlFor="vt-player-name" style={{ display: 'block', marginBottom: 9 }}>
            Pilot Call Sign
          </label>
          <div style={{ position: 'relative' }}>
            <User
              size={17}
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--vt-dim)' }}
              aria-hidden="true"
            />
            <input
              id="vt-player-name"
              ref={inputRef}
              className={`vt-input ${error ? 'vt-input--error' : ''}`}
              style={{ paddingLeft: 40, textTransform: 'uppercase' }}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={MAX_NAME}
              placeholder="E.G. STARFIRE"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="vt-field-error" role={error ? 'alert' : undefined}>
            {error || `${name.trim().length}/${MAX_NAME}`}
          </div>
        </div>

        <div className="vt-modal__footer">
          <button type="button" className="vt-btn vt-btn--primary" onClick={submit}>
            <Rocket size={17} />
            Enter the Galaxy
          </button>
          <button type="button" className="vt-btn vt-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
