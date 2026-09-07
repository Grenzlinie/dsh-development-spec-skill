# Development

Requires Node.js 22.x and npm 10.x (the implementation also targets modern evergreen browsers).

```sh
npm ci
npm run dev
```

Use `npm run typecheck`, `npm test -- --run`, and `npm run build` before handoff. `node_modules/`, `dist/`, coverage, Vite caches, and TypeScript build metadata are generated and must not be retained in the candidate artifact.

Product behavior belongs in the owning Agent Note. Reversible renderer or internal module changes may proceed without changing acceptance meaning; changes to controls, timing, scoring, lives, responsive requirements, or accessibility return to product approval.
