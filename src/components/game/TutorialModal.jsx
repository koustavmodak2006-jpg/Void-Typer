import { useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

const STEPS = [
  {
    text: 'Enter your <strong>pilot name</strong> and start the mission — a 3-2-1 countdown will launch your ship.',
  },
  {
    text: '<strong>Enemy ships</strong> descend toward your defense line. Each one carries a <strong>word</strong>.',
  },
  {
    text: 'The front-most enemy is auto-targeted — its word glows in the <strong>bracket box</strong> and below your ship.',
  },
  {
    text: '<strong>Type the word</strong> letter by letter. Each correct letter locks on. Finish the word and your cannons fire automatically.',
  },
  {
    text: 'Starting a different word with its first letter <strong>switches your target</strong>. Missed letters just flash red — they cost accuracy, not lives.',
  },
  {
    text: '<em>Pressing ENTER with a half-typed word</em> submits it as incorrect — that is a <strong>mistake</strong>. So is letting an enemy <em>cross the defense line</em>.',
  },
  {
    text: 'Destroy enough enemies to <strong>clear the sector</strong>. Levels scale forever — speed, word length and enemy count all grow.',
  },
  {
    text: 'You can absorb exactly <strong>3 mistakes</strong>. The third one terminates the mission. Survive as long as you can.',
  },
];

const KEYS = [
  ['A – Z', 'Type / lock onto the highlighted word'],
  ['ENTER', 'Submit word — a partial word counts as an incorrect submission'],
  ['ESC', 'Pause / resume the mission'],
  ['TAP', 'On touch devices, tap the battle view to summon the keyboard'],
];

function renderStep(html) {
  // Whitelist-only markup generated above (strong / em).
  return { __html: html };
}

/**
 * How to Play — sci-fi briefing panel.
 */
export default function TutorialModal({ onClose }) {
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

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="vt-modal vt-panel vt-corners">
        <div className="vt-modal__header">
          <h2 className="vt-modal__title">
            <BookOpen size={17} style={{ marginRight: 8, verticalAlign: -3 }} />
            Flight Manual
          </h2>
          <button type="button" className="vt-modal__close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="vt-modal__body vt-scroll" style={{ maxHeight: '58vh' }}>
          <div className="vt-label" style={{ marginBottom: 6 }}>Mission Briefing</div>
          {STEPS.map((step, i) => (
            <div className="vt-tutorial__step" key={i}>
              <div className="vt-tutorial__num">{String(i + 1).padStart(2, '0')}</div>
              <div className="vt-tutorial__text" dangerouslySetInnerHTML={renderStep(step.text)} />
            </div>
          ))}

          <div className="vt-tutorial__section-title">Controls</div>
          <div className="vt-tutorial__keys">
            {KEYS.map(([key, desc]) => (
              <div className="vt-tutorial__key" key={key}>
                <kbd>{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>

          <div className="vt-tutorial__section-title">Scoring</div>
          <div className="vt-tutorial__text" style={{ paddingBottom: 4 }}>
            <strong>WPM</strong> = correct characters ÷ 5 ÷ minutes.{' '}
            <strong>Accuracy</strong> = correct ÷ total keystrokes. Longer words, deeper sectors
            and kill streaks all multiply your score.
          </div>
        </div>

        <div className="vt-modal__footer">
          <button type="button" className="vt-btn vt-btn--primary" onClick={onClose} autoFocus>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
