# Research Runboard handoff

Responsive React + TypeScript dashboard for monitoring a small research lab's current and recent computational runs. It includes seeded run data, status summaries, status filtering, full-text search, an empty state, mobile navigation, and a run-detail drawer. Failed and Attention runs are prioritized above routine work, show their actionable issue inline, and expose a Retry action that moves the run into the local Queued state.

## Run locally

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Verify

```bash
npm ci
npm test
npm run build
```

The automated suite covers initial data, priority ordering, status filtering, combined search plus filtering, visible failure handling, retry state changes, drawer behavior, and empty-state recovery.

For the optional 390px production browser check on macOS with Google Chrome installed, build first and run the preview server in one terminal:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Then run in another terminal:

```bash
node scripts/mobile-check.mjs
```

To inspect the production build locally:

```bash
npm run preview
```

## Limitations

- Data is deliberately seeded in the client; there is no backend, persistence, or authentication.
- Retry transitions are intentionally local and reset on reload because there is no backend.
- The “New run”, sort control, and top-level Projects/Cluster links are visual product affordances only.
- Status updates are static; the refresh label illustrates expected production behavior.
- The web font request falls back to system fonts when offline.
