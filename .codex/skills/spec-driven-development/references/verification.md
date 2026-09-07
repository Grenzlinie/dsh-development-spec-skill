# Verification reference

Define verification while writing the proposal, then execute it after implementation.

## Map criteria to checks

For every acceptance criterion, record:

| Field | Required content |
|---|---|
| Criterion | Observable user or system outcome. |
| Check | Exact automated command or manual procedure. |
| Layer | Unit, integration, end-to-end, static, accessibility, security, or human judgment. |
| Oracle | Expected result and tolerance. |
| Evidence | Output, report, screenshot, trace, or reviewer decision. |
| Status | Pass, fail, or unresolved with reason. |

Prefer the lowest-cost check that observes the actual requirement, then add higher-layer checks for integration risks. Mocked tests are valid unit evidence but do not prove external services, packaged artifacts, browsers, concurrency, or migrations.

## Minimum verification sequence

1. Run focused tests for changed behavior.
2. Run static checks owned by the affected language or framework.
3. Build or package the deliverable from a clean dependency state when distribution matters.
4. Run an assembled-path check for user-visible or API-visible behavior.
5. Review the diff against the approved note.
6. Re-run affected checks after repairs.
7. Record exact commands and results in the implemented note and final handoff.

## Failure policy

- Do not weaken a test merely to make it pass.
- Do not call a check successful when it skipped the load-bearing path.
- Distinguish environment blockage from product failure and preserve the error text.
- If a criterion cannot be checked, mark it unresolved and keep the work incomplete unless the human explicitly accepts the limitation.
- Treat repository governance checks as consistency evidence, not product correctness.
