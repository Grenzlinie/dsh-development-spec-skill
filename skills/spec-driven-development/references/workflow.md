# Workflow reference

Use this reference to decide what must be approved, what an agent may decide, and when to move backward in the lifecycle.

## Decision ownership

| Decision | Default owner | Escalate when |
|---|---|---|
| User problem, audience, desired outcome | Human | Always obtain explicit approval. |
| Goals, non-goals, acceptance meaning | Human | Always obtain explicit approval. |
| Policy, privacy, safety, budget, deadline | Human | Always obtain explicit approval. |
| Public API, durable data, irreversible migration | Human with agent analysis | The choice creates compatibility or recovery cost. |
| Framework or library | Agent | It changes approved constraints, ongoing cost, security, or operations. |
| Internal module boundaries and naming | Agent | It becomes a public or cross-team contract. |
| Test structure and implementation sequence | Agent | It weakens or changes acceptance meaning. |

Approval is a recorded decision, not an absence of objection. Record who approved, when, and the scope of approval. If approval is given in conversation, summarize it in the proposed note without fabricating a quotation.

## Lifecycle state model

`idea → proposed → implemented`

A proposed note can instead become `rejected`. An implemented note can become `archived` only after its decision stops being current authority. Do not archive a proposal; reject it. Do not rewrite an implemented note into a different decision; create a superseding proposal and cross-link both records.

## Backtracking rules

- New product requirement or changed acceptance meaning: return to `FRAME`, update the proposal, and obtain approval again.
- New irreversible technical choice: update `SPECIFY` and obtain approval.
- Reversible implementation detail: record it where useful and continue.
- Failed check caused by implementation: repair and repeat `VERIFY`.
- Failed check reveals a specification defect: return to `SPECIFY`; do not patch the test to preserve a wrong requirement.
- Review finds unnecessary scope: remove it unless the human approves the expansion.

## Triviality decision

A change is mechanical/local only when it does not alter behavior, architecture, shared contracts, process, test strategy, stored or transmitted data, or durable rationale. Formatting, typo correction, and a local rename with no external effect are typical examples. When uncertain, write or update an Agent Note; a short accurate record is cheaper than an implicit decision.

The helper never classifies a diff automatically because filenames cannot reveal semantic impact. The working agent owns this judgment and passes `--require-note` to `verify` for non-trivial work.

## Evidence chain

Maintain this trace:

`idea → approved product decisions → acceptance criterion → implementation location → verification command/result → implemented decision`

An artifact may satisfy more than one link, but no link may be implied. A passing test proves only the behavior it actually executes. Record manual review separately from automated checks.
