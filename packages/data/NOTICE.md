# Catalogue notices

`catalogue/deep-sky.json` mixes two sources. Application code in this repository is separate from these data licences.

## OpenNGC

NGC, IC, Messier cross-identifications, and the addendum (including Barnard and Melotte entries such as the Horsehead and the Pleiades) come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga, released under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

The committed JSON is a reduced extract: deep-sky types only, with J2000 position, size, magnitude, constellation, Messier number, and common names. It is shared under the same CC BY-SA 4.0 terms.

OpenNGC itself aggregates NASA/IPAC NED, SIMBAD (CDS), HyperLeda, Harold Corwin's NGC/IC notes, and HEASARC tables. See the upstream `NGC_guide.txt` for the source codes.

## Lynds Catalogue of Dark Nebulae

LDN rows come from VizieR catalogue VII/7A, Lynds, B. T. 1962, Astrophysical Journal Supplement, 7, 1. Positions in the file are the J2000 coordinates computed by VizieR. Equivalent diameter is derived here from the published area.

Acknowledge CDS when you use the extract: "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier)."

## What was left out

Stars, duplicate entries, and nonexistent NGC/IC rows are not included. Messier 24, 40, 73, and 102 are absent because OpenNGC classifies them outside the deep-sky types kept here. Regenerating the file is described in `scripts/build_catalogue.py`.
