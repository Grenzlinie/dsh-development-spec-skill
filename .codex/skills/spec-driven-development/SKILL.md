---
name: spec-driven-development
description: Turn a product idea into approved specifications, implementation, verification evidence, and durable decision records. Use when starting or changing a software project where humans should own product intent while agents clarify requirements, write code, test acceptance criteria, review consistency, and keep AGENTS.md, Agent Notes, docs, tests, and code synchronized.
---

# Spec-Driven Development

Convert an idea into verifiable software while keeping product decisions with the human and reversible technical choices with the agent.

## Establish the repository contract

1. Inspect the repository, its instructions, current docs, tests, and dirty work before proposing changes.
2. Run `python3 <skill-dir>/scripts/specctl.py inspect --root <repo>` to identify missing governance artifacts.
3. If the repository has no compatible structure, preview `bootstrap`; review the proposed files, then rerun with `--apply`.
4. Read [workflow.md](references/workflow.md) before non-trivial work. Read [note-format.md](references/note-format.md) when creating or transitioning a decision record. Read [verification.md](references/verification.md) before defining or executing acceptance checks.
5. Treat existing repository instructions as authoritative. Do not create a second source of truth; adapt or link existing owners.

## Run the lifecycle

Follow `DISCOVER → FRAME → SPECIFY → APPROVE → IMPLEMENT → VERIFY → REVIEW → RECORD`.

### DISCOVER

- Inspect current behavior, architecture, tests, docs, history, and constraints.
- Preserve unrelated user changes and record unresolved facts rather than guessing.
- Classify the change as mechanical/local or non-trivial. A change is non-trivial when it changes behavior, architecture, shared contracts, process, testing strategy, stored data, wire formats, or a decision maintainers may revisit.

### FRAME

- Restate the idea as a problem, desired outcome, users, goals, non-goals, and constraints.
- Ask the human only for product decisions that materially change the result.
- Make reversible implementation choices autonomously and record consequential ones in the spec.

### SPECIFY

- For non-trivial work, create a proposed Agent Note before production code:

```sh
python3 <skill-dir>/scripts/specctl.py new-note \
  --root <repo> --class feature --slug concise-topic --apply
```

- Complete every required section. Write acceptance criteria as observable outcomes, not implementation tasks.
- Connect each criterion to a planned check and identify any criteria requiring human judgment.

### APPROVE

- Present the smallest decision packet that lets the human approve the product: Problem, Goals, Non-goals, Acceptance criteria, and high-cost or irreversible choices.
- Do not treat silence as approval. Record explicit approval in the proposed note under `## Approval`.
- Begin production implementation only after approval. Exploration, read-only inspection, and disposable spikes are allowed before approval when they cannot leak into production.

### IMPLEMENT

- Implement in acceptance-criterion-sized slices.
- Add or update tests and user-facing or contributor docs with the code they describe.
- If a product requirement changes, stop and return to APPROVE. If implementation reveals a reversible technical detail, update the note and continue.
- Keep one authoritative home for each fact; link instead of duplicating rules.

### VERIFY

- Execute the checks mapped to every acceptance criterion.
- Capture exact commands, outcomes, and any intentionally unverified conditions.
- Run `python3 <skill-dir>/scripts/specctl.py verify --root <repo> --require-note` for repository governance checks.
- Never equate a mocked or package-level test with an unperformed end-to-end check.

### REVIEW

- Review the diff against the approved note, not only against test results.
- Check behavior, failure paths, security, accessibility or API ergonomics as applicable, documentation drift, and unnecessary scope.
- Repair findings, rerun affected checks, and preserve review evidence.

### RECORD

- Rewrite the note from proposal language into present-tense shipped reality, then validate and move it:

```sh
python3 <skill-dir>/scripts/specctl.py check-note --root <repo> --path <note> --target implemented
python3 <skill-dir>/scripts/specctl.py transition --root <repo> --path <note> --to implemented --apply
```

- `transition` never invents the shipped decision or rewrites prose. It only validates a semantically completed note and moves it.
- Keep rejected proposals only when their verdict prevents a plausible future mistake. Archive implemented notes only when their rationale is no longer current authority.

## Keep human and agent responsibilities distinct

Human decisions include the user outcome, scope, priorities, non-goals, acceptance meaning, policy, irreversible commitments, and trade-offs with material product cost.

Agent decisions include file organization, internal abstractions, libraries within stated constraints, test mechanics, refactoring sequence, and other reversible engineering choices. Escalate an agent decision when it changes approved behavior, cost, risk, schedule, data ownership, security posture, or operational burden.

## Use the deterministic helper safely

- Commands that create or move files preview by default. Add `--apply` only after reviewing the plan.
- The helper refuses to overwrite files.
- Configure repository-specific commands in `.agents/spec-driven-development.json`.
- Use `verify --require-note` only after deciding that the current diff is non-trivial; the helper deliberately does not infer semantics from filenames.
- Run `python3 <skill-dir>/scripts/specctl.py --help` for the complete command interface.

## Completion criteria

Finish only when:

- approved product intent is traceable to an active or implemented Agent Note;
- every acceptance criterion has a recorded check result or an explicit unresolved status;
- code, tests, docs, and current-state decision records agree;
- relevant verification commands pass;
- the final handoff separates completed evidence, limitations, and decisions still owed by the human.
