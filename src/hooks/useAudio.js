/**
 * VOID TYPER — React hooks for audio settings + autoplay unlock.
 */

import { useEffect, useState, useCallback } from 'react';
import { audio } from '../game/audioEngine.js';

/**
 * Reactive audio settings (master / music / SFX volume) backed by
 * localStorage via the audio engine itself.
 */
export function useAudioSettings() {
  const [settings, setSettings] = useState({ ...audio.settings });

  useEffect(() => {
    const unsub = audio.subscribe((s) => setSettings({ ...s }));
    return unsub;
  }, []);

  const setEnabled = useCallback((v) => audio.setEnabled(v), []);
  const setMusic = useCallback((v) => audio.setMusic(v), []);
  const setVolume = useCallback((v) => audio.setVolume(v), []);

  return { settings, setEnabled, setMusic, setVolume };
}

/**
 * Browsers block audio until a user gesture happens. Attach this hook at
 * the app root: it resumes a suspended context on any pointer/key event,
 * no matter where it happened.
 */
export function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}

/** Fire the UI click sound (respects settings). */
export function useUISound() {
  return useCallback(() => audio.playUI(), []);
}
