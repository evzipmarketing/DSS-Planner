#!/usr/bin/env python3
"""Rebuild packages/data/catalogue/deep-sky.json.

OpenNGC (CC BY-SA 4.0):
  https://github.com/mattiaverga/OpenNGC
  database_files/NGC.csv and database_files/addendum.csv are semicolon-separated.

Lynds Catalogue of Dark Nebulae, VizieR VII/7A:
  https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=VII/7A/ldn&-out.max=unlimited

Example:
  python3 scripts/build_catalogue.py \\
    --ngc /path/NGC.csv --addendum /path/addendum.csv --ldn /path/ldn.tsv
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

KEEP = {
    "G",
    "GPair",
    "GTrpl",
    "GGroup",
    "OCl",
    "GCl",
    "Cl+N",
    "PN",
    "HII",
    "EmN",
    "Neb",
    "RfN",
    "SNR",
    "DrkN",
}


def sexagesimal(text: str, hours: bool) -> float | None:
    raw = text.strip()
    if not raw:
        return None
    sign = -1 if raw[0] == "-" else 1
    body = raw[1:] if raw[0] in "+-" else raw
    pieces = body.split(":")
    if len(pieces) != 3:
        return None
    a, b, c = (float(piece) for piece in pieces)
    degrees = sign * (a + b / 60 + c / 3600)
    return degrees * 15 if hours else degrees


def number(text: str) -> float | None:
    text = text.strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def rounded(value: float | None, places: int) -> float | None:
    if value is None:
        return None
    return round(value, places)


def common_names(text: str) -> str | None:
    names: list[str] = []
    for chunk in text.split(","):
        name = chunk.strip()
        if name and name not in names:
            names.append(name)
    return "|".join(names) if names else None


def load_openngc(path: Path, rows: list[list[object]], seen: set[str]) -> None:
    with path.open(newline="") as handle:
        reader = csv.reader(handle, delimiter=";")
        header = next(reader)
        index = {name: position for position, name in enumerate(header)}
        for record in reader:
            if len(record) <= index["Dec"]:
                continue
            kind = record[index["Type"]].strip()
            if kind not in KEEP:
                continue
            ra = sexagesimal(record[index["RA"]], hours=True)
            dec = sexagesimal(record[index["Dec"]], hours=False)
            ident = record[index["Name"]].strip()
            if ra is None or dec is None or not ident or ident in seen:
                continue
            magnitude = number(record[index["V-Mag"]])
            if magnitude is None:
                magnitude = number(record[index["B-Mag"]])
            messier = number(record[index["M"]])
            messier_number = int(messier) if messier is not None and abs(messier - round(messier)) < 1e-6 else None
            seen.add(ident)
            rows.append(
                [
                    ident,
                    kind,
                    rounded(ra, 5),
                    rounded(dec, 5),
                    record[index["Const"]].strip() or None,
                    rounded(number(record[index["MajAx"]]), 2),
                    rounded(number(record[index["MinAx"]]), 2),
                    rounded(number(record[index["PosAng"]]), 1),
                    rounded(magnitude, 2),
                    messier_number,
                    common_names(record[index["Common names"]]),
                    None,
                    0,
                ]
            )


def parse_spaced(text: str) -> tuple[float, float, float] | None:
    bits = text.split()
    if len(bits) == 3:
        return float(bits[0]), float(bits[1]), float(bits[2])
    if len(bits) == 2:
        return float(bits[0]), float(bits[1]), 0.0
    return None


def icrs_ra(text: str) -> float | None:
    parsed = parse_spaced(text.strip())
    if not parsed:
        return None
    hours, minutes, seconds = parsed
    return (hours + minutes / 60 + seconds / 3600) * 15


def icrs_dec(text: str) -> float | None:
    raw = text.strip()
    if not raw:
        return None
    sign = -1 if raw[0] == "-" else 1
    body = raw[1:].strip() if raw[0] in "+-" else raw
    parsed = parse_spaced(body)
    if not parsed:
        return None
    degrees, minutes, seconds = parsed
    return sign * (degrees + minutes / 60 + seconds / 3600)


def load_lynds(path: Path, rows: list[list[object]], seen: set[str]) -> None:
    lines = path.read_text(errors="replace").splitlines()
    header = next(index for index, line in enumerate(lines) if line.startswith("LDN\t"))
    for line in lines[header + 1 :]:
        if not line.strip() or line.startswith("#") or line.startswith("----") or "h:m:s" in line:
            continue
        columns = line.split("\t")
        if len(columns) < 12 or not columns[0].strip().isdigit():
            continue
        ra = icrs_ra(columns[10])
        dec = icrs_dec(columns[11])
        if ra is None or dec is None:
            continue
        area = number(columns[5])
        opacity = number(columns[6])
        major = 60 * math.sqrt(area) if area and area > 0 else None
        ident = f"LDN{int(columns[0]):04d}"
        if ident in seen:
            continue
        seen.add(ident)
        rows.append(
            [
                ident,
                "DrkN",
                rounded(ra, 5),
                rounded(dec, 5),
                None,
                rounded(major, 2),
                rounded(major, 2) if major is not None else None,
                None,
                None,
                None,
                None,
                int(opacity) if opacity is not None else None,
                1,
            ]
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    here = Path(__file__).resolve().parent
    parser.add_argument("--ngc", type=Path, required=True)
    parser.add_argument("--addendum", type=Path, required=True)
    parser.add_argument("--ldn", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=here.parent / "catalogue" / "deep-sky.json")
    args = parser.parse_args()
    rows: list[list[object]] = []
    seen: set[str] = set()
    load_openngc(args.ngc, rows, seen)
    load_openngc(args.addendum, rows, seen)
    load_lynds(args.ldn, rows, seen)
    args.out.write_text(json.dumps(rows, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {len(rows)} objects to {args.out}")


if __name__ == "__main__":
    main()
