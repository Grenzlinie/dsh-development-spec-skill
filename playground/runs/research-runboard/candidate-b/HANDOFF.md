# Research Runboard handoff

## Run

Prerequisite: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The application is a deterministic local demo; refreshing restores the initial ten-run snapshot.

## Verify

```sh
npm run typecheck
npm test -- --run
npm run test:layout
npm run build
python3 /Users/siyuliu/Desktop/dsh-development-spec-skill/.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note
```

`test:layout` expects a local Google Chrome installation and opens the assembled app at 390×844. Exact first-pass results are in `evidence/first-pass.json`; the single standard repair review and final rerun are recorded in `evidence/final.json`.

## Product behavior and limitations

- Search covers run name, owner, method/model, run ID, project, and compute target; it combines with one status filter.
- Aggregate cards always count the complete current in-memory collection. Filtering only changes the visible match count.
- Retry is a local demonstration: it moves a failed item to Queued and updates counts, but does not contact a scheduler or persist after refresh.
- There is no backend, authentication, live polling, job creation/cancellation, detail route, or log viewer.
- Generated dependencies, builds, coverage, caches, and browser reports are intentionally excluded from delivery.
