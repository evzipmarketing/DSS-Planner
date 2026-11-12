# Catalogue notices

`catalogue/core.json` and `catalogue/extended.json` are derived data. Application code in this repository is separate from these licences.

## OpenNGC (CC BY-SA 4.0)

NGC, IC, the addendum, common names, and the PGC/UGC/Caldwell identifiers printed in OpenNGC come from [OpenNGC](https://github.com/mattiaverga/OpenNGC) by Mattia Verga, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This extract is shared under the same terms. OpenNGC aggregates NASA/IPAC NED, SIMBAD (CDS), HyperLeda, Harold Corwin's notes, and HEASARC tables.

## Other catalogues, via VizieR

CDS asks for this acknowledgement: "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier)."

- Sharpless 1959, ApJS 4, 257 (VII/20)
- Barnard 1927 dark nebulae (VII/220A)
- Lynds 1962 dark nebulae, ApJS 7, 1 (VII/7A)
- Lynds 1965 bright nebulae, ApJS 12, 163 (VII/9)
- van den Bergh 1966 reflection nebulae, AJ 71, 990 (VII/21B)
- Acker et al. 1992 Strasbourg-ESO planetary nebulae (V/84), Abell subset
- Abell, Corwin, Olowin 1989 rich clusters (VII/110A)
- Dias et al. 2002–2015 open clusters (B/ocl), Collinder / Melotte / Trumpler / Stock names only
- Webb 1996 edition of Arp's peculiar galaxies (VII/192)
- Rodgers, Campbell, Whiteoak 1960 (VII/216)
- Cederblad 1946 (VII/231)
- Nilson 1973 Uppsala General Catalogue (VII/26D), with the magnitude and size cut described in the README

J2000 columns computed by VizieR are not part of the original papers.

## Herschel 400 and the partial Gum crosswalk

`scripts/herschel400.txt` is the 400 NGC numbers of the Astronomical League Herschel list. `scripts/gum-crosswalk.tsv` is 17 Gum-number to NGC/IC/Sh2/RCW links. Neither file is a copy of a descriptive catalogue.

## Not included

- The full HyperLEDA/PGC galaxy database.
- A complete Gum 1955 coordinate list. Only the 17 cross-ids above are attached, so most Gum-only nebulae, including Gum 12, are absent as Gum objects.
- Abell planetary nebulae that the Strasbourg-ESO table does not name `A n` with Abell as discoverer.
- Collinder, Melotte, Trumpler, and Stock numbers for clusters that the Dias catalogue names only as NGC or IC.
- Five Sharpless entries that did not survive coordinate parsing or were merged into a neighbour.
