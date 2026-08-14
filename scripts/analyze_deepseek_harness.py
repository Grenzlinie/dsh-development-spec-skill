#!/usr/bin/env python3
"""Summarize documentation, Agent Note, production, and test co-change in a Git repository."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


PRODUCTION_PREFIXES = ("packages/", "python/", "native/", "examples/", "website/")
TEST_PATTERN = re.compile(r"(?:^|/)(?:tests?|__tests__|fixtures|snapshots?)(?:/|$)|(?:\.test|\.spec)\.[^.]+$")
DOC_NAMES = {"README.md", "AGENTS.md", "CLAUDE.md"}


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.stderr.strip() or "git command failed")
    return result.stdout


def classify(path: str) -> set[str]:
    categories: set[str] = set()
    if path.startswith(".agents/notes/"):
        categories.add("agent_note")
    if path.startswith("docs/") or Path(path).name in DOC_NAMES:
        categories.add("docs")
    if path.startswith(PRODUCTION_PREFIXES) and not TEST_PATTERN.search(path):
        categories.add("production")
    if TEST_PATTERN.search(path):
        categories.add("tests")
    return categories


def commits_and_paths(repo: Path) -> list[tuple[str, list[str]]]:
    raw = git(repo, "log", "--no-merges", "--format=@@%H", "--name-only")
    result: list[tuple[str, list[str]]] = []
    current: str | None = None
    paths: list[str] = []
    for line in raw.splitlines():
        if line.startswith("@@"):
            if current is not None:
                result.append((current, paths))
            current = line[2:]
            paths = []
        elif line:
            paths.append(line)
    if current is not None:
        result.append((current, paths))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo")
    parser.add_argument("--output")
    args = parser.parse_args()
    repo = Path(args.repo).expanduser().resolve()
    records = commits_and_paths(repo)
    counts = {name: 0 for name in ("agent_note", "docs", "production", "tests")}
    combinations = {"agent_note_and_production": 0, "agent_note_and_tests": 0}
    for _commit, paths in records:
        categories: set[str] = set()
        for path in paths:
            categories.update(classify(path))
        for name in counts:
            counts[name] += name in categories
        combinations["agent_note_and_production"] += {"agent_note", "production"}.issubset(categories)
        combinations["agent_note_and_tests"] += {"agent_note", "tests"}.issubset(categories)
    data = {
        "repository": git(repo, "remote", "get-url", "origin").strip(),
        "head": git(repo, "rev-parse", "HEAD").strip(),
        "head_date": git(repo, "show", "-s", "--format=%cI", "HEAD").strip(),
        "all_commits": int(git(repo, "rev-list", "--count", "--all").strip()),
        "first_parent_commits": int(git(repo, "rev-list", "--count", "--first-parent", "HEAD").strip()),
        "non_merge_commits": len(records),
        "commits_touching": counts,
        "cochange": combinations,
        "classification": {
            "agent_note": ".agents/notes/**",
            "docs": "docs/** or README.md, AGENTS.md, CLAUDE.md basename",
            "production": "packages/**, python/**, native/**, examples/**, website/** excluding test-pattern paths",
            "tests": "test/tests/__tests__/fixtures/snapshot path segments or *.test.*/*.spec.*",
        },
    }
    rendered = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
