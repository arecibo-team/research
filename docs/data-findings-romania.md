# First look at FIRMS data: Romania

Sampled 2026-11-14 from the FIRMS per-country yearly CSVs (standard processing).
"Veg" means records with `type = 0` (presumed vegetation fire). Counts are raw detections.

| File | All | Veg | Satellites | Jul+Aug | Mar | Oct |
|---|---:|---:|---|---:|---:|---:|
| MODIS 2001 | 5,149 | 5,149 | Terra only | 4,346 | 73 | 260 |
| MODIS 2003 | 2,465 | 2,465 | Terra 1,050 / Aqua 1,415 | 354 | 1,234 | 101 |
| MODIS 2006 | 5,433 | 5,432 | Terra 2,424 / Aqua 3,009 | 2,851 | 864 | 682 |
| MODIS 2010 | 4,457 | 4,457 | Terra 1,704 / Aqua 2,753 | 2,185 | 531 | 289 |
| MODIS 2015 | 3,522 | 3,522 | Terra 1,515 / Aqua 2,007 | 1,586 | 938 | 118 |
| MODIS 2019 | 6,049 | 5,855 | Terra 2,398 / Aqua 3,651 | 458 | 1,527 | 1,739 |
| MODIS 2023 | 1,240 | 1,159 | Terra 501 / Aqua 739 | 175 | 219 | 378 |
| MODIS 2025 | 2,029 | 1,953 | Terra 607 / Aqua 1,422 | 486 | 753 | 70 |
| VIIRS S-NPP 2015 | 14,434 | 13,162 | S-NPP | 6,600 | 2,721 | 298 |
| VIIRS S-NPP 2023 | 5,408 | 4,424 | S-NPP | 811 | 777 | 1,281 |
| VIIRS NOAA-20 2023 | 5,364 | 4,366 | NOAA-20 | 828 | 753 | 1,380 |

## What this tells us

1. **VIIRS sees about 3.7 times more vegetation hotspots than MODIS here** (2015: 13,162 vs 3,522;
   2023: 4,424 vs 1,159). Any chart that stitches the two shows a fake jump in 2012.
2. **The ratio changes with the season**, so one global factor is wrong. VIIRS/MODIS in 2015:
   Jul+Aug 4.2, March 2.9, October 2.5. In 2023: 4.6, 3.5, 3.4. Summer stubble fires are small and short,
   which is exactly what the coarser MODIS misses. Calibration needs at least month (or season) and
   probably land cover as strata.
3. **Early MODIS has no static-source flags.** The sampled MODIS files up to 2015 contain no `type = 2`
   records at all (2019 is the first sampled year that has them), while VIIRS 2015 flags 1,102 of them (about 8%). Industrial heat sources are therefore counted
   as fires in the MODIS era unless we mask them ourselves. Plan: build a static-source mask from the
   locations VIIRS flags as type 2/3 and apply it to every year and sensor.
4. **The MODIS record itself is not homogeneous.** 2001 and early 2002 are Terra only; Aqua joins in
   mid-2002 and contributes more detections than Terra (afternoon overpass, when fires peak). Terra-only
   years must be scaled before they can be compared with later years.
5. **S-NPP and NOAA-20 agree closely** (2023: 4,424 vs 4,366), so they can be treated as interchangeable
   after a light check, which keeps the VIIRS side of the record simple.
6. **A possible Romanian story (hypothesis, needs the harmonized series):** in the early years burning
   peaks in July and August (post-harvest stubble burning), while recent years peak in March and October.
   That would fit stubble burning being restricted after EU accession in 2007. If the harmonized calendar
   shows it, it is a strong demo narrative; if not, we drop it.

Sample files can be re-downloaded with the URL pattern in `docs/hackathon-brief.md`.

## Prototype harmonization results (2026-11-14)

Full 2000-2025 record built by `showcase/scripts/build_data.py`; numbers are visible in the showcase.

- **Fire cell-days** (0.02 deg grid, one count per cell per day), vegetation only, MODIS confidence >= 30,
  VIIRS confidence not `l`, static-source mask from VIIRS type 2/3 locations.
- **Per-month VIIRS/MODIS cell-day ratio** fitted on 2013-2022 ranges from about 2.4 (Sep-Oct) to 6.5 (May).
- **Mixing VIIRS satellites breaks the record.** Using S-NPP + NOAA-20 together as the reference made the
  leave-one-year-out error about 28% with a clear jump at 2018. Using **S-NPP only** brought the error on
  yearly totals down to **3.5%** (worst year 2020, +11%).
- **MODIS product versions are mixed** in the country files (6.2, 6.03, 61.03); check whether this matters.
- The static-source mask removed 852 MODIS "vegetation" detections over 2000-2025.
- Terra-only months (before July 2002) are scaled by a per-month (Terra+Aqua)/Terra factor fitted on 2003-2011.
