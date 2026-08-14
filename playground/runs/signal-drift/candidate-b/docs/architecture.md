# Architecture

Signal Drift is a static Vite + TypeScript application with no runtime service or persistence.

- `src/core.ts` owns the deterministic game model. `stepGame(state, input, dt)` is its load-bearing interface. It reads no DOM or wall clock, caps `dt` at 100ms, and carries its seeded PRNG in state.
- `src/main.ts` is the browser adapter. It translates keyboard/buttons/blur into explicit core operations and uses requestAnimationFrame timestamps only outside the core.
- `src/render.ts` projects state onto Canvas 2D. Resize and device-pixel-ratio handling affect backing pixels only.
- `src/viewport.ts` contains pure Canvas sizing math.
- `index.html` owns semantic instructions, live telemetry, and keyboard-reachable controls outside the Canvas.

The one-way flow is `browser input → pure state update → telemetry + Canvas render`. Current product rationale and acceptance evidence live in the implemented Signal Drift Agent Note.
