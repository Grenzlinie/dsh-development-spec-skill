# Signal Drift: Relay 7

A compact keyboard-controlled Canvas game. Counter deterministic horizontal interference and keep the signal marker in the central safe band. Each active second earns one point; 750ms continuously outside the band costs a life, followed by 800ms recovery grace.

## Run

Requires Node.js 22.x and npm 10.x.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use Left/Right or A/D to correct the signal. Use P, Escape, or the visible control to pause/resume. Restart is always available; Enter restarts only after game over.

## Verify and build

```sh
npm run typecheck
npm test -- --run
npm run build
npm run preview -- --host 127.0.0.1
```

The first-pass command results and browser-review measurements are recorded in `evidence/first-pass.json`. The standard-repair clean-install results and final review are recorded in `evidence/final.json`. The production output is generated in `dist/` and intentionally excluded from delivery.

## Limitations

- Desktop keyboard play only; touch and pointer steering are out of scope.
- No audio, persistence, leaderboard, configurable difficulty, or multiplayer.
- The semantic shell exposes instructions and live state, but Canvas motion itself is not fully screen-reader playable.
- External web fonts are progressive enhancement; system fallbacks preserve the layout offline.
- The available first-pass browser backend did not naturally emit a real focus-loss event. The blur handler and visible pause path are covered by source review and static tests, but `evidence/final.json` deliberately retains this assembled-browser subcheck as unresolved.
