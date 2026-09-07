# Development

Use Node.js 20 or newer with npm. Install the lockfile exactly with `npm ci`, then run `npm run dev` for a local Vite server. Source lives in `src/`, browser-level checks live in `tests/`, and governance records live in `.agents/`.

Before handoff, run `npm run typecheck`, `npm test -- --run`, `npm run test:layout`, and `npm run build`. Generated `node_modules/`, `dist/`, `coverage/`, Playwright reports, test results, logs, and TypeScript build-info files are ignored and must not be retained in the delivered source tree.
