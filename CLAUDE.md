# JParty — guide for AI agents and new contributors

Read this first, then `docs/ARCHITECTURE.md` (flows + full function index), then the file you need.

## What this is
A React 18 party-game console with no npm and no modules: **every top-level `const`/`function` is a global shared by all files**, so script order is the dependency graph (engine/util → data → engines → components → games → app).

Two pages, one source:
- **`dev.html`** — the page you develop against. Compiles `js/**` in the browser with Babel standalone, no service worker, so a reload shows your edit. **It is the source of truth for load order.**
- **`index.html`** — generated. `tools/build.sh` compiles the JSX ahead of time into `dist/app.js` + `dist/data.js`, swaps the 47 script tags for two, drops the Babel and Tailwind CDNs, and rewrites `sw.js`. **Never edit `index.html` or `dist/*` by hand.**

## Run / test / deploy
- Serve over HTTP: `python3 -m http.server 8080` (file:// cannot load the scripts). Develop against **`/dev.html`**. Live site: GitHub Pages builds the `main` branch root → https://jaydendinh6129.github.io/Lucky-Spin/
- **Before every commit: `./tools/build.sh`** (needs no Node — it runs Babel standalone under macOS JavaScriptCore via `osascript`). It regenerates `dist/`, `index.html` and `sw.js`, and it *fails loudly* on a syntax error or a duplicate top-level declaration, which the browser's `env` preset used to hide.
- Verify in a real browser (the app is UI); check the console for `ReferenceError`s — they mean a symbol is used before its file loads.
- Dev aids on `localhost` / `?dev=1` (`IS_DEV`): plan switcher in Settings; `window.__pgDebug` (host) and `window.__pgClient` (phone) expose live state.
- Deploy = `./tools/build.sh && git push origin main`; Pages rebuilds in ~1 minute.

## Rules that are easy to break
1. **Cache stamps are automatic now** — `tools/build.sh` hashes the bundles and stamps `index.html` and `sw.js` for you. Just remember to *run it*; forgetting means the live site keeps serving the previous `dist/`. (`dev.html` still carries `?v=` stamps for the Babel XHR loader; bump those only if a dev reload serves a stale file.)
2. **Never compare plans directly** (`plan === 'max'`). Ask `Entitlements.hasFeature(sub, 'feature-id')` / `Entitlements.canPlay(sub, item)`; the registry of what each plan unlocks is `FEATURES` in `js/subscription/plans.js` and the `plan` field of each game/theme in `js/data/registry.js`.
3. **Every user-visible string exists in both `en` and `vi`** in `js/data/i18n.js` (and `MODE_TEXT` / `GAME_META_TEXT` / `THEME_TEXT` for content). Components receive `t = I18N[lang]`.
4. **Never show upgrade prompts during gameplay.** Locked items open `UpgradeModal` only when the user taps them (`pickGame` in `js/app.js`).
5. **Do not touch the Spinner's behaviour** (`js/games/spinner.js`) unless asked; it is the flagship experience and was ported verbatim from the original app.
6. Hooks are destructured once in `js/engine/util.js` (`const { useState, … } = React`). If you need another React hook, add it there.
7. Content banks are data, not UI: challenges/questions/cards live in `js/data/*` and games read them through `useBag` (fair, non-repeating draws).
8. **Secret information never goes to the big screen.** Charades' word and Imposter's word/role are shown only on the host phone; `publish()` sends the category or a status line instead. Keep that rule for any new hidden-info game.
9. Host taps can arrive faster than React re-renders. When a handler builds the next round payload from `cur`, read it through a ref that you also update synchronously (see `picksRef` in `votecards.js`), or two quick taps overwrite each other.

## Adding a game (checklist)
1. `js/data/registry.js`: add the item under its mode in `GAME_REGISTRY` (`id, icon, plan, component, players:[min,max], duration, scoring, difficulty` + any variant fields) and its `title/description/howToPlay` in `GAME_META_TEXT.en` and `.vi`.
2. Write `function MyGame({ ctx })` in `js/games/*.js`. Use `useGameEngine(rules)` (see `docs/ARCHITECTURE.md` → Game engine), `PlayerSetup`, `Countdown`, `ChallengeCard`, `Decision`, `ScoreBoard`, `GameResult`, `GameShell`; record the result with `useRecordOnFinish(status, () => gameResultEntry(...), ctx.onFinish)`; publish the big-screen stage with `ctx.publish({...})`.
3. Map the `component` key in `gameComponents()` (`js/app.js`).
4. Add the script tag in **`dev.html`** (before `js/app.js`), then run `./tools/build.sh` — it picks the file up automatically and updates `index.html` + `sw.js`.

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
| Vote decks (Most Likely To / Never Have I Ever / Would You Rather) | `js/games/votecards.js`, `VOTE_CARDS` in `js/data/cards.js` |
| Charades / Imposter / Pass the Bomb (hot-seat, reuse mini-game chrome) | `js/games/partygames.js`, banks in `js/data/challenges.js` |
| Venue branding, QR, host controls, Big Screen | `js/venue/*` |
| Wheel skins, cinematic reveals | `js/components/wheel.js`, `js/components/reveals.js` |

## Conventions
- Prefer small pure helpers in `js/engine/*`; components stay declarative.
- Tailwind utility classes (CDN) + a few hand-written animations in `css/app.css`.
- Commit messages: imperative summary, body explains *why*.

## Adding a quiz theme (no engine changes needed)
1. Create `js/data/quiz/<theme>.js` — a plain `<script>` (not Babel) that pushes one pack:
   `(window.JPARTY_QUIZ_PACKS = window.JPARTY_QUIZ_PACKS || []).push({ id, order, icon, accent, plan, difficulty, title:{en,vi}, description:{en,vi}, questions:[…] })`
   Each question: `{ type:'mc'|'tf', difficulty:'easy'|'medium'|'hard', question_en, question_vi, options_en[4], options_vi[4], answer, explanation_en?, explanation_vi?, tags[], adult?, media?, options_media? }`
   (`tf` ignores the options you pass and uses True/False · Đúng/Sai.)
2. Add the `<script src="js/data/quiz/<theme>.js?v=…">` tag in **`dev.html`** before `js/quiz/quizEngine.js`, then run `./tools/build.sh`.
That's it: the sidebar item, registry entry, ⓘ metadata and theme card are generated from the pack.
A pack may also ship reference `tables` plus `generate: [{ use:'flags'|'associations', from:'<table>' }]` to expand rows into questions (see `QUIZ_GENERATORS`).
Content is regenerated with `python3 tools/build-quiz-packs.py <workflow-journal.jsonl>`; edit the packs by hand freely.

## Creator (user-created content)
Three layers, deliberately separate — see `docs/ARCHITECTURE.md` §13:
- **Content**: `js/content/store.js` — IndexedDB (`questions`, `games`, `images`). Async; swapping it for a real API means rewriting only this file.
- **Configuration**: a Game holds `questionIds[]` (**references, never copies** — that is why Duplicate is cheap and a question is reusable).
- **Live session**: unchanged — `useGameEngine` + `session`.

`js/content/customGames.js` turns each custom game into a quiz theme (`custom:<gameId>`), so it plays through the **same** `QuizGame` and the same state machine. `registerCustomQuizThemes()` merges them into `QUIZ_THEMES`; `syncCustomGames()` appends them to `GAME_REGISTRY.quiz.games` — a custom game is a quiz, so there is **no separate mode**; it sits in the Quiz accordion after the built-in themes, and the Creator buttons live in that accordion's footer. Both mutate in place because other modules hold references.

Gotchas: images are object URLs that die on reload, so call `refreshCustomContent()` (not a cached theme) after any content change; question IDs must be unique per theme or the engine de-duplicates them away.

## Performance rules
The build exists because in-browser Babel cost ~3 MB of download and ~760 ms of compile on every single load. Keep it that way:
1. **No two files may declare the same top-level name.** One shared scope means a duplicate `const` is a hard error in the build (and, before the build existed, the later file silently overwrote the earlier one — that is how the Creator lost its inline validation to `venueView.js`). Put anything shared in `js/components/ui.js` or an engine file.
2. **Tailwind classes must be literal strings.** `css/tailwind.css` is generated by scanning the source (`tools/tw-extract.js` → open `tools/tw.html` → save as `css/tailwind.css`). A class assembled at runtime (`` `bg-${color}-500` ``) will be missing in production even though it works in dev. Use inline `style={{…}}` for anything dynamic — the codebase already does.
3. **Don't re-render at 60 fps.** `useTimer` ticks every frame for accuracy but only calls `setState` every 40 ms; `.timer-ring circle` has a CSS transition that hides the gaps. Any new animation should be CSS or canvas, not React state.
4. New heavy third-party libraries load lazily via `loadScript()` (see PeerJS and the QR generator), never from a `<script>` tag in the shell.
