#!/usr/bin/env python3
"""Generate or verify the DeepSeek Harness Skill projection."""

from __future__ import annotations

import argparse
import filecmp
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".codex" / "skills" / "spec-driven-development"
TARGET = ROOT / "skills" / "spec-driven-development"


def relative_files(root: Path) -> list[Path]:
    return sorted(path.relative_to(root) for path in root.rglob("*") if path.is_file())


def differences() -> list[str]:
    if not TARGET.is_dir():
        return [f"missing projection: {TARGET.relative_to(ROOT)}"]
    source_files = relative_files(SOURCE)
    target_files = relative_files(TARGET)
    messages: list[str] = []
    for path in sorted(set(source_files) - set(target_files)):
        messages.append(f"missing from projection: {path}")
    for path in sorted(set(target_files) - set(source_files)):
        messages.append(f"unexpected in projection: {path}")
    for path in sorted(set(source_files) & set(target_files)):
        if not filecmp.cmp(SOURCE / path, TARGET / path, shallow=False):
            messages.append(f"content differs: {path}")
    return messages


def write_projection() -> None:
    if TARGET.exists():
        shutil.rmtree(TARGET)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE, TARGET)
    print(f"Synced {len(relative_files(TARGET))} files to {TARGET.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="fail when the projection differs")
    mode.add_argument("--write", action="store_true", help="replace the projection from canonical source")
    args = parser.parse_args()
    if args.write:
        write_projection()
        return 0
    drift = differences()
    if drift:
        print("DeepSeek Harness Skill projection is stale:")
        for message in drift:
            print(f"- {message}")
        return 1
    print(f"DeepSeek Harness Skill projection matches canonical source ({len(relative_files(SOURCE))} files).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
