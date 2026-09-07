#!/usr/bin/env python3
"""Deterministic repository helper for spec-driven development."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


CLASSES = ("feature", "bug-fix", "simplification", "architecture", "process", "testing")
ACTIVE_STATES = ("proposed", "implemented", "rejected")
ALL_STATES = (*ACTIVE_STATES, "archived")
CONFIG_PATH = Path(".agents/spec-driven-development.json")
REQUIRED_FILES = (
    Path("AGENTS.md"),
    Path("docs/architecture.md"),
    Path("docs/development.md"),
    Path("docs/testing.md"),
    Path(".agents/notes/README.md"),
    CONFIG_PATH,
)
SKILL_DIR = Path(__file__).resolve().parents[1]
ASSETS_DIR = SKILL_DIR / "assets"
BOOTSTRAP_ASSETS = {
    Path("AGENTS.md"): ASSETS_DIR / "bootstrap/AGENTS.md",
    Path("docs/architecture.md"): ASSETS_DIR / "bootstrap/architecture.md",
    Path("docs/development.md"): ASSETS_DIR / "bootstrap/development.md",
    Path("docs/testing.md"): ASSETS_DIR / "bootstrap/testing.md",
    Path(".agents/notes/README.md"): ASSETS_DIR / "bootstrap/notes-README.md",
    CONFIG_PATH: ASSETS_DIR / "bootstrap/config.json",
}
REQUIRED_HEADINGS = {
    "proposed": (
        "Problem",
        "Goals",
        "Non-goals",
        "Proposal",
        "Alternatives considered",
        "Acceptance criteria",
        "Verification plan",
        "Risks",
        "Approval",
    ),
    "implemented": ("Problem", "Decision", "Alternatives considered", "Verification", "Consequences"),
    "rejected": ("Problem", "Proposal", "Alternatives considered"),
}
FORBIDDEN_IMPLEMENTED_HEADINGS = {
    "Proposal",
    "Plan",
    "Migration plan",
    "Acceptance criteria",
    "Risks",
}
PLACEHOLDER_PATTERNS = (
    re.compile(r"\bTODO\b", re.IGNORECASE),
    re.compile(r"Pending explicit human approval", re.IGNORECASE),
    re.compile(r"\{\{[^}]+\}\}"),
)


class SpecctlError(Exception):
    """A user-correctable contract violation."""


def root_path(raw: str) -> Path:
    root = Path(raw).expanduser().resolve()
    if not root.is_dir():
        raise SpecctlError(f"repository root is not a directory: {root}")
    return root


def confined_path(root: Path, raw: str) -> Path:
    candidate = Path(raw).expanduser()
    path = (root / candidate).resolve() if not candidate.is_absolute() else candidate.resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise SpecctlError(f"path escapes repository root: {path}") from exc
    return path


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SpecctlError(f"cannot read {path}: {exc}") from exc


def write_new(path: Path, content: str) -> None:
    if path.exists() or path.is_symlink():
        raise SpecctlError(f"refusing to overwrite existing path: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
    except OSError as exc:
        raise SpecctlError(f"cannot create {path}: {exc}") from exc


def command_inspect(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    required = {str(path): (root / path).is_file() for path in REQUIRED_FILES}
    claude = root / "CLAUDE.md"
    claude_ok = claude.is_symlink() and os.readlink(claude) == "AGENTS.md"
    note_counts: dict[str, int] = {}
    for state in ALL_STATES:
        state_root = root / ".agents/notes" / state
        note_counts[state] = sum(1 for path in state_root.glob("*/*.md") if path.is_file())
    missing = [path for path, present in required.items() if not present]
    if not claude_ok:
        missing.append("CLAUDE.md -> AGENTS.md")
    emit(
        {
            "root": str(root),
            "ready": not missing,
            "required": required,
            "claude_symlink": claude_ok,
            "note_counts": note_counts,
            "missing": missing,
        }
    )
    return 0


def command_bootstrap(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    creates: list[tuple[Path, str]] = []
    skipped: list[str] = []
    for relative, asset in BOOTSTRAP_ASSETS.items():
        destination = root / relative
        if destination.exists() or destination.is_symlink():
            skipped.append(str(relative))
            continue
        creates.append((destination, read_text(asset)))
    claude = root / "CLAUDE.md"
    create_symlink = not claude.exists() and not claude.is_symlink()
    if not create_symlink:
        skipped.append("CLAUDE.md")
    payload = {
        "root": str(root),
        "apply": bool(args.apply),
        "create": [str(path.relative_to(root)) for path, _ in creates]
        + (["CLAUDE.md -> AGENTS.md"] if create_symlink else []),
        "skip_existing": skipped,
    }
    if args.apply:
        for destination, content in creates:
            write_new(destination, content)
        if create_symlink:
            try:
                claude.symlink_to("AGENTS.md")
            except OSError as exc:
                raise SpecctlError(f"cannot create {claude}: {exc}") from exc
    emit(payload)
    return 0


def normalize_slug(raw: str) -> str:
    slug = raw.strip().lower()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise SpecctlError("slug must contain lowercase letters, digits, and single hyphens only")
    return slug


def title_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-"))


def command_new_note(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    slug = normalize_slug(args.slug)
    note_date = args.date or dt.date.today().isoformat()
    try:
        dt.date.fromisoformat(note_date)
    except ValueError as exc:
        raise SpecctlError("date must use YYYY-MM-DD") from exc
    relative = Path(".agents/notes/proposed") / args.note_class / f"{note_date}-{slug}.md"
    destination = root / relative
    if destination.exists() or destination.is_symlink():
        raise SpecctlError(f"refusing to overwrite existing note: {relative}")
    template = read_text(ASSETS_DIR / "note-proposed.md.tmpl")
    content = template.replace("{{ title }}", title_from_slug(slug))
    if args.apply:
        write_new(destination, content)
    emit({"root": str(root), "apply": bool(args.apply), "create": str(relative)})
    return 0


def headings(content: str) -> list[str]:
    return re.findall(r"^## (.+?)\s*$", content, flags=re.MULTILINE)


def validate_note_content(content: str, target: str, *, archived: bool = False) -> list[str]:
    errors: list[str] = []
    first_lines = content.splitlines()[:5]
    if not first_lines or not re.fullmatch(r"# Agent Note: .+", first_lines[0]):
        errors.append("first line must be '# Agent Note: <title>'")

    status_lines = [line for line in content.splitlines() if line.startswith("Status: ")]
    if len(status_lines) != 1:
        errors.append("note must contain exactly one Status line")
    elif target == "rejected":
        if not re.fullmatch(r"Status: rejected — .+", status_lines[0]):
            errors.append("rejected status must be 'Status: rejected — <one-line reason>'")
    else:
        expected = f"Status: {target}"
        if status_lines[0] != expected:
            errors.append(f"status must be exactly '{expected}'")

    actual_headings = headings(content)
    for required in REQUIRED_HEADINGS[target]:
        if required not in actual_headings:
            errors.append(f"missing required heading: ## {required}")
    positions = [actual_headings.index(item) for item in REQUIRED_HEADINGS[target] if item in actual_headings]
    if positions != sorted(positions):
        errors.append("required headings are out of order")
    if target == "implemented":
        for forbidden in sorted(FORBIDDEN_IMPLEMENTED_HEADINGS.intersection(actual_headings)):
            errors.append(f"implemented note contains proposal-only heading: ## {forbidden}")
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(content):
            errors.append(f"unresolved placeholder matches: {pattern.pattern}")
    if archived:
        lines = content.splitlines()
        try:
            status_index = lines.index("Status: implemented")
        except ValueError:
            status_index = -1
        if status_index < 0 or status_index + 1 >= len(lines):
            errors.append("archived note must add Archived date immediately after Status")
        elif not re.fullmatch(r"Archived: \d{4}-\d{2}-\d{2}", lines[status_index + 1]):
            errors.append("archived note must add 'Archived: YYYY-MM-DD' immediately after Status")
        else:
            try:
                dt.date.fromisoformat(lines[status_index + 1].split(": ", 1)[1])
            except ValueError:
                errors.append("Archived date is not a valid calendar date")
    return errors


def checked_note(root: Path, raw_path: str, target: str, *, archived: bool = False) -> tuple[Path, list[str]]:
    path = confined_path(root, raw_path)
    if not path.is_file():
        raise SpecctlError(f"note is not a file: {path}")
    if path.suffix != ".md":
        raise SpecctlError("note path must end in .md")
    return path, validate_note_content(read_text(path), target, archived=archived)


def command_check_note(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    path, errors = checked_note(root, args.path, args.target)
    emit(
        {
            "path": str(path.relative_to(root)),
            "target": args.target,
            "valid": not errors,
            "errors": errors,
        }
    )
    return 0 if not errors else 1


def note_location(root: Path, path: Path) -> tuple[str, str]:
    try:
        relative = path.relative_to(root / ".agents/notes")
    except ValueError as exc:
        raise SpecctlError("note must live under .agents/notes") from exc
    parts = relative.parts
    if len(parts) != 3 or parts[0] not in ALL_STATES or parts[1] not in CLASSES:
        raise SpecctlError("note path must be .agents/notes/<state>/<class>/<file>.md")
    return parts[0], parts[1]


def command_transition(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    path = confined_path(root, args.path)
    if not path.is_file():
        raise SpecctlError(f"note is not a file: {path}")
    source_state, note_class = note_location(root, path)
    allowed = {
        "proposed": {"implemented", "rejected"},
        "implemented": {"archived"},
        "rejected": set(),
        "archived": set(),
    }
    if args.to not in allowed[source_state]:
        raise SpecctlError(f"invalid transition: {source_state} -> {args.to}")
    validation_target = "implemented" if args.to == "archived" else args.to
    errors = validate_note_content(read_text(path), validation_target, archived=args.to == "archived")
    if errors:
        emit(
            {
                "from": str(path.relative_to(root)),
                "to_state": args.to,
                "valid": False,
                "errors": errors,
            }
        )
        return 1
    destination = root / ".agents/notes" / args.to / note_class / path.name
    if destination.exists() or destination.is_symlink():
        raise SpecctlError(f"refusing to overwrite transition destination: {destination}")
    if args.apply:
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            path.rename(destination)
        except OSError as exc:
            raise SpecctlError(f"cannot move note: {exc}") from exc
    emit(
        {
            "apply": bool(args.apply),
            "from": str(path.relative_to(root)),
            "to": str(destination.relative_to(root)),
            "valid": True,
        }
    )
    return 0


def load_config(root: Path) -> dict[str, Any]:
    path = root / CONFIG_PATH
    if not path.is_file():
        raise SpecctlError(f"missing configuration: {CONFIG_PATH}")
    try:
        data = json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        raise SpecctlError(f"invalid JSON in {CONFIG_PATH}: {exc}") from exc
    if not isinstance(data, dict) or data.get("version") != 1:
        raise SpecctlError("configuration must be an object with version 1")
    commands = data.get("verification_commands", [])
    if not isinstance(commands, list):
        raise SpecctlError("verification_commands must be a list")
    for index, entry in enumerate(commands):
        if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
            raise SpecctlError(f"verification_commands[{index}] must have a string name")
        command = entry.get("command")
        if not isinstance(command, list) or not command or not all(isinstance(item, str) and item for item in command):
            raise SpecctlError(f"verification_commands[{index}].command must be a non-empty string list")
    return data


def changed_note_present(root: Path) -> tuple[bool, str | None]:
    try:
        completed = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except OSError as exc:
        return False, f"cannot run git status: {exc}"
    if completed.returncode != 0:
        return False, completed.stderr.strip() or "git status failed"
    pattern = re.compile(r"(?:^| -> )\.agents/notes/(?:proposed|implemented|rejected)/[^/]+/[^/]+\.md$")
    for raw_line in completed.stdout.splitlines():
        path_text = raw_line[3:] if len(raw_line) >= 4 else ""
        if pattern.search(path_text):
            return True, None
    return False, None


def iter_notes(root: Path) -> Iterable[tuple[Path, str, bool]]:
    notes_root = root / ".agents/notes"
    for state in ALL_STATES:
        for path in sorted((notes_root / state).glob("*/*.md")):
            if path.is_file():
                yield path, "implemented" if state == "archived" else state, state == "archived"


def governance_errors(root: Path, config: dict[str, Any], require_note: bool) -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_FILES:
        if not (root / relative).is_file():
            errors.append(f"missing required file: {relative}")
    if config.get("require_claude_symlink", True):
        claude = root / "CLAUDE.md"
        if not claude.is_symlink() or os.readlink(claude) != "AGENTS.md":
            errors.append("CLAUDE.md must be a relative symlink to AGENTS.md")
    for path, target, archived in iter_notes(root):
        for error in validate_note_content(read_text(path), target, archived=archived):
            errors.append(f"{path.relative_to(root)}: {error}")
    if require_note:
        present, detail = changed_note_present(root)
        if detail:
            errors.append(detail)
        elif not present:
            errors.append("--require-note was set but git status contains no changed active Agent Note")
    return errors


def run_verification_commands(root: Path, config: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for entry in config.get("verification_commands", []):
        command = entry["command"]
        try:
            completed = subprocess.run(
                command,
                cwd=root,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            results.append(
                {
                    "name": entry["name"],
                    "command": command,
                    "returncode": completed.returncode,
                    "stdout": completed.stdout,
                    "stderr": completed.stderr,
                }
            )
        except OSError as exc:
            results.append(
                {
                    "name": entry["name"],
                    "command": command,
                    "returncode": 127,
                    "stdout": "",
                    "stderr": str(exc),
                }
            )
    return results


def command_verify(args: argparse.Namespace) -> int:
    root = root_path(args.root)
    config = load_config(root)
    errors = governance_errors(root, config, args.require_note)
    command_results = [] if errors or args.no_run else run_verification_commands(root, config)
    commands_pass = all(result["returncode"] == 0 for result in command_results)
    payload = {
        "root": str(root),
        "governance_pass": not errors,
        "errors": errors,
        "commands_skipped": bool(errors or args.no_run),
        "commands": command_results,
        "pass": not errors and commands_pass,
    }
    emit(payload)
    return 0 if payload["pass"] else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="specctl",
        description="Preview, validate, and verify spec-driven repository governance.",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="inspect repository governance")
    inspect_parser.add_argument("--root", default=".")
    inspect_parser.set_defaults(handler=command_inspect)

    bootstrap_parser = subparsers.add_parser("bootstrap", help="preview or create governance files")
    bootstrap_parser.add_argument("--root", default=".")
    bootstrap_parser.add_argument("--apply", action="store_true")
    bootstrap_parser.set_defaults(handler=command_bootstrap)

    new_parser = subparsers.add_parser("new-note", help="preview or create a proposed Agent Note")
    new_parser.add_argument("--root", default=".")
    new_parser.add_argument("--class", dest="note_class", choices=CLASSES, required=True)
    new_parser.add_argument("--slug", required=True)
    new_parser.add_argument("--date", help="override date for reproducible tooling tests")
    new_parser.add_argument("--apply", action="store_true")
    new_parser.set_defaults(handler=command_new_note)

    check_parser = subparsers.add_parser("check-note", help="validate note content for a lifecycle target")
    check_parser.add_argument("--root", default=".")
    check_parser.add_argument("--path", required=True)
    check_parser.add_argument("--target", choices=ACTIVE_STATES, required=True)
    check_parser.set_defaults(handler=command_check_note)

    transition_parser = subparsers.add_parser("transition", help="preview or move a semantically rewritten note")
    transition_parser.add_argument("--root", default=".")
    transition_parser.add_argument("--path", required=True)
    transition_parser.add_argument("--to", choices=("implemented", "rejected", "archived"), required=True)
    transition_parser.add_argument("--apply", action="store_true")
    transition_parser.set_defaults(handler=command_transition)

    verify_parser = subparsers.add_parser("verify", help="validate governance and run configured checks")
    verify_parser.add_argument("--root", default=".")
    verify_parser.add_argument("--require-note", action="store_true")
    verify_parser.add_argument("--no-run", action="store_true", help="validate governance without running commands")
    verify_parser.set_defaults(handler=command_verify)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.handler(args))
    except SpecctlError as exc:
        print(f"specctl: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
