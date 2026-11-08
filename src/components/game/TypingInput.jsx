import { memo } from 'react';
import { Keyboard } from 'lucide-react';

/**
 * Bottom control area — target word with typing progress, input
 * hints, hidden capture input (opens the virtual keyboard on touch
 * devices) and the TAP-TO-TYPE affordance for mobile.
 * Visibility of the tap button is CSS-driven (narrow viewport or touch).
 */
function TypingInput({ typing, inputRef, onTap, inputActive }) {
  const word = typing.word;
  const progress = typing.progress || 0;
  const pct = word ? Math.round((progress / word.length) * 100) : 0;
  const isError = typing.lastEvent === 'error';

  let wordDisplay;
  if (word) {
    const chars = word.split('').map((c, i) => {
      let cls = 'vt-char';
      if (i < progress) cls += ' vt-char--typed';
      else if (i === progress) cls += ' vt-char--next';
      return (
        <span key={i} className={cls}>
          {c}
        </span>
      );
    });
    wordDisplay = (
      <div
        className={`vt-typing__word${isError ? ' vt-typing__word--error' : ''}`}
        key={`w-${word}-${isError ? typing.errorPulse : 'k'}`}
        aria-label={`Target word: ${word}`}
      >
        {chars}
      </div>
    );
  } else if (typing.destroyedPulse > 0) {
    wordDisplay = (
      <div className="vt-typing__word vt-typing__word--destroyed" key={`d-${typing.destroyedPulse}`}>
        TARGET DESTROYED
      </div>
    );
  } else {
    wordDisplay = (
      <div className="vt-typing__word vt-typing__word--idle">AWAITING TARGET…</div>
    );
  }

  return (
    <div className="vt-typing">
      <div className="vt-typing__label" aria-live="polite">
        {word ? 'TARGET LOCKED — TYPE TO FIRE' : 'SCANNING SECTOR'}
      </div>

      {wordDisplay}

      <div className="vt-typing__bar" aria-hidden="true">
        <div className="vt-typing__bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Hidden input — the single typing source for touch keyboards. */}
      <input
        ref={inputRef}
        className="vt-typing__hidden-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-hidden="true"
        tabIndex={-1}
      />

      <button
        type="button"
        className={`vt-typing__tap${inputActive ? ' vt-typing__tap--active' : ''}`}
        onClick={onTap}
      >
        <Keyboard size={15} />
        TAP HERE TO TYPE
      </button>

      <div className="vt-typing__hints" aria-hidden="true">
        <span className="vt-hint-desktop">
          <kbd>A–Z</kbd>TYPE
        </span>
        <span className="vt-hint-desktop">
          <kbd>ENTER</kbd>SUBMIT
        </span>
        <span>
          <kbd>ESC</kbd>PAUSE
        </span>
      </div>
    </div>
  );
}

export default memo(TypingInput);
