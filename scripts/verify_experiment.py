#!/usr/bin/env python3
"""Verify retained A/B experiment artifacts, hashes, scores, and hygiene."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAYGROUND = ROOT / "playground"
EXPECTED_ORACLES = {
    "research-runboard": "e41f09de7aa21218e7f778b27cb3340409a65915acbf94452567b36611638fbc",
    "seat-hold-api": "77011f410bcd912cfef9767200040f5b2c32fc6f4ca115d8b75f62e5bae5dae4",
    "signal-drift": "6af3754f9e4f530e7f21866ef2c428e2130d6d825e16ab402775138cc1969b1e",
}
CONDITION_HASH = "58f04f52c4dbede40e6ecbba134f6c804526aab430d9bb1fc86bf2c67d6aefee"
MAPPING = {
    "research-runboard": {"candidate-a": "baseline", "candidate-b": "treatment"},
    "seat-hold-api": {"candidate-a": "treatment", "candidate-b": "baseline"},
    "signal-drift": {"candidate-a": "baseline", "candidate-b": "treatment"},
}
FORBIDDEN_DIRS = {"node_modules", ".venv", "dist", "build", "coverage", ".pytest_cache", "__pycache__", ".vite"}
FORBIDDEN_SUFFIXES = {".pyc", ".sqlite", ".sqlite3", ".db", ".tsbuildinfo"}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    lock = load(PLAYGROUND / "protocol/oracle-lock.json")
    require(lock.get("oracles") == EXPECTED_ORACLES, "oracle-lock values differ from expected hashes", errors)
    for case, expected in EXPECTED_ORACLES.items():
        path = PLAYGROUND / "evaluation/oracles" / f"{case}.json"
        require(path.is_file(), f"missing archived oracle: {path.relative_to(ROOT)}", errors)
        if path.is_file():
            require(digest(path) == expected, f"archived oracle hash mismatch: {case}", errors)
    condition_path = PLAYGROUND / "evaluation/condition-map.json"
    require(condition_path.is_file(), "missing archived condition map", errors)
    if condition_path.is_file():
        require(digest(condition_path) == CONDITION_HASH, "condition map hash mismatch", errors)
        require(load(condition_path) == MAPPING, "condition map content mismatch", errors)

    for case in MAPPING:
        for candidate, condition in MAPPING[case].items():
            root = PLAYGROUND / "runs" / case / candidate
            required = [root / "AGENTS.md", root / "HANDOFF.md", root / "evidence/first-pass.json", root / "evidence/hidden-first-pass.json", root / "evidence/final.json"]
            if case in {"research-runboard", "signal-drift"}:
                required.extend([root / "package.json", root / "package-lock.json"])
            elif candidate == "candidate-a":
                required.extend([root / "pyproject.toml", root / "uv.lock"])
            else:
                required.extend([root / "pyproject.toml", root / "requirements.lock"])
            for path in required:
                require(path.is_file(), f"missing candidate artifact: {path.relative_to(ROOT)}", errors)
            for evidence in (root / "evidence").glob("*.json"):
                try:
                    load(evidence)
                except (OSError, json.JSONDecodeError) as exc:
                    errors.append(f"invalid evidence JSON {evidence.relative_to(ROOT)}: {exc}")
            if condition == "treatment":
                notes = list((root / ".agents/notes/implemented").glob("*/*.md"))
                require(bool(notes), f"treatment lacks implemented note: {case}/{candidate}", errors)
                for doc in ("architecture.md", "development.md", "testing.md"):
                    require((root / "docs" / doc).is_file(), f"treatment lacks docs/{doc}: {case}/{candidate}", errors)

    for path in (PLAYGROUND / "runs").rglob("*"):
        if path.is_dir() and path.name in FORBIDDEN_DIRS:
            errors.append(f"forbidden generated directory retained: {path.relative_to(ROOT)}")
        if path.is_file() and (path.suffix in FORBIDDEN_SUFFIXES or path.name == ".coverage"):
            errors.append(f"forbidden generated file retained: {path.relative_to(ROOT)}")

    for case in MAPPING:
        product = load(PLAYGROUND / "evaluation/product-scorecards" / f"{case}.json")
        blind = load(PLAYGROUND / "evaluation/blind-scorecards" / f"{case}.json")
        require(product.get("maximum") == 70, f"product maximum is not 70: {case}", errors)
        require(blind.get("maximum") == 100, f"blind maximum is not 100: {case}", errors)
        for candidate in ("candidate-a", "candidate-b"):
            product_score = product["candidates"][candidate]["score"]
            record = blind["candidates"][candidate]
            require(math.isclose(record["product_score"], product_score), f"product score drift: {case}/{candidate}", errors)
            require(math.isclose(record["product_score"] + record["process_score"], record["total_score"]), f"total score arithmetic error: {case}/{candidate}", errors)

    blind_text = (PLAYGROUND / "evaluation/blind-report.md").read_text(encoding="utf-8").lower()
    require("baseline" not in blind_text and "treatment" not in blind_text, "blind report contains condition labels", errors)
    require(len(list((PLAYGROUND / "evaluation/screenshots/research-runboard").glob("*.png"))) >= 4, "insufficient Runboard screenshots", errors)
    require(len(list((PLAYGROUND / "evaluation/screenshots/signal-drift").glob("*.png"))) >= 6, "insufficient Signal Drift screenshots", errors)

    summary = load(PLAYGROUND / "evaluation/unblinded-summary.json")
    require(summary.get("sample_size") == 3, "unblinded summary sample size mismatch", errors)
    require(math.isclose(summary["means"]["baseline"]["total_out_of_100"], 76.0), "baseline mean mismatch", errors)
    require(math.isclose(summary["means"]["treatment"]["total_out_of_100"], 98.1667, abs_tol=1e-4), "treatment mean mismatch", errors)

    if errors:
        print("Experiment verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Experiment artifacts, hashes, blind scores, mapping, screenshots, and hygiene pass.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
