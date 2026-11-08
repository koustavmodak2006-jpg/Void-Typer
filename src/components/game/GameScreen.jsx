import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Play, Home } from 'lucide-react';
import { GameEngine } from '../../game/gameEngine.js';
import { audio } from '../../game/audioEngine.js';
import { COUNTDOWN_SEQUENCE, COUNTDOWN_STEP_MS, LAUNCH_HOLD_MS } from '../../game/gameConstants.js';
import GameHUD from './GameHUD.jsx';
import TypingInput from './TypingInput.jsx';
import LevelBanner from './LevelBanner.jsx';

const IDLE_STATS = {
  state: 'idle',
  score: 0,
  level: 0,
  levelName: 'INITIAL DEPLOYMENT',
  levelKills: 0,
  killsRequired: 8,
  wordsDestroyed: 0,
  wpm: 0,
  accuracy: 100,
  elapsedMs: 0,
  mistakes: 0,
  streak: 0,
  bestStreak: 0,
  speedMult: 1,
};

/**
 * Main game screen: canvas battlefield + HUD + typing bar + overlays
 * (countdown, level banner, warnings, pause).
 */
export default function GameScreen({ playerName, onGameOver, onAbort }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const rootRef = useRef(null);

  const [stats, setStats] = useState(IDLE_STATS);
  const [typing, setTyping] = useState({
    hasTarget: false,
    word: null,
    progress: 0,
    errorPulse: 0,
    destroyedPulse: 0,
  });
  const [banner, setBanner] = useState(null);
  const [mistakeFx, setMistakeFx] = useState(null); // { key, reason }
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState('countdown'); // countdown | active | over
  const [countdownLabel, setCountdownLabel] = useState('');
  const [inputActive, setInputActive] = useState(false);
  const [isTouch] = useState(() => (
    typeof window !== 'undefined'
    && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0)
  ));

  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  const onGameOverRef = useRef(onGameOver);
  const onAbortRef = useRef(onAbort);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);
  useEffect(() => {
    onAbortRef.current = onAbort;
  }, [onAbort]);

  /* ------------------------------------------------------------ */
  /* Pause / resume                                                */
  /* ------------------------------------------------------------ */

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || phaseRef.current !== 'active') return;
    if (pausedRef.current) {
      engine.resume();
      setPaused(false);
    } else {
      engine.pause();
      setPaused(true);
    }
  }, []);

  const abort = useCallback(() => {
    const engine = engineRef.current;
    if (engine) engine.paused = true;
    onAbortRef.current?.();
  }, []);

  /* ------------------------------------------------------------ */
  /* Engine lifecycle + launch countdown                           */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = new GameEngine(canvas, {
      onStats: (s) => setStats(s),
      onTyping: (t) => setTyping(t),
      onLevelStart: (info) => {
        const key = Date.now();
        setBanner({ ...info, key });
        setTimeout(() => setBanner((b) => (b && b.key === key ? null : b)), 2600);
      },
      onMistake: ({ reason }) => setMistakeFx({ key: Date.now(), reason }),
      onWarning: () => {
        /* warning text derives from mistakeFx */
      },
      onGameOver: (finalStats) => {
        setPhase('over');
        onGameOverRef.current?.(finalStats);
      },
    });
    engineRef.current = engine;

    // Countdown: 3 → 2 → 1 → LAUNCH!
    let step = 0;
    let timer = 0;
    const tick = () => {
      const label = COUNTDOWN_SEQUENCE[step];
      setCountdownLabel(label);
      audio.playCountdown(label === 'LAUNCH');
      step += 1;
      if (step < COUNTDOWN_SEQUENCE.length) {
        timer = setTimeout(tick, COUNTDOWN_STEP_MS);
      } else {
        timer = setTimeout(() => {
          engine.launch(playerName);
          setPhase('active');
          if (audio.settings.enabled && audio.settings.music) audio.startMusic();
        }, LAUNCH_HOLD_MS);
      }
    };
    timer = setTimeout(tick, 400);

    return () => {
      clearTimeout(timer);
      engine.destroy();
      engineRef.current = null;
    };
    // A new game remounts this screen with a fresh key.
  }, [playerName]);

  /* ------------------------------------------------------------ */
  /* Keyboard input — one window listener feeds the engine         */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    const onKeyDown = (e) => {
      if (phaseRef.current === 'over') return;
      if (e.key === 'Escape') {
        if (phaseRef.current === 'active') {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (pausedRef.current || phaseRef.current !== 'active') return;
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        engine.submit();
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        engine.typeChar(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePause]);

  /* hidden input: feeds touch-keyboard characters into the engine */
  useEffect(() => {
    const input = hiddenInputRef.current;
    if (!input) return undefined;
    const onInput = () => {
      const value = input.value;
      input.value = '';
      if (pausedRef.current || phaseRef.current !== 'active') return;
      const engine = engineRef.current;
      if (!engine) return;
      for (const ch of value) {
        engine.typeChar(/[a-zA-Z]/.test(ch) ? ch.toLowerCase() : ch);
      }
    };
    const onFocus = () => setInputActive(true);
    const onBlur = () => setInputActive(false);
    input.addEventListener('input', onInput);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    return () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    };
  }, []);

  /* ------------------------------------------------------------ */
  /* Tab visibility — auto pause                                   */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === 'active' && !pausedRef.current) {
        engineRef.current?.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* keep HUD + typing bar on-screen when the mobile keyboard opens */
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv || !rootRef.current) return undefined;
    const onResize = () => {
      if (rootRef.current) rootRef.current.style.height = `${Math.round(vv.height)}px`;
    };
    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      if (rootRef.current) rootRef.current.style.height = '';
    };
  }, []);

  /* refocus the hidden input after battlefield taps (touch) */
  useEffect(() => {
    if (!isTouch) return undefined;
    const onPointerDown = (e) => {
      if (phaseRef.current !== 'active' || pausedRef.current) return;
      if (e.target.closest('button, a, input, [role="dialog"]')) return;
      hiddenInputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isTouch]);

  /* auto-clear transient damage overlay */
  useEffect(() => {
    if (!mistakeFx) return undefined;
    const t = setTimeout(() => setMistakeFx(null), 2300);
    return () => clearTimeout(t);
  }, [mistakeFx]);

  const tapToType = useCallback(() => {
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, []);

  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */

  const warningText = mistakeFx
    ? (mistakeFx.reason === 'breach' ? 'ENEMY BREACHED THE DEFENSE LINE' : 'INCORRECT WORD SUBMISSION')
    : null;

  return (
    <div className={`vt-game${isTouch ? ' vt-touch' : ''}`} ref={rootRef}>
      <GameHUD playerName={playerName} stats={stats} onPause={togglePause} />

      <div className="vt-battle">
        <canvas ref={canvasRef} className="vt-battle__canvas" aria-label="Space battlefield" role="img" />
        <div className="vt-battle__grid" aria-hidden="true" />
        <div className="vt-battle__vignette" aria-hidden="true" />

        {mistakeFx ? (
          <>
            <div className="vt-battle__damage" key={`dmg-${mistakeFx.key}`} aria-hidden="true" />
            {stats.speedMult < 0.95 ? (
              <div className="vt-battle__slowmo" key={`slow-${mistakeFx.key}`} aria-hidden="true" />
            ) : null}
            <div className="vt-damage-title" key={`dt-${mistakeFx.key}`} aria-hidden="true">
              SYSTEM DAMAGE
            </div>
            <div className="vt-warning" key={`warn-${mistakeFx.key}`} role="alert">
              <AlertTriangle className="vt-warning__icon" size={15} />
              {warningText}
            </div>
          </>
        ) : null}

        <LevelBanner banner={banner} />

        {phase === 'countdown' && countdownLabel ? (
          <div className="vt-countdown" aria-live="assertive">
            <div className="vt-countdown__label">MISSION LAUNCH IN</div>
            <div
              className={`vt-countdown__number${countdownLabel === 'LAUNCH' ? ' vt-countdown__number--launch' : ''}`}
              key={countdownLabel}
            >
              {countdownLabel === 'LAUNCH' ? 'LAUNCH!' : countdownLabel}
            </div>
          </div>
        ) : null}

        {paused ? (
          <div className="vt-pause" role="dialog" aria-modal="true" aria-label="Mission paused">
            <div className="vt-pause__title">PAUSED</div>
            <div className="vt-pause__sub">SYSTEMS ON STANDBY — TIME FROZEN</div>
            <div className="vt-pause__actions">
              <button type="button" className="vt-btn vt-btn--primary" onClick={togglePause} autoFocus>
                <Play size={16} />
                Resume Mission
              </button>
              <button type="button" className="vt-btn vt-btn--danger" onClick={abort}>
                <Home size={16} />
                Abort to Menu
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <TypingInput
        typing={typing}
        inputRef={hiddenInputRef}
        onTap={tapToType}
        inputActive={inputActive}
      />
    </div>
  );
}
