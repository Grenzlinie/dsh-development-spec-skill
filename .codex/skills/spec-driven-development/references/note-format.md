# Agent Note format

Store active notes under `.agents/notes/<state>/<class>/YYYY-MM-DD-<slug>.md`. Supported classes are `feature`, `bug-fix`, `simplification`, `architecture`, `process`, and `testing`.

## Proposed

```markdown
# Agent Note: <title>

Status: proposed

## Problem
## Goals
## Non-goals
## Proposal
## Alternatives considered
## Acceptance criteria
## Verification plan
## Risks
## Approval
```

Describe observable outcomes in `Acceptance criteria`. Map each criterion to a check in `Verification plan`. Record explicit product approval in `Approval` before production implementation.

## Implemented

```markdown
# Agent Note: <title>

Status: implemented

## Problem
## Decision
## Alternatives considered
## Verification
## Consequences
```

Describe shipped reality in present tense. Remove proposal-only headings such as `Proposal`, `Plan`, `Migration plan`, `Acceptance criteria`, and `Risks`. Preserve the intent and alternatives; record exact verification evidence and acknowledged gaps.

## Rejected

Keep the proposal body and replace the status with `Status: rejected — <one-line reason>`. A rejected note records why a plausible option lost. Delete it if the verdict has no durable value.

## Archived

Only implemented notes can be archived. Preserve `Status: implemented` and add `Archived: YYYY-MM-DD` immediately below it before running `transition --to archived`. Archived notes are frozen history and not current authority.

## Transition rule

Rewrite the content before running `transition`. The command validates and moves; it never transforms prose. This keeps semantic responsibility visible and prevents a mechanical state change from claiming unverified implementation.
