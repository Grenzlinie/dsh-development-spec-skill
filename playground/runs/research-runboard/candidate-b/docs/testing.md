# Testing

`npm test -- --run` runs Vitest and Testing Library integration tests over the deterministic seed data. They verify exact status/count semantics, triage ordering, required search fields, combined filtering, no-results recovery, Retry state transition, and programmatic labels/progress. These tests use jsdom; they do not prove real browser layout.

`npm run test:layout` starts the application and uses locally installed Google Chrome through Playwright at 390×844. It checks critical mobile content and document overflow. It is an assembled browser check, not a full screen-reader audit.

`npm run typecheck` checks strict TypeScript contracts. `npm run build` checks the production bundle path. Manual stylesheet review covers visible `:focus-visible`, text status labels, and `prefers-reduced-motion`. Criteria and recorded results live in the Research Runboard Agent Note.
