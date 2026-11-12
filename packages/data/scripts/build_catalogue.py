#!/usr/bin/env python3
"""Build core.json and extended.json for the deep-sky catalogue.

Reads OpenNGC (CC BY-SA 4.0) plus VizieR extracts of older published
catalogues. See packages/data/NOTICE.md and the README for licences.

The script expects the source files already downloaded. Pass --cache for the
VizieR directory and --ngc / --addendum for OpenNGC.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from pathlib import Path

TYPES = {
    "G",
    "GPair",
    "GTrpl",
    "GGroup",
    "ClG",
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
    "Ast",
    "StCl",
    "*",
    "**",
    "*Ass",
    "NonEx",
    "Nova",
    "Other",
    "Dup",
}

NEBULA_TYPES = {"PN", "HII", "EmN", "Neb", "RfN", "SNR", "Cl+N", "DrkN"}
ID_PREFIXES = (
    "Sh2-",
    "NGC",
    "IC",
    "LBN",
    "LDN",
    "UGC",
    "PGC",
    "vdB",
    "ACO",
    "Abell",
    "RCW",
    "Ced",
    "Gum",
    "Arp",
    "Mel",
    "Cr",
    "Tr",
    "St",
    "H400",
    "M",
    "C",
    "B",
)


class Obj:
    def __init__(self) -> None:
        self.ids: set[str] = set()
        self.names: list[str] = []
        self.typ = "Other"
        self.ra = 0.0
        self.dec = 0.0
        self.constellation: str | None = None
        self.major: float | None = None
        self.minor: float | None = None
        self.pa: float | None = None
        self.mag: float | None = None
        self.opacity: int | None = None
        self.note: str | None = None


def canon_prefix(alias: str) -> str:
    for prefix in ID_PREFIXES:
        if alias.startswith(prefix) and (len(alias) == len(prefix) or alias[len(prefix)].isdigit() or prefix.endswith("-")):
            return prefix
    return ""


def preferred_id(ids: set[str]) -> str:
    def rank(alias: str) -> tuple[int, str]:
        prefix = canon_prefix(alias)
        try:
            weight = ID_PREFIXES.index(prefix)
        except ValueError:
            weight = len(ID_PREFIXES)
        return (weight, alias)

    return sorted(ids, key=rank)[0]


def as_int_token(text: str) -> str | None:
    match = re.fullmatch(r"0*(\d+[A-Za-z]?)", text.strip())
    if not match:
        return None
    token = match.group(1)
    digits = re.match(r"(\d+)", token)
    if not digits:
        return None
    return str(int(digits.group(1))) + token[digits.end() :]


def alias(prefix: str, number: str) -> str | None:
    token = as_int_token(number)
    if token is None:
        return None
    if prefix == "Sh2":
        return f"Sh2-{token}"
    return f"{prefix}{token}"


def tokens_from_text(text: str) -> set[str]:
    found: set[str] = set()
    if not text:
        return found
    for match in re.finditer(r"NGC\s*0*(\d+[A-Za-z]?)", text, re.I):
        item = alias("NGC", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"\bIC\s*0*(\d+[A-Za-z]?)", text, re.I):
        item = alias("IC", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"\bUGC\s*0*(\d+)", text, re.I):
        item = alias("UGC", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"\bPGC\s*0*(\d+)", text, re.I):
        item = alias("PGC", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"\bLBN\s*0*(\d+)", text, re.I):
        item = alias("LBN", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"\bLDN\s*0*(\d+)", text, re.I):
        item = alias("LDN", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"SH\s*2[-\s]*0*(\d+)", text, re.I):
        item = alias("Sh2", match.group(1))
        if item:
            found.add(item)
    for match in re.finditer(r"(?:^|[,\s])C\s*0*(\d+)\b", text):
        number = int(match.group(1))
        if 1 <= number <= 109:
            found.add(f"C{number}")
    return found


def number(text: str | None) -> float | None:
    if text is None:
        return None
    cleaned = text.strip().replace(",", "")
    if not cleaned or cleaned in {"*", "?"}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def sexagesimal(text: str, hours: bool) -> float | None:
    raw = text.strip()
    if not raw:
        return None
    sign = -1 if raw[0] == "-" else 1
    body = raw[1:] if raw[0] in "+-" else raw
    if ":" in body:
        parts = body.split(":")
    else:
        parts = body.split()
    if len(parts) < 2:
        return None
    try:
        values = [float(part) for part in parts[:3]]
    except ValueError:
        return None
    while len(values) < 3:
        values.append(0.0)
    angle = sign * (abs(values[0]) + values[1] / 60 + values[2] / 3600)
    return angle * 15 if hours else angle


def rounded(value: float | None, places: int) -> float | None:
    if value is None or math.isnan(value):
        return None
    return round(value, places)


def parse_vizier(path: Path) -> list[list[dict[str, str]]]:
    columns: list[str] = []
    rows: list[dict[str, str]] = []
    tables: list[list[dict[str, str]]] = []
    in_data = False
    header: list[str] = []
    for line in path.read_text(errors="replace").splitlines():
        if line.startswith("#Column"):
            if in_data:
                tables.append(rows)
                columns, rows, in_data, header = [], [], False, []
            parts = line.split("\t")
            columns.append(parts[1].strip() if len(parts) > 1 else "")
            continue
        if line.startswith("----"):
            in_data = True
            header = columns[:]
            continue
        if not in_data or not line.strip() or line.startswith("#"):
            continue
        values = line.split("\t")
        record = {name: (values[index].strip() if index < len(values) else "") for index, name in enumerate(header)}
        rows.append(record)
    if rows:
        tables.append(rows)
    return tables


def j2000(record: dict[str, str]) -> tuple[float, float] | None:
    ra = number(record.get("_RAJ2000"))
    dec = number(record.get("_DEJ2000"))
    if ra is None or dec is None:
        ra = number(record.get("_RA"))
        dec = number(record.get("_DE"))
    if ra is None or dec is None:
        ra_text = record.get("_RA.icrs") or ""
        dec_text = record.get("_DE.icrs") or ""
        ra = sexagesimal(ra_text, hours=True)
        dec = sexagesimal(dec_text, hours=False)
    if ra is None or dec is None:
        return None
    return ra % 360, dec


class Catalogue:
    def __init__(self) -> None:
        self.objects: list[Obj] = []
        self.index: dict[str, Obj] = {}

    def lookup(self, aliases: set[str]) -> Obj | None:
        for item in aliases:
            found = self.index.get(item)
            if found is not None:
                return found
        return None

    def attach(self, obj: Obj, aliases: set[str]) -> Obj:
        for item in aliases:
            current = self.index.get(item)
            if current is None:
                obj.ids.add(item)
                self.index[item] = obj
            elif current is not obj:
                self.merge(current, obj)
                obj = current
        return obj

    def merge(self, keep: Obj, extra: Obj) -> None:
        if keep is extra:
            return
        for item in list(extra.ids):
            self.index[item] = keep
            keep.ids.add(item)
        for name in extra.names:
            self.add_name(keep, name)
        if keep.constellation is None:
            keep.constellation = extra.constellation
        if keep.major is None:
            keep.major = extra.major
        if keep.minor is None:
            keep.minor = extra.minor
        if keep.pa is None:
            keep.pa = extra.pa
        if keep.mag is None or (extra.mag is not None and extra.mag < keep.mag):
            keep.mag = extra.mag
        if keep.opacity is None:
            keep.opacity = extra.opacity
        if extra.note and extra.note != keep.note:
            keep.note = extra.note if not keep.note else f"{keep.note} {extra.note}"
        if keep.typ in {"Other", "Dup"} and extra.typ not in {"Other", "Dup"}:
            keep.typ = extra.typ
        if extra in self.objects:
            self.objects.remove(extra)

    def add_name(self, obj: Obj, name: str) -> None:
        cleaned = re.sub(r"\s+", " ", name).strip(" ,;")
        if not cleaned or len(cleaned) > 80:
            return
        if cleaned not in obj.names:
            obj.names.append(cleaned)

    def add(
        self,
        aliases: set[str],
        typ: str,
        ra: float,
        dec: float,
        constellation: str | None = None,
        major: float | None = None,
        minor: float | None = None,
        pa: float | None = None,
        mag: float | None = None,
        names: list[str] | None = None,
        opacity: int | None = None,
        note: str | None = None,
    ) -> Obj | None:
        aliases = {item for item in aliases if item}
        if not aliases or typ not in TYPES:
            return None
        found = self.lookup(aliases)
        if found is None:
            found = Obj()
            found.typ = typ
            found.ra = ra
            found.dec = dec
            self.objects.append(found)
        found = self.attach(found, aliases)
        if found.constellation is None and constellation:
            found.constellation = constellation
        if found.major is None and major is not None:
            found.major = major
        if found.minor is None and minor is not None:
            found.minor = minor
        if found.pa is None and pa is not None:
            found.pa = pa
        if mag is not None and (found.mag is None or mag < found.mag):
            found.mag = mag
        if found.opacity is None and opacity is not None:
            found.opacity = opacity
        if note and not found.note:
            found.note = note
        for name in names or []:
            self.add_name(found, name)
        if found.typ in {"Other", "Dup"} and typ not in {"Other", "Dup"}:
            found.typ = typ
        return found

    def nearest(self, ra: float, dec: float, types: set[str], limit_arcmin: float) -> Obj | None:
        best: Obj | None = None
        best_distance = math.inf
        second = math.inf
        for obj in self.objects:
            if obj.typ not in types:
                continue
            distance = separation_arcmin(ra, dec, obj.ra, obj.dec)
            if distance > limit_arcmin:
                continue
            if distance < best_distance:
                second = best_distance
                best_distance = distance
                best = obj
            elif distance < second:
                second = distance
        if best is None:
            return None
        # Require the runner-up to sit clearly farther away so a Sharpless
        # region is not glued onto two neighbouring nebulae at once.
        if second < best_distance + 2:
            return None
        return best


def separation_arcmin(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    scale = math.cos(math.radians((dec1 + dec2) / 2))
    return math.hypot((ra1 - ra2) * scale, dec1 - dec2) * 60


def load_openngc(path: Path, catalogue: Catalogue, skip_names: set[str]) -> None:
    with path.open(newline="") as handle:
        reader = csv.reader(handle, delimiter=";")
        header = next(reader)
        index = {name: position for position, name in enumerate(header)}
        for record in reader:
            if len(record) <= index["Dec"]:
                continue
            name = record[index["Name"]].strip()
            if name in skip_names:
                continue
            name_aliases: set[str] = set()
            barnard_name = re.fullmatch(r"B0*(\d+[a-z]?)", name, re.I)
            if barnard_name:
                item = alias("B", barnard_name.group(1))
                if item:
                    name_aliases.add(item)
            melotte_name = re.fullmatch(r"Mel0*(\d+)", name, re.I)
            if melotte_name:
                item = alias("Mel", melotte_name.group(1))
                if item:
                    name_aliases.add(item)
            collinder_name = re.fullmatch(r"Cl0*(\d+)", name, re.I)
            if collinder_name:
                item = alias("Cr", collinder_name.group(1))
                if item:
                    name_aliases.add(item)
            typ = record[index["Type"]].strip()
            ra = sexagesimal(record[index["RA"]], hours=True)
            dec = sexagesimal(record[index["Dec"]], hours=False)
            if ra is None or dec is None or typ not in TYPES:
                continue
            aliases = tokens_from_text(record[index["Identifiers"]])
            aliases |= tokens_from_text(name)
            aliases |= name_aliases
            messier = number(record[index["M"]])
            if messier is not None:
                aliases.add(f"M{int(messier)}")
            for column in ("NGC", "IC"):
                aliases |= tokens_from_text(column + " " + record[index[column]])
            if typ == "Dup":
                master = catalogue.lookup(aliases - tokens_from_text(name))
                if master is not None:
                    catalogue.attach(master, aliases)
                    continue
            names = []
            for chunk in (record[index["Common names"]] or "").split(","):
                if chunk.strip():
                    names.append(chunk.strip())
            major = number(record[index["MajAx"]])
            minor = number(record[index["MinAx"]])
            magnitude = number(record[index["V-Mag"]])
            if magnitude is None:
                magnitude = number(record[index["B-Mag"]])
            if name == "NGC6994":
                typ = "Ast"
            catalogue.add(
                aliases,
                typ,
                ra,
                dec,
                constellation=record[index["Const"]].strip() or None,
                major=major,
                minor=minor,
                pa=number(record[index["PosAng"]]),
                mag=magnitude,
                names=names,
            )


def load_simple(path: Path, catalogue: Catalogue, builder) -> int:
    tables = parse_vizier(path)
    count = 0
    for table in tables:
        for record in table:
            created = builder(record, catalogue)
            if created:
                count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    here = Path(__file__).resolve().parent
    parser.add_argument("--ngc", type=Path, required=True)
    parser.add_argument("--addendum", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=here.parent / "catalogue")
    args = parser.parse_args()
    cache: Path = args.cache
    catalogue = Catalogue()
    load_openngc(args.ngc, catalogue, set())
    load_openngc(args.addendum, catalogue, {"M102"})

    spindle = catalogue.index.get("NGC5866")
    if spindle is not None:
        catalogue.attach(spindle, {"M102"})
        spindle.note = (
            "M102 is identified with NGC 5866, the Spindle Galaxy, the usual modern convention, "
            "rather than as a duplicate of M101."
        )
        catalogue.add_name(spindle, "Spindle Galaxy")

    if "M24" not in catalogue.index:
        catalogue.add(
            {"M24"},
            "StCl",
            274.225,
            -18.483,
            constellation="Sgr",
            major=95,
            minor=35,
            names=["Sagittarius Star Cloud"],
            note="M24 is the Sagittarius star cloud. NGC 6603 is the open cluster inside it and stays a separate object.",
        )

    def add_lbn(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        seq = alias("LBN", record.get("Seq", ""))
        if coords is None or seq is None:
            return False
        aliases = {seq} | tokens_from_text(record.get("Name", ""))
        name = record.get("Name", "").strip()
        sharpless = re.fullmatch(r"S\s*(\d+)", name)
        if sharpless:
            aliases.add(f"Sh2-{int(sharpless.group(1))}")
        cat.add(aliases, "Neb", coords[0], coords[1], major=number(record.get("Diam1")), minor=number(record.get("Diam2")))
        return True

    def add_sharpless(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("Sh2", record.get("Sh2", ""))
        if coords is None or item is None:
            return False
        if item in cat.index:
            cat.add({item}, "HII", coords[0], coords[1], major=number(record.get("Diam")))
            return True
        host = cat.nearest(coords[0], coords[1], NEBULA_TYPES, 8)
        if host is not None:
            cat.attach(host, {item})
            if host.major is None:
                host.major = number(record.get("Diam"))
            return True
        cat.add({item}, "HII", coords[0], coords[1], major=number(record.get("Diam")))
        return True

    def add_barnard(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("B", record.get("Barn", ""))
        if coords is None or item is None:
            return False
        cat.add({item}, "DrkN", coords[0], coords[1], major=number(record.get("Diam")), minor=number(record.get("Diam")))
        return True

    def add_ldn(record: dict[str, str], cat: Catalogue) -> bool:
        ra = sexagesimal(record.get("_RA.icrs", ""), hours=True)
        dec = sexagesimal(record.get("_DE.icrs", ""), hours=False)
        item = alias("LDN", record.get("LDN", ""))
        if ra is None or dec is None or item is None:
            return False
        area = number(record.get("Area"))
        major = 60 * math.sqrt(area) if area and area > 0 else None
        opacity = number(record.get("Opacity"))
        cat.add({item}, "DrkN", ra, dec, major=major, minor=major, opacity=int(opacity) if opacity is not None else None)
        return True

    def add_vdb(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("vdB", record.get("VdB", ""))
        if coords is None or item is None:
            return False
        if item not in cat.index:
            host = cat.nearest(coords[0], coords[1], {"RfN", "Neb", "HII", "EmN"}, 2)
            if host is not None:
                cat.attach(host, {item})
                return True
        cat.add({item}, "RfN", coords[0], coords[1], mag=number(record.get("Vmag")))
        return True

    def add_rcw(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("RCW", record.get("RCW", ""))
        if coords is None or item is None:
            return False
        aliases = {item} | tokens_from_text(record.get("IDs", "").replace(";", ","))
        cat.add(
            aliases,
            "HII",
            coords[0],
            coords[1],
            major=number(record.get("MajAxis")),
            minor=number(record.get("MinAxis")),
        )
        return True

    def add_ced(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("Ced", record.get("Ced", ""))
        if coords is None or item is None:
            return False
        letter = (record.get("m_Ced") or "").strip().lower()
        aliases = {item if not letter else f"{item}{letter}"}
        aliases |= tokens_from_text(record.get("Name", ""))
        cat.add(aliases, "Neb", coords[0], coords[1], major=number(record.get("Dim1")), minor=number(record.get("Dim2")))
        return True

    def add_arp(record: dict[str, str], cat: Catalogue) -> bool:
        coords = j2000(record)
        item = alias("Arp", record.get("Arp", ""))
        if coords is None or item is None:
            return False
        aliases = {item} | tokens_from_text(record.get("Name", ""))
        cat.add(aliases, "G", coords[0], coords[1], major=number(record.get("Size")), names=[])
        return True

    def add_cluster(record: dict[str, str], cat: Catalogue) -> bool:
        name = record.get("Cluster", "").strip()
        match = re.fullmatch(r"(Collinder|Melotte|Trumpler|Stock)\s+(\d+[A-Za-z]?)", name)
        if not match:
            return False
        prefix = {"Collinder": "Cr", "Melotte": "Mel", "Trumpler": "Tr", "Stock": "St"}[match.group(1)]
        item = alias(prefix, match.group(2))
        ra = sexagesimal(record.get("RAJ2000", ""), hours=True)
        dec = sexagesimal(record.get("DEJ2000", ""), hours=False)
        if item is None or ra is None or dec is None:
            return False
        if item not in cat.index:
            host = cat.nearest(ra, dec, {"OCl", "GCl", "Cl+N", "Ast"}, 2)
            if host is not None:
                cat.attach(host, {item})
                return True
        cat.add({item}, "OCl", ra, dec, major=number(record.get("Diam")))
        return True

    def add_abell_pn(record: dict[str, str], cat: Catalogue) -> bool:
        name = record.get("Name", "")
        discoverer = record.get("Disc", "")
        match = re.fullmatch(r"A\s+(\d+)", name.strip())
        if not match or "ABELL" not in discoverer.upper():
            return False
        item = alias("Abell", match.group(1))
        coords = j2000(record)
        if item is None or coords is None:
            return False
        aliases = {item} | tokens_from_text(record.get("Idents", ""))
        cat.add(aliases, "PN", coords[0], coords[1])
        return True

    def add_ugc(record: dict[str, str], cat: Catalogue) -> bool:
        item = alias("UGC", record.get("UGC", ""))
        coords = j2000(record)
        if item is None or coords is None:
            return False
        if item in cat.index:
            cat.add({item}, "G", coords[0], coords[1], major=number(record.get("MajAxis")), minor=number(record.get("MinAxis")), mag=number(record.get("Pmag")))
            return True
        major = number(record.get("MajAxis"))
        mag = number(record.get("Pmag"))
        if not ((mag is not None and mag <= 15) or (major is not None and major >= 2)):
            return False
        cat.add({item}, "G", coords[0], coords[1], major=major, minor=number(record.get("MinAxis")), mag=mag)
        return True

    def add_aco(record: dict[str, str], cat: Catalogue) -> bool:
        item = alias("ACO", record.get("ACO", ""))
        coords = j2000(record)
        if item is None or coords is None:
            return False
        cat.add({item}, "ClG", coords[0], coords[1], mag=number(record.get("m10")))
        return True

    load_simple(cache / "lbn.tsv", catalogue, add_lbn)
    load_simple(cache / "sharpless.tsv", catalogue, add_sharpless)
    load_simple(cache / "barnard.tsv", catalogue, add_barnard)
    load_simple(Path("/tmp/dss-src/ldn.tsv"), catalogue, add_ldn)
    load_simple(cache / "vdb.tsv", catalogue, add_vdb)
    load_simple(cache / "rcw.tsv", catalogue, add_rcw)
    load_simple(cache / "ced.tsv", catalogue, add_ced)
    load_simple(cache / "arp.tsv", catalogue, add_arp)
    load_simple(cache / "ocl.tsv", catalogue, add_cluster)
    load_simple(cache / "sec.tsv", catalogue, add_abell_pn)
    load_simple(cache / "ugc.tsv", catalogue, add_ugc)
    load_simple(cache / "aco.tsv", catalogue, add_aco)

    for line in (here / "gum-crosswalk.tsv").read_text().splitlines():
        gum_number, refs = line.split("\t")
        gum_id = f"Gum{int(gum_number)}"
        aliases = {gum_id} | set(refs.split(","))
        host = catalogue.lookup(aliases - {gum_id})
        if host is not None:
            catalogue.attach(host, {gum_id})

    herschel = {int(line) for line in (here / "herschel400.txt").read_text().splitlines() if line.strip()}
    linked_herschel = 0
    for ngc_number in herschel:
        host = catalogue.index.get(f"NGC{ngc_number}")
        if host is not None:
            host.ids.add("H400")
            linked_herschel += 1

    def is_core(obj: Obj) -> bool:
        if obj.note or obj.names:
            return True
        if obj.typ in {"PN", "SNR", "Ast", "StCl"}:
            return True
        for item in obj.ids:
            if re.fullmatch(r"M\d+", item):
                return True
            if re.fullmatch(r"C\d+", item):
                return True
            if item.startswith(("Sh2-", "LBN", "vdB", "Abell", "Cr", "Mel", "Tr", "St", "Arp", "RCW", "Ced", "Gum")) or item == "H400":
                return True
            if re.fullmatch(r"B\d+[a-z]?", item):
                return True
        if obj.mag is not None and obj.mag <= 12 and obj.typ != "ClG":
            return True
        if obj.typ in NEBULA_TYPES | {"OCl", "GCl"} and obj.major is not None and obj.major >= 2 and obj.typ != "DrkN":
            return True
        return False

    def row(obj: Obj) -> list[object]:
        primary = preferred_id(obj.ids)
        aliases = "|".join(sorted(obj.ids, key=lambda item: (item != primary, item)))
        names = "|".join(obj.names) if obj.names else None
        record: list[object] = [
            primary,
            obj.typ,
            rounded(obj.ra, 5),
            rounded(obj.dec, 5),
            obj.constellation,
            rounded(obj.major, 2),
            rounded(obj.minor, 2),
            rounded(obj.pa, 1),
            rounded(obj.mag, 2),
            names,
            obj.opacity,
            aliases,
        ]
        if obj.note:
            record.append(obj.note)
        return record

    core_rows = []
    extended_rows = []
    for obj in catalogue.objects:
        if not obj.ids:
            continue
        (core_rows if is_core(obj) else extended_rows).append(row(obj))

    args.out.mkdir(parents=True, exist_ok=True)
    core_path = args.out / "core.json"
    extended_path = args.out / "extended.json"
    core_path.write_text(json.dumps(core_rows, separators=(",", ":"), ensure_ascii=False))
    extended_path.write_text(json.dumps(extended_rows, separators=(",", ":"), ensure_ascii=False))

    def has(prefix_pattern: str, rows: list[list[object]]) -> int:
        pattern = re.compile(prefix_pattern)
        return sum(1 for record in rows if any(pattern.fullmatch(part) for part in str(record[11]).split("|")))

    combined = core_rows + extended_rows
    messier = sorted(int(re.fullmatch(r"M(\d+)", part).group(1)) for record in combined for part in str(record[11]).split("|") if re.fullmatch(r"M\d+", part))
    print(f"objects {len(combined)} core {len(core_rows)} ({core_path.stat().st_size} bytes) extended {len(extended_rows)} ({extended_path.stat().st_size} bytes)")
    print("messier", len(set(messier)), "missing", [n for n in range(1, 111) if n not in set(messier)])
    print("herschel linked", linked_herschel)
    labels = {
        "messier": r"M\d+",
        "ngc": r"NGC\d+[A-Z]?",
        "ic": r"IC\d+[A-Z]?",
        "caldwell": r"C\d+",
        "sharpless": r"Sh2-\d+",
        "barnard": r"B\d+[a-z]?",
        "ldn": r"LDN\d+",
        "lbn": r"LBN\d+",
        "vdb": r"vdB\d+",
        "abell-pn": r"Abell\d+",
        "abell-gc": r"ACO\d+",
        "collinder": r"Cr\d+[A-Za-z]?",
        "melotte": r"Mel\d+[A-Za-z]?",
        "trumpler": r"Tr\d+[A-Za-z]?",
        "stock": r"St\d+[A-Za-z]?",
        "arp": r"Arp\d+",
        "herschel": r"H400",
        "rcw": r"RCW\d+",
        "cederblad": r"Ced\d+[a-z]?",
        "gum": r"Gum\d+",
        "ugc": r"UGC\d+",
        "pgc": r"PGC\d+",
    }
    for label, pattern in labels.items():
        print(f"  {label:12} {has(pattern, combined):5}  core {has(pattern, core_rows):5}")
    m42 = catalogue.index.get("M42")
    if m42:
        print("M42", sorted(m42.ids))
    print("M102 on", preferred_id(spindle.ids) if spindle else None, "note" if spindle and spindle.note else "missing")


if __name__ == "__main__":
    main()
