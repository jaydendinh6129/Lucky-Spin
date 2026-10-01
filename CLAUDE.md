# Party Games — guide for AI agents and new contributors

Read this first, then `docs/ARCHITECTURE.md` (flows + full function index), then the file you need.

## What this is
A no-build React 18 party-game console. Plain JSX files are compiled **in the browser** by Babel standalone from ordered `<script type="text/babel" src="js/…?v=X">` tags in `index.html`. There is no bundler, no npm, no modules: **every top-level `const`/`function` is a global shared by all files**, so load order in `index.html` is the dependency graph (engine/util → data → engines → components → games → app).

## Run / test / deploy
- Serve over HTTP: `python3 -m http.server 8080` (file:// cannot load the scripts). Live site: GitHub Pages builds the `main` branch root → https://jaydendinh6129.github.io/Lucky-Spin/
- Verify in a real browser (the app is UI); check the console for `ReferenceError`s — they mean a symbol is used before its file loads or a file failed to compile.
- Dev aids on `localhost` / `?dev=1` (`IS_DEV`): plan switcher in Settings; `window.__pgDebug` (host) and `window.__pgClient` (phone) expose live state.
- Deploy = `git push origin main`; Pages rebuilds in ~1 minute.

## Rules that are easy to break
1. **Bump the cache stamp after editing any `js/*` or `css/app.css`**: replace every `?v=OLD` in `index.html` with a new value (`sed -i '' 's/?v=2.1.1/?v=2.1.2/g' index.html`). Babel loads files via XHR and the HTTP cache otherwise serves stale copies — the symptom is a `ReferenceError` for a symbol that exists on disk.
2. **Never compare plans directly** (`plan === 'max'`). Ask `Entitlements.hasFeature(sub, 'feature-id')` / `Entitlements.canPlay(sub, item)`; the registry of what each plan unlocks is `FEATURES` in `js/subscription/plans.js` and the `plan` field of each game/theme in `js/data/registry.js`.
3. **Every user-visible string exists in both `en` and `vi`** in `js/data/i18n.js` (and `MODE_TEXT` / `GAME_META_TEXT` / `THEME_TEXT` for content). Components receive `t = I18N[lang]`.
4. **Never show upgrade prompts during gameplay.** Locked items open `UpgradeModal` only when the user taps them (`pickGame` in `js/app.js`).
5. **Do not touch the Spinner's behaviour** (`js/games/spinner.js`) unless asked; it is the flagship experience and was ported verbatim from the original app.
6. Hooks are destructured once in `js/engine/util.js` (`const { useState, … } = React`). If you need another React hook, add it there.
7. Content banks are data, not UI: challenges/questions/cards live in `js/data/*` and games read them through `useBag` (fair, non-repeating draws).

## Adding a game (checklist)
1. `js/data/registry.js`: add the item under its mode in `GAME_REGISTRY` (`id, icon, plan, component, players:[min,max], duration, scoring, difficulty` + any variant fields) and its `title/description/howToPlay` in `GAME_META_TEXT.en` and `.vi`.
2. Write `function MyGame({ ctx })` in `js/games/*.js`. Use `useGameEngine(rules)` (see `docs/ARCHITECTURE.md` → Game engine), `PlayerSetup`, `Countdown`, `ChallengeCard`, `Decision`, `ScoreBoard`, `GameResult`, `GameShell`; record the result with `useRecordOnFinish(status, () => gameResultEntry(...), ctx.onFinish)`; publish the big-screen stage with `ctx.publish({...})`.
3. Map the `component` key in `gameComponents()` (`js/app.js`).
4. Add the script tag in `index.html` (before `js/app.js`) and the path to `SHELL` in `sw.js`. Bump `?v=`.

## Adding a theme
Add an entry to `THEMES` (`js/data/themes.js`) with `plan`, palette, gradients, `skin`/`reveal` (reuse an existing skin/reveal key or add one in `js/components/wheel.js` / `reveals.js`), then `THEME_TEXT` and `SAMPLE_ITEMS` for `en` and `vi`. The sidebar and registry pick it up automatically.

## Where things live
| Concern | File |
| --- | --- |
| Global state, routing, entitlement gating, host session wiring | `js/app.js` |
| Sidebar accordion, `GameItem`, ⓘ popover | `js/components/sidebar.js` |
| Plan badges, upgrade modal, pricing page, dev switcher | `js/components/premium.js` |
| Game state machine | `js/engine/gameEngine.js` |
| Scores / streaks / elimination (pure) | `js/engine/scoreEngine.js` |
| Timers | `js/engine/timerEngine.js` |
| Party session, history, stats | `js/engine/sessionEngine.js` |
| Realtime transport / host / phone client | `js/realtime/*` |
| Venue branding, QR, host controls, Big Screen | `js/venue/*` |
| Wheel skins, cinematic reveals | `js/components/wheel.js`, `js/components/reveals.js` |

## Conventions
- Prefer small pure helpers in `js/engine/*`; components stay declarative.
- Tailwind utility classes (CDN) + a few hand-written animations in `css/app.css`.
- Commit messages: imperative summary, body explains *why*.
