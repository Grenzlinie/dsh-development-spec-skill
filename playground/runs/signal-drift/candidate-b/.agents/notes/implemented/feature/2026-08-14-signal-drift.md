# Agent Note: Signal Drift Browser Game

Status: implemented

## Problem

Players need a compact keyboard-controlled browser game in which maintaining a horizontally drifting signal is immediately understandable, tense, and fair. Its rules must be deterministic and testable independently of browser frame timing.

## Decision

Signal Drift: Relay 7 is a single-screen Canvas + TypeScript receiver game. It starts automatically at score 0 and three lives. Left/Right and A/D correct a horizontal signal marker against seeded disturbances. One point is awarded per full active survival second. Staying continuously outside the central safe band for 750ms costs exactly one life, recenters the marker, and starts 800ms of grace; re-entry before the threshold clears exposure.

P, Escape, and the visible Pause/Resume button pause or resume. Blur calls the same visible pause path. Enter restarts only after game over, while the always-visible Restart button works at any time. Both restart paths reconstruct the same seeded initial state and clear input, score, lives, timers, grace, pause, and game-over state.

`src/core.ts` owns a DOM-free reducer-style state model with explicit input and `dt`, a 100ms per-call cap, and PRNG state. `src/main.ts` adapts browser events; `src/render.ts` draws the responsive DPR-aware CRT scope without changing normalized game coordinates. Semantic instructions, live score/lives/status, and native controls remain outside the accessibly named Canvas. Product owner approval was recorded on 2026-08-14 after three decision rounds.

## Alternatives considered

- Two-axis movement and a side-scrolling avoider were rejected in favor of the approved horizontal tuning task.
- Immediate loss was rejected in favor of the exact 750ms continuous threshold and 800ms grace.
- Locked-only scoring was rejected; active survival time is the scoring source.
- Wall-clock reads inside the core were rejected to preserve replay determinism.

## Verification

- `npm run typecheck`: PASS, exit 0.
- `npm test -- --run`: PASS, 2 files and 16 tests.
- `npm run build`: PASS, 7 modules transformed; production bundle assembled.
- `python3 ../../../../.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note`: PASS; governance and all three configured checks passed.
- Vite preview assembled-browser review: PASS at 1280x800 and 390x844. At both sizes, scroll and client dimensions were equal and Canvas, controls, score, lives, and status were visible.
- Pause button and P/Escape: PASS; the visible paused state appeared and score froze. Game-over Enter restart: PASS; zero lives / score 009 reset to three lives / score 000 / locked state.
- Focus-loss assembled check: UNRESOLVED. Opening a second in-app tab did not emit blur. The explicit `window` blur handler and its call to the visible pause path are statically tested and reviewed, but are not represented as an end-to-end browser result.
- Full first-pass command results, criterion mapping, viewport measurements, and the unresolved blur subcheck are preserved in `evidence/first-pass.json`.
- Standard repair on 2026-08-14 found no failed acceptance and made no product changes. `npm ci`, typecheck, all 16 tests, production build, and governance verification passed again. The exact final results and the intentionally retained blur environment gap are preserved in `evidence/final.json`.

## Consequences

The shipped artifact is compact, deterministic, keyboard-first, responsive, and has no runtime service or stored data. Touch/pointer steering, audio, persistence, leaderboards, multiplayer, campaigns, upgrades, and configurable difficulty remain out of scope. Canvas motion is not fully screen-reader playable despite the semantic shell. A capable later runner may perform the remaining real focus-loss event check; standard repair intentionally retains that environment gap because hidden first-pass reported no failed acceptance and all other criteria have passing evidence.
