# Architecture

Research Runboard is a client-only React single-page application. `src/data.ts` owns the deterministic demonstration records plus pure sorting and search rules. `src/types.ts` owns the five-state run contract. `src/App.tsx` owns the in-memory run collection, search/status view state, derived aggregate counts, local Retry transition, and accessible presentation. `src/styles.css` owns the responsive visual system.

The data flow is one-way: immutable seed records initialize component state; aggregate counts and filtered/grouped views are derived; Retry replaces one failed record with a queued local copy. There is no network, persistence, authentication, router, or external state store. Refreshing restores the seeded snapshot.

Product rationale and acceptance evidence are recorded in the [Research Runboard Agent Note](../.agents/notes/implemented/feature/2026-08-14-research-runboard.md).
