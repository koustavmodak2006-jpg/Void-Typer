import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, Trash2, Skull } from 'lucide-react';
import {
  getRecords,
  deleteRecord,
  clearRecords,
  getPersonalBest,
} from '../../utils/storage.js';
import { formatNumber, formatTime, formatPercent, formatDate } from '../../utils/statistics.js';

const SORTS = [
  { id: 'score', label: 'HIGH SCORE', cmp: (a, b) => b.score - a.score },
  { id: 'wpm', label: 'FASTEST WPM', cmp: (a, b) => b.wpm - a.wpm },
  { id: 'level', label: 'TOP LEVEL', cmp: (a, b) => b.level - a.level },
  { id: 'recent', label: 'MOST RECENT', cmp: (a, b) => b.createdAt - a.createdAt },
];

/**
 * Previous records — personal bests, sortable session log, per-record
 * delete + clear-all with confirmation. Browser-local by design.
 */
export default function RecordsScreen({ onBack }) {
  // The screen remounts on every navigation, so lazy init is enough;
  // local mutations (delete / clear) refresh state directly.
  const [records, setRecords] = useState(() => getRecords());
  const [sort, setSort] = useState('score');
  const [confirmClear, setConfirmClear] = useState(false);

  const reload = useCallback(() => {
    setRecords(getRecords());
  }, []);

  const best = useMemo(() => getPersonalBest(), [records]);

  const sorted = useMemo(() => {
    const cmp = SORTS.find((s) => s.id === sort)?.cmp || ((a, b) => b.score - a.score);
    return [...records].sort(cmp);
  }, [records, sort]);

  const handleDelete = (id) => {
    deleteRecord(id);
    reload();
  };

  const handleClear = () => {
    clearRecords();
    reload();
    setConfirmClear(false);
  };

  return (
    <div className="vt-records">
      <div className="vt-records__header">
        <div className="vt-records__headinfo">
          <h1 className="vt-records__title">FLIGHT RECORDS</h1>
          <div className="vt-label" style={{ marginTop: 5 }}>
            {records.length} MISSION{records.length === 1 ? '' : 'S'} LOGGED — THIS DEVICE ONLY
          </div>
        </div>
        <button type="button" className="vt-btn vt-btn--sm" onClick={onBack}>
          <ChevronLeft size={14} />
          Back
        </button>
      </div>

      <div className="vt-records__body vt-scroll">
        <div className="vt-records__summary">
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">BEST SCORE</div>
            <div className="vt-summary-card__value">{formatNumber(best.bestScore)}</div>
          </div>
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">HIGHEST WPM</div>
            <div className="vt-summary-card__value">{Math.round(best.bestWpm)}</div>
          </div>
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">TOP LEVEL</div>
            <div className="vt-summary-card__value vt-summary-card__value--purple">
              {best.bestLevel}
            </div>
          </div>
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">BEST ACCURACY</div>
            <div className="vt-summary-card__value">{formatPercent(best.bestAccuracy)}</div>
          </div>
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">MISSIONS FLOWN</div>
            <div className="vt-summary-card__value vt-summary-card__value--gold">
              {best.missionsCompleted}
            </div>
          </div>
          <div className="vt-summary-card">
            <div className="vt-summary-card__label">TOTAL FLIGHT TIME</div>
            <div className="vt-summary-card__value">{formatTime(best.totalFlightMs)}</div>
          </div>
        </div>

        <div className="vt-records__sort" role="group" aria-label="Sort records">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`vt-sort-btn${sort === s.id ? ' vt-sort-btn--active' : ''}`}
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="vt-records__empty">
            <div className="vt-records__empty-icon" aria-hidden="true">
              <Skull size={44} strokeWidth={1.2} style={{ opacity: 0.5 }} />
            </div>
            <div className="vt-records__empty-title">NO MISSIONS LOGGED</div>
            <p>
              COMPLETE A MISSION AND YOUR FLIGHT DATA WILL BE
              <br />
              STORED LOCALLY IN THIS BROWSER.
            </p>
          </div>
        ) : (
          <div className="vt-record-list">
            {sorted.map((r, i) => (
              <div
                className={`vt-record${r.score === best.bestScore && best.bestScore > 0 ? ' vt-record--best' : ''}`}
                key={r.id}
              >
                <div className="vt-record__rank">#{String(i + 1).padStart(2, '0')}</div>
                <div className="vt-record__name" title={r.playerName}>
                  {r.playerName.toUpperCase()}
                </div>
                <div className="vt-record__cell vt-record__cell--score">{formatNumber(r.score)}</div>
                <div className="vt-record__cell vt-record__cell--wpm">{Math.round(r.wpm)} WPM</div>
                <div className="vt-record__cell vt-record__cell--acc">{formatPercent(r.accuracy)}</div>
                <div className="vt-record__cell vt-record__cell--dim vt-record__cell--level">
                  LV {r.level}
                </div>
                <div className="vt-record__cell vt-record__cell--dim vt-record__cell--time">
                  {formatTime(r.elapsedMs)}
                </div>
                <div className="vt-record__date">{formatDate(r.createdAt)}</div>
                <button
                  type="button"
                  className="vt-record__delete"
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Delete record for ${r.playerName}`}
                  title="Delete record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="vt-records__footer">
        <div className="vt-records__note">
          RECORDS ARE STORED IN THIS BROWSER&apos;S LOCALSTORAGE AND ARE DEVICE-SPECIFIC.
          CLEARING BROWSER DATA WILL ERASE THEM.
        </div>
        <button
          type="button"
          className="vt-btn vt-btn--danger vt-btn--sm"
          onClick={() => setConfirmClear(true)}
          disabled={records.length === 0}
        >
          <Trash2 size={14} />
          Clear All Records
        </button>
      </div>

      {confirmClear ? (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm clear all records">
          <div className="vt-modal vt-panel vt-corners" style={{ width: 'min(440px, 100%)' }}>
            <div className="vt-modal__header">
              <h2 className="vt-modal__title" style={{ color: 'var(--vt-danger)' }}>
                Purge Flight Logs
              </h2>
            </div>
            <div className="vt-modal__body">
              <p style={{ fontSize: 13, letterSpacing: '0.08em', lineHeight: 1.7, color: 'var(--vt-text)' }}>
                THIS WILL PERMANENTLY ERASE ALL {records.length} RECORD{records.length === 1 ? '' : 'S'}
                FROM THIS DEVICE. THERE IS NO UNDO.
              </p>
            </div>
            <div className="vt-modal__footer">
              <button type="button" className="vt-btn vt-btn--danger" onClick={handleClear} autoFocus>
                Erase Everything
              </button>
              <button type="button" className="vt-btn vt-btn--ghost" onClick={() => setConfirmClear(false)}>
                Keep Records
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
