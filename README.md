# JParty 🎉

**Live demo:** <https://jaydendinh6129.github.io/Lucky-Spin/> (GitHub Pages, served from `main`)

**JParty** is a fun, social party-game platform — for drinking games and friends hanging out, group battles, quiz competitions, card games, and just as happily for classrooms and small-group activities.

It grew out of Party Spinner: the original wheel plus Battle, King of the Table, a theme-based Quiz, Mini Games and Cards, a shared party session, a FREE / PRO / MAX plan layer and (MAX) venue branding with real-time multiplayer. Offline-ready, no build step — plain JSX compiled in the browser.

> **Working on the code (humans or AI agents)?** Start with [`CLAUDE.md`](CLAUDE.md) (conventions, rules, checklists) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (boot order, routing, game-engine state machine, realtime protocol, and a verified index of every top-level function/component per file).

## Run

The source is split into many files that Babel loads over HTTP, so serve the folder (opening `index.html` from `file://` will not work):

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>. On `localhost` (or with `?dev=1`) a **dev plan switcher** appears in Settings so FREE / PRO / MAX can be tested without payments.

## What's inside

### 🎯 Spinner (unchanged experience)
Physics wheel with flick-to-spin, per-theme skins (wooden *bàn nhậu*, casino gold, obsidian flames, rose-gold hearts, steel gauge, neon LEDs), cinematic result reveals (Cupid, clinking mugs, slot machine, devil fireball, rubber stamp, fireworks), items editor, saved wheels, share links, elimination mode, EN/VI.

### 🎮 Game modes (sidebar accordion, max 2 clicks to play)
| Mode | Games |
| --- | --- |
| ⚔️ Battle | Quick Battle (Bo1/3/5) · Best of 3 · Streak Battle · Team Battle · Elimination Battle |
| 👑 King of the Table | Classic King · King Challenge · Last King Standing |
| 🧠 Quiz | **Theme-based**: Animals · Flags Around the World · Representative Animals · Mix — 794 bilingual questions, multiple-choice and true/false, real flag images, Party (15 s + speed bonus) or Classroom (25 s, child-safe) rules, difficulty filter, no repeats within a game or across recent games |
| 🎲 Mini Games | Rock Paper Scissors · 5 Second Rule · Don't Laugh · Reaction Test · Memory · Word Challenge |
| 🃏 Cards | Challenge · Truth · Dare · Wild (re-spin, target, shield, switch, double) · Chaos (everyone, swap, reverse, double round, random target) — effects are real state changes |

Every item has an **ⓘ popover** (hover on desktop, tap on touch) generated from its metadata: description, how to play, players, duration, scoring, difficulty, and the plan that unlocks it.

### 🎓 Creator — custom games & Question Bank
Build your own quiz for a party, a class or a revision session. Custom games live **inside the Quiz mode** next to the built-in themes — they are quizzes, not a separate section:
- **Question Bank** — reusable bilingual questions with search, topic and difficulty filters; seed it from any built-in theme in one tap
- **Create / edit games** — title, icon, add questions from the bank or write new ones inline, drag to reorder, preview, save, **duplicate** (the copy shares the same question records)
- **Images** — upload, preview, replace, remove; on the question and on individual answer options. Stored as real Blobs in IndexedDB on your device, downscaled to ≤1280px — nothing is uploaded anywhere
- **Timer** — per game (none · 10 · 20 · 30 · 60 s) with a per-question override; plus random question order, random answer order and no-repeat
- **Teams** — individual or 2–4 teams, manual or random assignment, live team standings and a team ranking on the result screen
- **Host controls** mid-game: reveal, skip or restart the current question
- **Live classroom** — when phones are connected to the room, the quiz switches from pass-the-phone to everyone-answers-at-once: the host screen is the projector (question, options, a live "3 / 18 answered" bar), each student taps an answer on their own device, the round closes as soon as everybody has answered, and all students are scored together with their own speed bonus

### ⚙️ Contextual settings
The Settings panel shows what the selected mode actually uses: elimination and spin duration for the Spinner, rules / difficulty / question count for the Quiz, a link to the editor for a custom game, and nothing but the global options elsewhere.

### 🎉 Party session
Shared player roster (add / rename / remove / shuffle), per-game selection and teams, game history with "most wins / longest streak / most played / most points" summary. Everything is stored locally.

### 💎 FREE · PRO · MAX
- **FREE** — Spinner with 3 themes, Quick Battle, General Quiz, Rock Paper Scissors, 5 Second Rule, Don't Laugh.
- **PRO** — ≈80 % of the library: 3 more themes (Dating, Office, Hardcore), all Battle and King modes, all quizzes, advanced mini games, all card decks.
- **MAX** — everything in PRO + venue branding (name, tagline, logo upload with validation, brand colours as accents), Venue mode (table, QR join, host controls), real-time multiplayer, Big Screen mode, venue stats.

Locked items stay visible with PRO / 👑 MAX badges; tapping one opens a compact upgrade modal, never during gameplay. Entitlements are centralised in `js/subscription/plans.js` (`FEATURES`, `Entitlements.hasFeature`, `canPlay`). Payments are not wired yet — production shows an honest "coming soon" toast.

### 📱 Real-time multiplayer (MAX)
The host device is authoritative. Phones open `index.html#join=CODE` (QR or 6-letter code), send `PLAYER_JOIN / READY / LEAVE / ACTION`, and receive full `STATE` snapshots (players, current game stage, challenge, timer, scores, winner, pause). Transport runs over **BroadcastChannel** (same browser — Big Screen windows, offline) and **PeerJS/WebRTC** (other devices; signalling via PeerJS' public broker, data stays peer-to-peer). Reconnecting phones keep their identity and just receive the latest snapshot. `#bigscreen` opens a TV window that mirrors the host.

## Architecture

```
index.html                 shell: CSS + ordered <script type="text/babel"> tags
css/app.css                all styles
js/engine/                 util · audio · effects · random · score · timer · player · game (state machine) · session
js/data/                   themes · i18n (EN/VI) · registry (modes, games, metadata, plans) · challenges · cards
js/data/quiz/              one data pack per quiz theme (plain JS, bilingual questions + reference tables)
js/quiz/quizEngine.js      quiz theme registry, question model, generators, rule sets, fair dealing
js/subscription/plans.js   plan state, feature registry, entitlements, IS_DEV
js/venue/                  venue profile & branding · VenueView · BigScreen
js/realtime/               transport (BroadcastChannel + PeerJS) · host session · player client
js/components/             ui · premium (badges, upgrade modal, pricing) · wheel skins · items · reveals · modals · game UI · sidebar
js/games/                  spinner · battle · king · quiz · minigames · cards · party
js/app.js                  App root: global state and routing
sw.js                      service worker (network-first for our files, cache-first for CDN libs)
```

Adding a game: add a `GAME_META_TEXT` entry and a registry item in `js/data/registry.js`, write a component that uses `useGameEngine` + the shared game UI, and map its `component` key in `gameComponents()` (`js/app.js`).

Data is stored only in `localStorage` under `party_spinner_v1`.
