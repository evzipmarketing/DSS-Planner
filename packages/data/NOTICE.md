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

## Bortle estimate

`src/black-marble.ts` is a 1° grid of the 90th-percentile brightness in each cell of the NASA Visible Earth image “Earth at Night / Black Marble 2016” grayscale, 0.1° JPEG (`BlackMarble_2016_01deg_gray.jpg`). That image is a US government work derived from VIIRS Day/Night Band composites and is in the public domain. NASA does not endorse this project.

The JPEG is a stretched visualisation, not a calibrated radiance or SQM map. Bright cities are clipped, and a black cell cannot separate a class 1 site from empty ocean, so a black cell is reported as Bortle 2. The class boundaries are a simple threshold on that relative brightness. The number in the app is labelled an estimate. World Atlas 2015 was not bundled: its supplement is CC BY-NC 4.0.

## Gear

`src/gear.ts` is a curated list of nominal manufacturer specifications (aperture, focal length, sensor size, pixel count). Pixel size is derived from sensor size and resolution. Read noise is a planning default, not a lab measurement. The list was not scraped from AstroBin or from any site behind a login.

## Place names

Forward search uses the Open-Meteo Geocoding API (CC BY 4.0). Reverse names for a browser location use OpenStreetMap Nominatim. Time zones come from Open-Meteo.

## Not included

- The full HyperLEDA/PGC galaxy database.
- A complete Gum 1955 coordinate list. Only the 17 cross-ids above are attached, so most Gum-only nebulae, including Gum 12, are absent as Gum objects.
- Abell planetary nebulae that the Strasbourg-ESO table does not name `A n` with Abell as discoverer.
- Collinder, Melotte, Trumpler, and Stock numbers for clusters that the Dias catalogue names only as NGC or IC.
- Five Sharpless entries that did not survive coordinate parsing or were merged into a neighbour.
