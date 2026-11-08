import { useMemo } from 'react';
import { Rocket, Trophy, BookOpen, Volume2 } from 'lucide-react';

/**
 * Landing / intro screen — animated space background, floating ship,
 * title + mission menu.
 */

const BOOT_LINES = [
  'VOID TYPER TERMINAL v1.0',
  'CALIBRATING TARGETING SYSTEMS . . . OK',
  'CHARGING PHOTON CANNONS . . . OK',
  'SYNCING PILOT INTERFACE . . . OK',
  'ALL SYSTEMS NOMINAL — WELCOME, PILOT',
];

function makeStarTile(size, count, colors) {
  // Canvas-generated seamless star tile → repeating background-image.
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.4 + Math.random() * 1.1;
    ctx.globalAlpha = 0.3 + Math.random() * 0.6;
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return `url(${canvas.toDataURL('image/png')})`;
}

function StarField() {
  const layers = useMemo(() => {
    try {
      return {
        far: makeStarTile(560, 90, ['#e2e8f0', '#f1f5f9']),
        near: makeStarTile(560, 46, ['#67e8f9', '#a5f3fc', '#c4b5fd']),
      };
    } catch {
      return { far: 'none', near: 'none' };
    }
  }, []);
  return (
    <div className="vt-space-bg" aria-hidden="true">
      <div className="vt-space-bg__nebula vt-space-bg__nebula--a" />
      <div className="vt-space-bg__nebula vt-space-bg__nebula--b" />
      <div
        className="vt-space-bg__stars--far"
        style={{ backgroundImage: layers.far, backgroundSize: '560px 560px' }}
      />
      <div
        className="vt-space-bg__stars"
        style={{ backgroundImage: layers.near, backgroundSize: '560px 560px' }}
      />
      <div className="vt-space-bg__comet" />
      <div className="vt-space-bg__comet vt-space-bg__comet--delay" />
    </div>
  );
}

function ShipArt() {
  return (
    <svg className="vt-landing__ship" viewBox="0 0 140 120" role="img" aria-label="Player spaceship">
      <defs>
        <linearGradient id="vt-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334760" />
          <stop offset="55%" stopColor="#16223c" />
          <stop offset="100%" stopColor="#0b1226" />
        </linearGradient>
        <linearGradient id="vt-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* engine flames */}
      <g className="vt-flames">
        <polygon points="62,96 58,116 66,96" fill="url(#vt-flame)" />
        <polygon points="78,96 74,116 82,96" fill="url(#vt-flame)" />
      </g>
      {/* wings */}
      <path
        d="M70 22 L96 58 L108 84 L88 78 L74 84 L66 84 L52 78 L32 84 L44 58 Z"
        fill="#131f38"
        stroke="#a78bfa"
        strokeWidth="1.4"
        opacity="0.94"
      />
      {/* hull */}
      <path
        d="M70 8 L78 30 L80 52 L84 74 L76 88 L64 88 L56 74 L60 52 L62 30 Z"
        fill="url(#vt-hull)"
        stroke="#38bdf8"
        strokeWidth="1.8"
      />
      {/* wing accents */}
      <path d="M44 60 L62 66 M96 60 L78 66" stroke="#a78bfa" strokeWidth="1.2" opacity="0.8" />
      {/* cockpit */}
      <ellipse cx="70" cy="44" rx="7" ry="13" fill="#67e8f9" opacity="0.9" />
      <ellipse cx="70" cy="44" rx="3.4" ry="7" fill="#e0faff" />
      {/* cannons */}
      <rect x="50" y="70" width="5" height="16" fill="#38bdf8" opacity="0.85" transform="rotate(14 52 78)" />
      <rect x="85" y="70" width="5" height="16" fill="#38bdf8" opacity="0.85" transform="rotate(-14 87 78)" />
    </svg>
  );
}

export default function LandingScreen({ onStart, onRecords, onHowTo, onSound }) {
  return (
    <div className="vt-landing">
      <StarField />
      <div className="vt-grid-overlay" aria-hidden="true" />
      <div className="vt-scanlines" aria-hidden="true" />

      {/* boot / scanning effect */}
      <div className="vt-boot" aria-hidden="true">
        {BOOT_LINES.map((line, i) => (
          <div key={line} className={`vt-boot__line${i === 0 ? '' : ' vt-boot__line--dim'}`}>
            {line}
          </div>
        ))}
        <div className="vt-boot__bar" />
      </div>

      {/* scrollable hero area — keeps overlays fixed behind it and the
          footer in flow (never overlapping the menu on short viewports) */}
      <div className="vt-landing__scroll">
        <div className="vt-landing__content">
          <div className="vt-landing__chips">
            <span className="vt-chip"><span className="vt-chip__dot" /> SYSTEMS ONLINE</span>
            <span className="vt-chip"><span className="vt-chip__dot" /> PHOTON CANNONS ARMED</span>
          </div>

          <ShipArt />

          <h1 className="vt-landing__title">
            <em>VOID</em> TYPER
          </h1>

          <p className="vt-landing__subtitle">
            Every keystroke is a weapon.
            <br />
            Every mistake brings you <strong>closer to extinction</strong>.
          </p>

          <nav className="vt-landing__menu" aria-label="Main menu">
            <button type="button" className="vt-btn vt-btn--primary" onClick={onStart} autoFocus>
              <Rocket size={18} strokeWidth={2.2} />
              Start Mission
            </button>
            <button type="button" className="vt-btn" onClick={onRecords}>
              <Trophy size={17} />
              Previous Records
            </button>
            <button type="button" className="vt-btn" onClick={onHowTo}>
              <BookOpen size={17} />
              How to Play
            </button>
            <button type="button" className="vt-btn" onClick={onSound}>
              <Volume2 size={17} />
              Sound Settings
            </button>
          </nav>
        </div>

        <footer className="vt-landing__footer">
          <span>VOID TYPER v1.0</span>
          <span>RECORDS STORED LOCALLY</span>
          <span>NO ACCOUNT REQUIRED</span>
        </footer>
      </div>
    </div>
  );
}
