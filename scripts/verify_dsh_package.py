#!/usr/bin/env python3
"""Verify the installable DeepSeek Harness bundle and npm pack boundary."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {
    "package.json",
    "dsh-plugin/index.js",
    "cordis.patch.yml",
    "skills/spec-driven-development/SKILL.md",
    "skills/spec-driven-development/scripts/specctl.py",
    "README.md",
    "LICENSE",
}
FORBIDDEN_PARTS = {
    ".agents",
    ".codex",
    ".git",
    "playground",
    "evidence",
    "node_modules",
    "dist",
    "coverage",
    ".env",
}


def main() -> int:
    manifest = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    patch = ROOT / manifest["dsh"]["bundle"]["patch"]
    if not patch.is_file():
        raise SystemExit(f"bundle patch does not exist: {patch}")
    if manifest["main"] != "./dsh-plugin/index.js":
        raise SystemExit("package main must be the Cordis plugin entry")

    with tempfile.TemporaryDirectory(prefix="dsh-spec-npm-cache-") as cache:
        result = subprocess.run(
            ["npm", "pack", "--dry-run", "--json", "--ignore-scripts"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            env={**os.environ, "NPM_CONFIG_CACHE": cache},
        )
    report = json.loads(result.stdout)[0]
    files = {entry["path"] for entry in report["files"]}
    missing = sorted(REQUIRED - files)
    if missing:
        raise SystemExit(f"npm package misses required files: {missing}")
    leaked = sorted(
        path for path in files
        if any(part in FORBIDDEN_PARTS for part in Path(path).parts)
        or Path(path).name.startswith(".env")
    )
    if leaked:
        raise SystemExit(f"npm package leaks repository-only files: {leaked}")
    if report.get("entryCount") != len(files):
        raise SystemExit("npm pack entry count does not match file list")
    print(
        f"DeepSeek Harness package passes: {manifest['name']}@{manifest['version']}, "
        f"{len(files)} files, {report['size']} packed bytes."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
