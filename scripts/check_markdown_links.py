#!/usr/bin/env python3
"""Check that local Markdown link targets exist."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote


LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "#")


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    errors: list[str] = []
    for markdown in sorted(root.rglob("*.md")):
        if any(part in {"node_modules", ".git", ".venv", "dist", "build"} for part in markdown.parts):
            continue
        content = markdown.read_text(encoding="utf-8")
        for raw in LINK.findall(content):
            target_text = raw.strip()
            if target_text.startswith("<") and target_text.endswith(">"):
                target_text = target_text[1:-1]
            if target_text.startswith(SKIP_PREFIXES):
                continue
            path_text = unquote(target_text.split("#", 1)[0])
            if not path_text:
                continue
            target = (markdown.parent / path_text).resolve()
            if not target.exists():
                errors.append(f"{markdown.relative_to(root)} -> {target_text}")
    if errors:
        print("Broken local Markdown links:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("All local Markdown links resolve.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
