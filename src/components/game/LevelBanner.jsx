import { memo } from 'react';

/**
 * Sector-clear banner — "SECTOR 02 / ASTEROID BELT / +300 BONUS".
 * Rendered with a keyed mount so the CSS entrance animation replays.
 */
function LevelBanner({ banner }) {
  if (!banner) return null;
  return (
    <div className="vt-level-banner" key={banner.key} role="status" aria-live="polite">
      <div className="vt-level-banner__cleared">SECTOR {String(banner.level - 1).padStart(2, '0')} CLEARED</div>
      <div className="vt-level-banner__rule" />
      <div className="vt-level-banner__level">LEVEL {banner.level}</div>
      <div className="vt-level-banner__name">{banner.name}</div>
      <div className="vt-level-banner__rule" />
      <div className="vt-level-banner__bonus">SECTOR BONUS +{banner.bonus.toLocaleString('en-US')}</div>
    </div>
  );
}

export default memo(LevelBanner);
