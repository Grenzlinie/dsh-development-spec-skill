# Testing

`npm test -- --run` executes deterministic Vitest checks in Node. Core tests prove seeded replay, explicit input and capped `dt`, horizontal correction, the exact 750ms loss threshold, 800ms grace, active-time scoring, pause/game-over freezing, clean restart, and increasing difficulty. Shell tests statically check the accessible HTML contract, required browser bindings, core dependency boundary, and viewport math.

`npm run typecheck` checks strict TypeScript across source, tests, and configuration. `npm run build` proves the production bundle assembles. A preview smoke request proves the built shell is served. Browser review at desktop and 390x844 separately checks overflow, visible controls/status, pause/blur behavior, and Canvas presentation; Node unit tests do not prove those assembled-browser qualities.
