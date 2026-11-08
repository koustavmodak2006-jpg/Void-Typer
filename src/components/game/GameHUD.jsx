import { memo } from 'react';
import { Pause } from 'lucide-react';
import { MAX_MISTAKES } from '../../game/gameConstants.js';
import { formatNumber } from '../../utils/statistics.js';
import { timeParts, pad2 } from '../../utils/statistics.js';

/**
 * Top HUD — pilot, sector progress, score, WPM, accuracy, time,
 * words destroyed, streak and the three mistake indicators.
 */
function GameHUD({ playerName, stats, onPause }) {
  const { m, s } = timeParts(stats.elapsedMs);
  const cells = [];
  for (let i = 0; i < MAX_MISTAKES; i++) {
    cells.push(
      <span
        key={i}
        className={`vt-mistake-cell${i < stats.mistakes ? ' vt-mistake-cell--lost' : ''}`}
        aria-hidden="true"
      />,
    );
  }

  return (
    <header className="vt-hud">
      <div className="vt-hud__pilot">
        <div className="vt-hud__name" title={playerName}>
          {playerName.toUpperCase()}
        </div>
        <div className="vt-hud__sector">
          <span className="vt-hud__level">SECTOR {String(stats.level).padStart(2, '0')}</span>
          <span aria-hidden="true">·</span>
          <span>{stats.levelName}</span>
        </div>
        <div
          className="vt-hud__progress"
          role="progressbar"
          aria-label="Sector progress"
          aria-valuemin={0}
          aria-valuemax={stats.killsRequired}
          aria-valuenow={stats.levelKills}
        >
          <div
            className="vt-hud__progress-fill"
            style={{ width: `${Math.min(100, (stats.levelKills / stats.killsRequired) * 100)}%` }}
          />
        </div>
      </div>

      <div className="vt-hud__stats" aria-live="off">
        <div className="vt-stat">
          <span className="vt-stat__label">SCORE</span>
          <span className="vt-stat__value vt-stat__value--cyan vt-stat__value--big">
            {formatNumber(stats.score)}
          </span>
        </div>
        <div className="vt-stat">
          <span className="vt-stat__label">WPM</span>
          <span className="vt-stat__value">{Math.round(stats.wpm)}</span>
        </div>
        <div className="vt-stat">
          <span className="vt-stat__label">ACCURACY</span>
          <span className="vt-stat__value">{Math.round(stats.accuracy)}%</span>
        </div>
        <div className="vt-stat">
          <span className="vt-stat__label">TIME</span>
          <span className="vt-stat__value">
            {m}:{pad2(s)}
          </span>
        </div>
        <div className="vt-stat">
          <span className="vt-stat__label">WORDS</span>
          <span className="vt-stat__value">{stats.wordsDestroyed}</span>
        </div>
        <div className="vt-stat">
          <span className="vt-stat__label">STREAK</span>
          <span className={`vt-stat__value${stats.streak >= 5 ? ' vt-stat__value--warn' : ''}`}>
            {stats.streak}
          </span>
        </div>
      </div>

      <div className="vt-hud__mistakes">
        <div className="vt-mistake-cells">{cells}</div>
        <div className="vt-hud__mistakes-label">
          MISTAKES: <strong>{stats.mistakes}/{MAX_MISTAKES}</strong>
        </div>
      </div>

      <button
        type="button"
        className="vt-hud__pausebtn"
        onClick={onPause}
        aria-label="Pause mission"
        title="Pause (ESC)"
      >
        <Pause size={15} />
      </button>
    </header>
  );
}

export default memo(GameHUD);
