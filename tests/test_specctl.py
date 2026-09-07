from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".codex/skills/spec-driven-development/scripts/specctl.py"


def run_cli(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        cwd=cwd or REPO_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def payload(result: subprocess.CompletedProcess[str]) -> dict[str, object]:
    return json.loads(result.stdout)


def valid_proposed(title: str = "Example") -> str:
    return f"""# Agent Note: {title}

Status: proposed

## Problem

A product problem exists.

## Goals

- Reach an observable result.

## Non-goals

- Avoid unrelated scope.

## Proposal

Deliver the stated behavior.

## Alternatives considered

**Do nothing.** It leaves the problem unresolved.

## Acceptance criteria

- [ ] The behavior is observable.

## Verification plan

- Run an automated check.

## Risks

- The check may miss integration behavior.

## Approval

Approved by the product owner on 2026-08-14.
"""


def valid_implemented(title: str = "Example", archived: bool = False) -> str:
    archive_line = "\nArchived: 2026-08-14" if archived else ""
    return f"""# Agent Note: {title}

Status: implemented{archive_line}

## Problem

A product problem exists.

## Decision

The shipped behavior resolves the problem.

## Alternatives considered

**Do nothing.** It leaves the problem unresolved.

## Verification

The automated check passes.

## Consequences

The behavior is available and adds a maintained check.
"""


class SpecctlTests(unittest.TestCase):
    def test_help_lists_all_commands(self) -> None:
        result = run_cli("--help")
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ("inspect", "bootstrap", "new-note", "check-note", "transition", "verify"):
            self.assertIn(name, result.stdout)

    def test_bootstrap_previews_applies_and_is_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            preview = run_cli("bootstrap", "--root", str(root))
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertFalse((root / "AGENTS.md").exists())
            self.assertIn("AGENTS.md", payload(preview)["create"])

            applied = run_cli("bootstrap", "--root", str(root), "--apply")
            self.assertEqual(applied.returncode, 0, applied.stderr)
            self.assertTrue((root / "AGENTS.md").is_file())
            self.assertTrue((root / "CLAUDE.md").is_symlink())
            self.assertEqual((root / "CLAUDE.md").readlink(), Path("AGENTS.md"))

            repeated = run_cli("bootstrap", "--root", str(root), "--apply")
            self.assertEqual(repeated.returncode, 0, repeated.stderr)
            self.assertEqual(payload(repeated)["create"], [])

    def test_bootstrap_never_overwrites_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            custom = "user-owned instructions\n"
            (root / "AGENTS.md").write_text(custom, encoding="utf-8")
            result = run_cli("bootstrap", "--root", str(root), "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / "AGENTS.md").read_text(encoding="utf-8"), custom)
            self.assertIn("AGENTS.md", payload(result)["skip_existing"])

    def test_new_note_previews_applies_and_refuses_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            args = (
                "new-note",
                "--root",
                str(root),
                "--class",
                "feature",
                "--slug",
                "useful-change",
                "--date",
                "2026-08-14",
            )
            preview = run_cli(*args)
            self.assertEqual(preview.returncode, 0, preview.stderr)
            relative = Path(str(payload(preview)["create"]))
            self.assertFalse((root / relative).exists())

            applied = run_cli(*args, "--apply")
            self.assertEqual(applied.returncode, 0, applied.stderr)
            self.assertIn("Status: proposed", (root / relative).read_text(encoding="utf-8"))

            repeated = run_cli(*args, "--apply")
            self.assertEqual(repeated.returncode, 2)
            self.assertIn("refusing to overwrite", repeated.stderr)

    def test_new_note_rejects_unsafe_slug(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            result = run_cli(
                "new-note",
                "--root",
                raw,
                "--class",
                "feature",
                "--slug",
                "../escape",
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("slug must", result.stderr)

    def test_check_note_rejects_placeholders_and_accepts_complete_proposal(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            note = root / "proposal.md"
            note.write_text(valid_proposed().replace("A product problem exists.", "TODO"), encoding="utf-8")
            invalid = run_cli("check-note", "--root", str(root), "--path", "proposal.md", "--target", "proposed")
            self.assertEqual(invalid.returncode, 1)
            self.assertFalse(payload(invalid)["valid"])

            note.write_text(valid_proposed(), encoding="utf-8")
            valid = run_cli("check-note", "--root", str(root), "--path", "proposal.md", "--target", "proposed")
            self.assertEqual(valid.returncode, 0, valid.stderr)
            self.assertTrue(payload(valid)["valid"])

    def test_implemented_note_rejects_proposal_headings(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            note = root / "implemented.md"
            note.write_text(valid_implemented() + "\n## Acceptance criteria\n\n- A stale checklist.\n", encoding="utf-8")
            result = run_cli(
                "check-note", "--root", str(root), "--path", str(note), "--target", "implemented"
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("proposal-only heading", " ".join(payload(result)["errors"]))

    def test_transition_requires_semantic_rewrite_then_moves(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            source = root / ".agents/notes/proposed/process/2026-08-14-example.md"
            source.parent.mkdir(parents=True)
            source.write_text(valid_proposed(), encoding="utf-8")
            invalid = run_cli(
                "transition", "--root", str(root), "--path", str(source), "--to", "implemented", "--apply"
            )
            self.assertEqual(invalid.returncode, 1)
            self.assertTrue(source.exists())

            source.write_text(valid_implemented(), encoding="utf-8")
            preview = run_cli("transition", "--root", str(root), "--path", str(source), "--to", "implemented")
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertTrue(source.exists())

            applied = run_cli(
                "transition", "--root", str(root), "--path", str(source), "--to", "implemented", "--apply"
            )
            self.assertEqual(applied.returncode, 0, applied.stderr)
            destination = root / ".agents/notes/implemented/process/2026-08-14-example.md"
            self.assertFalse(source.exists())
            self.assertTrue(destination.exists())

    def test_archive_requires_date_after_status(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            source = root / ".agents/notes/implemented/process/2026-08-14-example.md"
            source.parent.mkdir(parents=True)
            source.write_text(valid_implemented(), encoding="utf-8")
            invalid = run_cli("transition", "--root", str(root), "--path", str(source), "--to", "archived")
            self.assertEqual(invalid.returncode, 1)

            source.write_text(valid_implemented(archived=True), encoding="utf-8")
            valid = run_cli("transition", "--root", str(root), "--path", str(source), "--to", "archived")
            self.assertEqual(valid.returncode, 0, valid.stderr)

    def test_check_note_rejects_path_outside_root(self) -> None:
        with tempfile.TemporaryDirectory() as raw, tempfile.TemporaryDirectory() as outside_raw:
            outside = Path(outside_raw) / "note.md"
            outside.write_text(valid_proposed(), encoding="utf-8")
            result = run_cli(
                "check-note", "--root", raw, "--path", str(outside), "--target", "proposed"
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("escapes repository root", result.stderr)

    def test_verify_end_to_end_with_explicit_note_requirement(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bootstrap = run_cli("bootstrap", "--root", str(root), "--apply")
            self.assertEqual(bootstrap.returncode, 0, bootstrap.stderr)
            init = subprocess.run(
                ["git", "init", "-q"], cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
            )
            self.assertEqual(init.returncode, 0, init.stderr)

            no_note = run_cli("verify", "--root", str(root), "--require-note")
            self.assertEqual(no_note.returncode, 1)
            self.assertIn("no changed active Agent Note", " ".join(payload(no_note)["errors"]))

            note = root / ".agents/notes/proposed/process/2026-08-14-example.md"
            note.parent.mkdir(parents=True)
            note.write_text(valid_proposed(), encoding="utf-8")
            verified = run_cli("verify", "--root", str(root), "--require-note")
            self.assertEqual(verified.returncode, 0, verified.stderr)
            self.assertTrue(payload(verified)["pass"])

    def test_invalid_config_command_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            self.assertEqual(run_cli("bootstrap", "--root", str(root), "--apply").returncode, 0)
            config = root / ".agents/spec-driven-development.json"
            config.write_text('{"version": 1, "verification_commands": [{"name": "bad", "command": "echo bad"}]}\n')
            result = run_cli("verify", "--root", str(root))
            self.assertEqual(result.returncode, 2)
            self.assertIn("must be a non-empty string list", result.stderr)


if __name__ == "__main__":
    unittest.main()
