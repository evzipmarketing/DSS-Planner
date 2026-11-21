#!/usr/bin/env python3
"""Fill missing catalogue magnitudes with planning estimates.

OpenNGC and the VizieR extracts leave many nebulae, dark clouds, and clusters
without a measured V/B magnitude. Ranking needs a number, so we estimate an
integrated magnitude from a type-typical surface brightness and size.

Large diffuse patches are floored so a 3° reflection veil cannot look as bright
as M42. Measured catalogue magnitudes are never overwritten.

Usage:
  python scripts/fill_magnitudes.py
  python scripts/fill_magnitudes.py --out packages/data/catalogue
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

# Typical surface brightness (mag / arcsec²) for extended objects without photometry.
SURFACE_BRIGHTNESS = {
    "PN": 19.8,
    "HII": 21.2,
    "EmN": 21.6,
    "Cl+N": 20.8,
    "SNR": 22.0,
    "Neb": 22.8,
    "RfN": 23.2,
    "G": 22.6,
    "GPair": 22.8,
    "GTrpl": 22.8,
    "GGroup": 23.0,
    "ClG": 23.5,
    "OCl": 21.0,
    "GCl": 20.5,
    "Ast": 21.5,
    "StCl": 20.0,
    "*Ass": 21.0,
}

# Without measured photometry, never claim brighter than this.
# Floors stay faint so estimates cannot re-enter the shortlist via mag≤10 / size gates.
MAG_FLOOR = {
    "PN": 11.5,
    "HII": 11.0,
    "EmN": 12.0,
    "Cl+N": 10.5,
    "SNR": 12.0,
    "Neb": 12.5,
    "RfN": 12.8,
    "G": 13.0,
    "GPair": 13.0,
    "GTrpl": 13.0,
    "GGroup": 13.5,
    "ClG": 14.0,
    "OCl": 10.5,
    "GCl": 10.5,
    "Ast": 11.0,
    "StCl": 9.5,
    "*Ass": 11.0,
    "DrkN": 13.5,
    "*": 12.5,
    "**": 12.0,
    "Other": 14.0,
    "NonEx": 16.0,
    "Nova": 13.0,
    "Dup": 15.0,
}

# Fallback when there is no size to integrate over.
TYPE_DEFAULT = {
    "PN": 13.0,
    "HII": 12.5,
    "EmN": 13.0,
    "Cl+N": 12.0,
    "SNR": 13.5,
    "Neb": 13.0,
    "RfN": 13.5,
    "DrkN": 14.5,
    "G": 15.0,
    "GPair": 14.5,
    "GTrpl": 14.5,
    "GGroup": 15.0,
    "ClG": 15.5,
    "OCl": 12.0,
    "GCl": 11.5,
    "Ast": 12.5,
    "StCl": 10.5,
    "*Ass": 12.0,
    "*": 13.0,
    "**": 12.5,
    "Other": 14.5,
    "NonEx": 16.5,
    "Nova": 13.5,
    "Dup": 15.5,
}


def round2(value: float) -> float:
    return round(value + 1e-9, 2)


def integrated_from_surface(sb: float, major: float, minor: float | None) -> float:
    width = minor if minor is not None and minor > 0 else major * 0.6
    area = (math.pi / 4.0) * major * 60.0 * width * 60.0
    return sb - 2.5 * math.log10(max(area, 1.0))


def estimate_magnitude(typ: str, major: float | None, minor: float | None, opacity: int | None) -> float:
    if typ == "DrkN":
        # Opacity 1–6 in Lynds: denser clouds are easier photographic targets.
        base = 14.5
        if opacity is not None and 1 <= opacity <= 6:
            base = 15.2 - 0.45 * opacity
        if major is not None and major > 0:
            # Slightly brighter integrated signal for larger silhouettes, still faint.
            size_term = min(1.2, math.log10(max(major, 1.0)))
            return round2(max(MAG_FLOOR["DrkN"], base - size_term))
        return round2(base)

    if typ in SURFACE_BRIGHTNESS and major is not None and major > 0:
        estimated = integrated_from_surface(SURFACE_BRIGHTNESS[typ], major, minor)
        floor = MAG_FLOOR.get(typ, 12.0)
        return round2(max(estimated, floor))

    return round2(TYPE_DEFAULT.get(typ, 14.0))


def fill_rows(rows: list[list[object]]) -> tuple[int, list[list[object]]]:
    filled = 0
    out: list[list[object]] = []
    for row in rows:
        record = list(row)
        while len(record) < 12:
            record.append(None)
        if record[8] is None:
            typ = str(record[1])
            major = record[5] if isinstance(record[5], (int, float)) else None
            minor = record[6] if isinstance(record[6], (int, float)) else None
            opacity = int(record[10]) if isinstance(record[10], (int, float)) else None
            record[8] = estimate_magnitude(typ, major, minor, opacity)
            filled += 1
        out.append(record)
    return filled, out


def main() -> None:
    parser = argparse.ArgumentParser()
    here = Path(__file__).resolve().parent
    parser.add_argument("--out", type=Path, default=here.parent / "catalogue")
    args = parser.parse_args()

    total = 0
    for name in ("core.json", "extended.json"):
        path = args.out / name
        rows = json.loads(path.read_text(encoding="utf-8"))
        filled, updated = fill_rows(rows)
        path.write_text(json.dumps(updated, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        total += filled
        print(f"{name}: filled {filled} / {len(rows)}")
    print(f"total filled {total}")


if __name__ == "__main__":
    main()
