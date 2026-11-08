# VOID TYPER

> **Every keystroke is a weapon. Every mistake brings you closer to extinction.**

A complete, production-ready **space combat typing game** that runs entirely in the browser.
Destroy descending enemy fleets by typing their words, survive endless sectors of escalating
difficulty, and track your real WPM / accuracy — no account, no backend, no network calls
after the page loads.

---

## Gameplay

- Enemy ships descend toward your **defense line**, each carrying a word.
- The front-most enemy is **auto-targeted** — type its word letter by letter.
  Finish the word and your cannons fire automatically.
- Start a different word with its first letter to **switch targets**.
- **Mistakes (max 3):**
  - Pressing <kbd>ENTER</kbd> with a half-typed word → *incorrect submission*.
  - An enemy crossing the defense line → *breach*.
  - Individual wrong keystrokes do **not** count as mistakes — they only cost accuracy.
- Each mistake triggers **SYSTEM DAMAGE**: gameplay briefly slows down, then recovers.
- Destroy enough enemies to clear the **sector** — levels scale forever (speed, word
  length, spawn rate, enemy variants). There is no maximum level.
- Third mistake → **MISSION TERMINATED** → full mission report + personal records.

## Features

| Area | Details |
| --- | --- |
| Game engine | Custom canvas engine (60 FPS `requestAnimationFrame`), fractional coordinates, particle budget, screen shake, warp effects |
| Typing | Guided auto-targeting with smart target switching, per-character highlighting, mobile virtual-keyboard support |
| Difficulty | Formula-driven level scaling (no hardcoded cap) — 5 named sectors, then *Infinite Survival* |
| Dictionary | ~460 curated words in 4 tiers (3–16 chars), auto-sanitized, recent-word avoidance |
| Statistics | Real-time WPM (`chars / 5 / minutes`), accuracy (`correct / total keystrokes`), streaks, peak WPM, elapsed time |
| Audio | Fully synthesized Web Audio engine — lasers, explosions, alarms, countdown, ambient space music. Master/music/SFX controls persisted |
| Records | LocalStorage mission log with personal bests, 4 sort modes, per-record delete, guarded clear-all |
| Sharing | Web Share API with clipboard fallback + downloadable **PNG mission report** rendered on canvas |
| UX | Landing screen with boot sequence, pilot identification modal, 3-2-1-LAUNCH countdown, level banners, pause (ESC), auto-pause on tab switch |
| Responsive | Desktop / laptop / tablet / phone layouts, `visualViewport` keyboard handling, touch affordances, reduced-motion support |

**No login. No registration. No backend. No database. No API keys. No paid services.**

## Tech Stack

- **React 19** (ES6+ JSX, function components + hooks)
- **Vite 7** — dev server & static build
- **HTML5 Canvas** for the battlefield, **CSS3** animations for the UI
- **Web Audio API** for all sound (zero audio files)
- **LocalStorage** for records & preferences
- `lucide-react` for icons (the only runtime dependency besides React)

## Project Structure

```
void-typer/
├── .github/workflows/deploy.yml   # GitHub Pages CI/CD
├── public/
│   └── favicon.svg
├── src/
│   ├── components/game/           # React UI (screens, HUD, modals)
│   │   ├── VoidTyperApp.jsx       # screen state machine
│   │   ├── LandingScreen.jsx
│   │   ├── PlayerModal.jsx        # pilot identification
│   │   ├── TutorialModal.jsx      # how to play
│   │   ├── SoundSettingsModal.jsx # audio controls
│   │   ├── GameScreen.jsx         # orchestrates engine + overlays
│   │   ├── GameHUD.jsx
│   │   ├── TypingInput.jsx        # word display + keyboard capture
│   │   ├── LevelBanner.jsx
│   │   ├── ResultsScreen.jsx      # mission summary, share, PNG
│   │   └── RecordsScreen.jsx      # local leaderboard
│   ├── game/                      # framework-agnostic game logic
│   │   ├── gameEngine.js          # canvas engine + game loop
│   │   ├── difficulty.js          # scalable level algorithm
│   │   ├── wordGenerator.js
│   │   ├── scoring.js             # WPM / accuracy / points math
│   │   ├── audioEngine.js         # Web Audio synth
│   │   └── gameConstants.js
│   ├── data/words.js              # tiered dictionary
│   ├── hooks/useAudio.js
│   ├── utils/                     # storage, statistics, export
│   ├── styles/                    # 5 CSS modules (design system)
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

> Note: the battlefield (ships, lasers, particles, words) is rendered on a single
> canvas inside `gameEngine.js` for performance, so there are no per-enemy React
> components — React owns the HUD, input and screens; the engine owns the loop.

## Local Development

Requires **Node.js 20.19+** (or 22+) — only for building, never at runtime.

```bash
# 1. install dependencies
npm install

# 2. start the dev server (http://localhost:5173)
npm run dev

# 3. production build → ./dist
npm run build

# 4. preview the production build locally
npm run preview
```

## Deploying to GitHub Pages

### Automatic (recommended) — GitHub Actions

1. Create a **new public repository** (e.g. `void-typer`).
2. Push this project to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "VOID TYPER v1.0 — initial launch"
   git branch -M main
   git remote add origin https://github.com/<USERNAME>/void-typer.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on
   every push to `main`. Watch it under the **Actions** tab.
5. Your game goes live at:
   ```
   https://<USERNAME>.github.io/<REPOSITORY-NAME>/
   ```

The Vite config uses `base: './'` (relative asset paths), so the site works on any
repository name — no config edits required.

### Manual (no Actions)

```bash
npm run build
# push the contents of dist/ to a gh-pages branch, e.g.:
npx gh-pages -d dist       # add "homepage" to package.json if you like
```
(Then set Pages → Source: *Deploy from a branch* → `gh-pages`.)

## Keyboard Reference

| Key | Action |
| --- | --- |
| <kbd>A</kbd>–<kbd>Z</kbd> | Type / lock onto the highlighted word |
| <kbd>ENTER</kbd> | Submit word — a partial word counts as an incorrect submission |
| <kbd>ESC</kbd> | Pause / resume |
| Tap | On touch devices, tap the battle view to summon the keyboard |

**Debug hook:** append `?debug=1` to the URL to expose the live engine as
`window.__VT__` (typed letters, stats, enemies) — handy for testing.

## Notes & Limitations

- Records are **browser- and device-specific** (LocalStorage) — clearing browser
  data erases them. This is by design; there is intentionally no global leaderboard.
- The optional Google-Fonts link upgrades typography; offline, the game falls back
  to system monospace fonts with zero functional impact.
- Web Share API availability varies by browser; the clipboard fallback (with a
  manual-copy dialog) covers the rest.
- Sounds are synthesized live — some very old browsers without Web Audio will run
  the game silently.
- Everything else (engine, stats, records, PNG export) is pure client-side code.

---

Made for keyboards, starfighters, and people who type like they mean it. 🚀
