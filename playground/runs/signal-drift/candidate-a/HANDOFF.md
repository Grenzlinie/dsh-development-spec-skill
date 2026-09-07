# Signal Drift handoff

Signal Drift is a compact keyboard-controlled Canvas game presented as a deep-range receiver console. The simulation uses a fixed 120 Hz step and seeded disturbances; `src/game.ts` has no DOM, Canvas, or clock dependency.

## Run and verify

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm test
npm run build
npm run dev
```

Open the URL printed by Vite. Use `WASD` or arrow keys to keep the bright carrier inside the amber ring. `P` or `Escape` pauses/resumes. After game over, `Enter` restarts. Visible Pause/Resume and Restart buttons provide the same actions.

## Production preview

```sh
npm run build
npm run preview
```

## Mobile browser verification

With the local app running, start Chrome headless with DevTools on port `9223`, then run:

```sh
node scripts/browser-check.mjs http://127.0.0.1:9223 http://127.0.0.1:5173/ evidence/mobile-390x844.png
```

The dependency-free check applies a true mobile device viewport, reports layout overflow and the load-bearing DOM text, exercises Pause/Resume, and captures the assembled 390×844 viewport.

## Implementation notes

- `src/game.ts` is the deterministic state engine and can be replayed with an explicit seed and input sequence.
- `src/main.ts` owns keyboard input and a fixed-step accumulator; rendering cannot change game state.
- `src/render.ts` scales the scope to the current Canvas dimensions and `main.ts` accounts for device pixel ratio.
- Every core `stepGame` call is capped at 100 ms. A signal break costs one life after 750 ms outside the ring, then grants 800 ms of damage grace.
- Score is survival time: exactly one point per completed active second. Pause and game over freeze it.
- Losing browser focus clears held movement and pauses the game.
- Automated tests cover replay determinism, seed behavior, control response, immutability, pause, per-second scoring, step clamping, grace lifecycle, life loss, recentering, and game over.

## Limitations

- Steering requires a keyboard; pause and restart also have pointer-accessible buttons.
- The Google Font request is cosmetic. The app falls back to system fonts and remains playable offline.
- Settings, score history, and sound are intentionally not persisted.
