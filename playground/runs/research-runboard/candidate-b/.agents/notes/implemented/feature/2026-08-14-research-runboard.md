# Agent Note: Research Runboard

Status: implemented

## Problem

A small computational research lab needs one fast, readable place to understand whether active and recent runs are healthy. Failure signals, attention items, progress, ownership, and run metadata are easy to miss in an undifferentiated list, especially on mobile.

## Decision

The shipped product is a client-only React + TypeScript runboard with ten deterministic seeded runs. Its exact state vocabulary and triage order are `Failed`, `Attention`, `Running`, `Queued`, and `Complete`, with newest records first within each group. Aggregate status cards always derive from the complete current in-memory collection, while a separate visible count reflects search and filtering.

Case-insensitive local search covers run name, owner, method/model, run ID, project, and compute target and combines with a single status filter. No-match results explain how to clear both constraints. Failed cards expose a text failure reason and a labelled Retry control; Retry moves that record to `Queued` in memory, preserves the total, and updates aggregate counts. Running cards expose text progress and a semantic progressbar.

The interface uses semantic headings, articles, descriptions, labels, time elements, status text, visible focus, reduced-motion handling, and a responsive layout. At 390px it retains status, owner, time, and failure details without page-level horizontal scrolling.

The product owner first rejected a proposal that omitted `Attention`, used `Succeeded`, excluded Retry, and targeted 360px. The revised exact behavior above, AC1–AC7, scope, and acceptance meaning were explicitly approved by the delegated product owner on 2026-08-14 for case `research-runboard`, candidate `candidate-b`.

## Alternatives considered

**Dense desktop-first data grid.** It supports many columns but degrades poorly on narrow screens and makes failure triage compete with secondary metadata.

**Kanban grouped by status.** It makes state visible but introduces horizontal competition and implies drag-and-drop mutation that this read-mostly product does not support.

**Remote web fonts.** Review removed the only external font request so the visual presentation remains deterministic and fully local.

## Verification

| Criteria | Check and layer | Result |
|---|---|---|
| AC1–AC5 | `npm test -- --run` — jsdom integration assertions for exact five-state counts, ten seeded records, status/newest ordering, required search fields, search/filter AND behavior, empty reset, Retry semantics, status text, and progressbar | PASS on 2026-08-14: 1 file, 9 tests passed, 0 skipped |
| AC6 | `npm run test:layout` — Playwright with local Google Chrome at 390×844; asserts essential mobile content and `documentElement.scrollWidth === clientWidth === 390` | PASS on 2026-08-14: 1/1 browser test in 1.5s |
| AC6 | Manual stylesheet and markup review for `:focus-visible`, programmatic names, text status, essential mobile fields, and `prefers-reduced-motion` | PASS on 2026-08-14; no unresolved accessibility acceptance item. This is not a full screen-reader audit. |
| AC7 | `npm run typecheck` — strict TypeScript static check | PASS on 2026-08-14, exit 0 |
| AC7 | `npm run build` — TypeScript project build plus Vite production bundle | PASS on 2026-08-14, 18 modules transformed; JS 201.64 kB (63.37 kB gzip), CSS 12.71 kB (3.65 kB gzip) |
| Governance | `python3 /Users/siyuliu/Desktop/dsh-development-spec-skill/.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note` | PASS on 2026-08-14 after transition: `governance_pass: true`, all 3 configured commands exit 0, no errors. |
| Standard repair review | `npm ci --no-audit --no-fund`; `npm run typecheck`; `npm test -- --run`; `npm run test:layout`; `npm run build`; governance verify | PASS on 2026-08-14. Hidden first-pass evidence reported no failed acceptance; finite review found no approved-scope defect, so production code remained unchanged. Final exact evidence is in `evidence/final.json`. |

Review compared code, tests, docs, and the approved acceptance meaning. Repairs excluded Playwright specs from Vitest collection, added deterministic DOM cleanup, changed Playwright readiness from proxy-sensitive URL polling to direct port probing, and removed remote font loading. A lockfile is included; generated dependencies, build output, reports, caches, and TypeScript build-info are removed after evidence capture.

## Consequences

- The runboard is immediately demonstrable and reproducible without a service, account, or cluster connection.
- Retry and all counters reset on reload; this is explicit product scope, not durable scheduler behavior.
- Seeded relative times remain a fixed snapshot and are labelled as such.
- Playwright layout verification requires a local Google Chrome installation and permission to bind a loopback port.
- Automated tests cover agreed interactions and browser overflow but do not constitute a complete assistive-technology audit or live cluster test.
