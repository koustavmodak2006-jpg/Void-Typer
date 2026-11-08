import { useEffect, useState } from 'react';
import { RotateCcw, Home, Trophy, Share2, Download, Star } from 'lucide-react';
import { formatNumber, formatTimeLong, formatPercent } from '../../utils/statistics.js';
import { getPersonalBest } from '../../utils/storage.js';
import { shareResults, downloadResultsPNG, buildShareText, copyToClipboard } from '../../utils/exportResults.js';
import { MAX_MISTAKES } from '../../game/gameConstants.js';

/**
 * Mission summary — final stats, personal best, share + PNG download.
 */
export default function ResultsScreen({ stats, isBest, onPlayAgain, onMainMenu, onViewRecords }) {
  const [toast, setToast] = useState(null); // { text, key }
  const [manualText, setManualText] = useState(null);
  const [busy, setBusy] = useState(false);
  const [best, setBest] = useState(() => getPersonalBest());

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (text) => setToast({ text, key: Date.now() });

  const handleShare = async () => {
    const result = await shareResults(stats);
    if (result === 'shared') showToast('MISSION REPORT TRANSMITTED');
    else if (result === 'copied') showToast('MISSION REPORT COPIED TO CLIPBOARD');
    else if (result === 'cancelled') showToast('TRANSMISSION ABORTED');
    else setManualText(buildShareText(stats));
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await downloadResultsPNG(stats, { isBest });
      showToast(ok ? 'MISSION REPORT DOWNLOADED AS PNG' : 'PNG EXPORT FAILED — TRY AGAIN');
    } finally {
      setBusy(false);
    }
  };

  const copyManual = async () => {
    const r = await copyToClipboard(manualText);
    if (r === 'copied') {
      setManualText(null);
      showToast('MISSION REPORT COPIED TO CLIPBOARD');
    }
  };

  const cells = [
    ['WORDS DESTROYED', formatNumber(stats.wordsDestroyed), ''],
    ['CORRECT WORDS', formatNumber(stats.correctWords), ''],
    ['INCORRECT SUBMISSIONS', String(stats.incorrectSubmissions), 'vt-result-cell__value--danger'],
    ['WORDS PER MINUTE', `${Math.round(stats.wpm)} WPM`, 'vt-result-cell__value--cyan'],
    ['TYPING ACCURACY', formatPercent(stats.accuracy), ''],
    ['TOTAL TIME', formatTimeLong(stats.elapsedMs), ''],
    ['HIGHEST LEVEL REACHED', String(stats.level), 'vt-result-cell__value--warn'],
    ['TOTAL MISTAKES', `${stats.mistakes}/${MAX_MISTAKES}`, 'vt-result-cell__value--danger'],
    ['BEST STREAK', `${stats.bestStreak} KILLS`, ''],
    ['PEAK WPM', `${Math.round(stats.peakWpm)} WPM`, ''],
  ];

  return (
    <div className="vt-results">
      <div className="vt-results__scroller vt-scroll">
        <div className="vt-results__header">
          <h1 className="vt-results__title">MISSION TERMINATED</h1>
          <p className="vt-results__subtitle">YOUR JOURNEY THROUGH THE GALAXY HAS ENDED</p>
          {isBest ? (
            <div className="vt-results__best-badge">
              <Star size={13} />
              NEW PERSONAL BEST
            </div>
          ) : null}
        </div>

        <div className="vt-results__score">
          <div className="vt-results__score-label">FINAL SCORE</div>
          <div className="vt-results__score-value">{formatNumber(stats.score)}</div>
        </div>

        <div className="vt-results__grid">
          <div className="vt-result-cell vt-result-cell--wide">
            <span className="vt-result-cell__label">PILOT</span>
            <span className="vt-result-cell__value">{stats.playerName.toUpperCase()}</span>
          </div>
          {cells.map(([label, value, cls]) => (
            <div className="vt-result-cell" key={label}>
              <span className="vt-result-cell__label">{label}</span>
              <span className={`vt-result-cell__value ${cls}`.trim()}>{value}</span>
            </div>
          ))}
          <div className="vt-result-cell vt-result-cell--wide">
            <span className="vt-result-cell__label">PERSONAL BEST SCORE</span>
            <span className="vt-result-cell__value vt-result-cell__value--gold">
              {formatNumber(best.bestScore)}
            </span>
          </div>
        </div>

        <div className="vt-results__actions">
          <button type="button" className="vt-btn vt-btn--primary" onClick={onPlayAgain} autoFocus>
            <RotateCcw size={16} />
            Play Again
          </button>
          <button type="button" className="vt-btn" onClick={onMainMenu}>
            <Home size={16} />
            Main Menu
          </button>
          <button type="button" className="vt-btn" onClick={onViewRecords}>
            <Trophy size={16} />
            View Records
          </button>
          <button type="button" className="vt-btn" onClick={handleShare}>
            <Share2 size={16} />
            Share Results
          </button>
          <button
            type="button"
            className="vt-btn"
            onClick={handleDownload}
            disabled={busy}
            style={{ gridColumn: '1 / -1' }}
          >
            <Download size={16} />
            {busy ? 'Rendering Report…' : 'Download Results (PNG)'}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="vt-toast" key={toast.key} role="status">
          {toast.text}
        </div>
      ) : null}

      {manualText ? (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Copy results">
          <div className="vt-modal vt-panel vt-corners" style={{ width: 'min(480px, 100%)' }}>
            <div className="vt-modal__header">
              <h2 className="vt-modal__title">Manual Copy</h2>
            </div>
            <div className="vt-modal__body">
              <p style={{ fontSize: 12, color: 'var(--vt-dim)', letterSpacing: '0.1em', marginBottom: 12 }}>
                CLIPBOARD UNAVAILABLE — COPY THE REPORT BELOW:
              </p>
              <textarea
                className="vt-input"
                style={{ height: 190, fontSize: 13, letterSpacing: '0.06em', textTransform: 'none', resize: 'none' }}
                readOnly
                value={manualText}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            </div>
            <div className="vt-modal__footer">
              <button type="button" className="vt-btn vt-btn--primary" onClick={copyManual}>
                Copy Text
              </button>
              <button type="button" className="vt-btn vt-btn--ghost" onClick={() => setManualText(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
