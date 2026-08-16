# AGENTS.md

## Project

Vanilla HTML5 Canvas Asteroids clone. No framework, no bundler, no dependencies, no `package.json`, no tests, no CI.

## Run / verify

- Open `index.html` in a browser (double-click) or `npx serve .` then visit `http://localhost:3000`.
- There is no test/lint/build step — verification is manual: play the game and watch the browser console.

## Layout

- `game.js` — all game logic + rendering, single file (~420 lines, `'use strict'`, plain script, no ES modules).
- `index.html` — canvas element, styles, and a plain `<script src="game.js">`.
- `favicon.svg`, `README.md` — non-critical.

## Gotchas

- Canvas is 800x600. The `width`/`height` attributes in `index.html` and the hardcoded `W`/`H` in `game.js` must stay in sync.
- Repo language is Spanish: HUD strings (`SCORE`, `NIVEL`, `GAME OVER`) and code comments are Spanish. Keep new UI text/comments in Spanish; `README.md` is Spanish too.
- All game state (`ship`, `bullets`, `asteroids`, `state`, …) is module-level globals in `game.js`. The game is driven by a state machine: `'playing' | 'dead' | 'gameover'` — new flows must fit into `update()`/`draw()` in `game.js:293` / `game.js:396`.
- Input uses edge detection: `pressed(code)` consumes the event, so call it once per frame. `Space` both fires and restarts from `gameover`.
- The loop is `dt`-based with a 0.05s clamp (`loop()` at `game.js:414`); never assume a fixed frame rate.
- Per-size constants (`RADII`, `SPEEDS`, `POINTS`) are arrays indexed by asteroid `size` (1=small, 3=large) — keep index order if extending.
