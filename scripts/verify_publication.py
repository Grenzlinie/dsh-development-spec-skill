#!/usr/bin/env python3
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SUMMARY = ROOT / "playground/evaluation/unblinded-summary.json"
FIGS = ROOT / "docs/interpretation/figs"
CARDS = ROOT / "docs/xiaohongshu/cards"


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        signature = handle.read(24)
    if signature[:8] != b"\x89PNG\r\n\x1a\n" or signature[12:16] != b"IHDR":
        raise ValueError(f"not a PNG file: {path}")
    return struct.unpack(">II", signature[16:24])


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    data = json.loads(SUMMARY.read_text(encoding="utf-8"))
    means = data["means"]
    require(data["sample_size"] == 3, "publication expects exactly three paired cases", errors)
    require(means["baseline"]["total_out_of_100"] == 76.0, "baseline mean drifted", errors)
    require(means["treatment"]["total_out_of_100"] == 98.1667, "treatment mean drifted", errors)
    require(means["treatment_minus_baseline"]["total"] == 22.1667, "total delta drifted", errors)
    require(means["baseline"]["first_pass_failed_acceptance"] == 4.0, "baseline first-pass mean drifted", errors)
    require(means["treatment"]["first_pass_failed_acceptance"] == 0.3333, "treatment first-pass mean drifted", errors)

    score_svg = (FIGS / "score-comparison.svg").read_text(encoding="utf-8")
    first_svg = (FIGS / "first-pass.svg").read_text(encoding="utf-8")
    for value in ("73", "97", "75", "99", "80", "98.5", "+22.17"):
        require(value in score_svg, f"score chart is missing {value}", errors)
    for value in ("3", "4", "5", "0.33"):
        require(value in first_svg, f"first-pass chart is missing {value}", errors)

    expected_cards = [
        "01-cover.png",
        "02-problem.png",
        "03-framework.png",
        "04-harness.png",
        "05-experiment.png",
        "06-results.png",
        "07-takeaway.png",
    ]
    for name in expected_cards:
        path = CARDS / name
        require(path.is_file(), f"missing Xiaohongshu card {name}", errors)
        if path.is_file():
            require(png_size(path) == (1080, 1440), f"wrong card dimensions for {name}", errors)

    html = (ROOT / "docs/xiaohongshu/cards.html").read_text(encoding="utf-8")
    require(html.count('<section class="card') == 7, "cards.html must contain seven cards", errors)
    for value in ("22.17", "76.00", "98.17", "12,293", "2,028", "1,508"):
        require(value in html, f"cards.html is missing {value}", errors)

    pdf = ROOT / "docs/interpretation/spec-driven-development-interpretation.pdf"
    require(pdf.is_file(), "interpretation PDF is missing", errors)
    if pdf.is_file():
        require(pdf.stat().st_size > 100_000, "interpretation PDF is unexpectedly small", errors)
        require(pdf.read_bytes()[:5] == b"%PDF-", "interpretation deliverable is not a PDF", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Publication data, charts, PDF, and seven 1080x1440 cards pass.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
