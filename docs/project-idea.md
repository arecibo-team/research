# Project idea (draft for team review)

Status: proposal, 2026-11-14. Nothing here is decided until the team agrees. Open questions are at the end.

## One line

Draw any area and get its fire history from 2000 to today as **one consistent record**, regardless of which
satellite saw the fire, with a plain answer to "is what we see right now normal?" and "what usually comes next?".

Working names to choose from: *Ember Ledger*, *Firecal*, *Hotspot Almanac*.

## Who it is for, and the question each one asks

| User | Question |
|---|---|
| Emergency manager / early warning (e.g. IGSU, ISU county inspectorates) | Is this month's burning unusual for my county? When does our risk season start? |
| Forest and land managers (e.g. Romsilva, protected area administrations such as the Danube Delta) | Where and when does burning recur? Is it getting better after enforcement? |
| Scientists | Can I trust a 25-year trend that crosses the MODIS to VIIRS switch? |
| Firefighters | What does a typical week look like at this time of year here? |

The institutions are examples for the pitch; we have not contacted any of them.

## Problems we solve

1. **The false trend.** In Romania VIIRS reports about 3.7 times more vegetation hotspots than MODIS
   (`docs/data-findings-romania.md`). Stitching the two records invents a jump in 2012.
2. **No local baseline.** FIRMS shows points on a map, not the history of an arbitrary area, so nobody can
   say whether today is unusual.
3. **The baseline is about to be lost.** When MODIS ends, 25 years of reference history are unusable unless
   they are translated into VIIRS terms.
4. **Not every hotspot is a fire.** Industrial sources pollute counts, and early MODIS years carry no flag
   for them.

## How the team repo's research fits in

`Wildfire Data Sources.md` was written for a fire *prediction* model. The challenge asks for a historical
calendar, not a predictor, so prediction cannot be the core: it would score low on Relevance. The catalog
still earns its place in three ways:

| Catalog section | Use in this project |
|---|---|
| 1. Active fire detections (FIRMS) | Core input. |
| 1. Burned area (MODIS MCD64A1), EFFIS | Independent check that the harmonized series follows real burning. |
| 8. Land cover (ESA WorldCover / ESA CCI) | Calibration strata and a "cropland vs forest" split. ESA is a Space Agency Partner. |
| 7/8. Global Surface Water, static sources | Masks for non-burnable areas and industrial heat. |
| 4. Fire danger (FWI from ERA5 or CEMS GEFF) | Stretch: explain an anomaly ("dry spring" vs "more burning"). |
| 16. Derived features: anomalies, climatology | The calendar's anomaly and outlook logic. |

The "prediction" interest becomes a **climatological outlook** built from the harmonized record itself
(see feature 5). That is honest, needs no model training, and directly serves early warning.

## Harmonization method (the scientific core)

Goal: one series in **VIIRS-equivalent units**, so that future data (VIIRS only) needs no transformation and
the MODIS era is the part that gets modelled.

1. **Ingest** FIRMS standard-processing records: MODIS C6.1 (Terra, Aqua), VIIRS S-NPP, NOAA-20, NOAA-21.
2. **Clean.** Keep `type = 0`; drop MODIS confidence below 30 and VIIRS `l`. Build a static-source mask
   from every location VIIRS ever flags as type 2 or 3 (plus a buffer) and apply it to all sensors and
   years, because early MODIS has no such flags.
3. **Common unit: fire cell-days.** Snap detections to a fixed grid (start with 0.02°, about 2 km; test
   1 and 5 km) and count each cell at most once per day. This removes most of the "one fire becomes
   many 375 m pixels" effect before any statistics.
4. **Pair like with like.** Calibrate Aqua against S-NPP (same early-afternoon orbit). Calibrate Terra-only
   periods (2000 to mid-2002) against Terra+Aqua.
5. **Calibrate on the overlap years** (2012 onward) with a ratio or log-linear model per stratum:
   month (or season) x land cover class (x region when data allows).
6. **Validate honestly.** Leave-one-year-out cross-validation on the overlap; report the error and draw
   it as an uncertainty band on every chart. Cross-check yearly totals against MCD64A1 burned area.
7. **Output.** Daily harmonized cell-days per grid cell, flagged as `observed` (VIIRS era) or `modelled`
   (MODIS era), plus the raw hotspots with sensor kept for the CSV export.

Things to verify while building: whether Terra/Aqua orbit drift since about 2020 makes late MODIS years
unusable for calibration (if so, restrict the calibration window).

## Features

Core (must ship):

1. **Area selection:** draw a polygon or rectangle, type lat/lon plus radius, or pick a Romanian county.
2. **Burning calendar:** heatmap of year (rows) x month (columns), 2000 to now, colourblind-safe sequential
   ramp, cells for the MODIS era marked as modelled. Click a cell for the daily view.
3. **"Is now normal?" card:** current month against the historical median and percentile, in one sentence,
   e.g. "October 2026 is the 3rd most active October since 2001, 2.4x the median."
4. **Before/after harmonization toggle:** the same chart with raw stitched counts and with harmonized
   counts. This is the single best demo moment because the 2012 jump disappears.
5. **Outlook:** "Historically, X% of this area's yearly burning happens in the next 6 weeks", plus the
   median and 90th-percentile expectation for the coming weeks.
6. **Exports:** CSV of hotspots in the search (with sensor and harmonized fields), CSV of the monthly
   harmonized table, PNG of the calendar, and a shareable link that reopens the exact view.

Differentiators (pick at most two, by priority):

1. **Uncertainty band** from the cross-validation (cheap once the method exists, high Validity value).
2. **Fire season shift:** season start, peak and length per year, to show whether it is moving.
3. **Cropland vs forest split** using ESA land cover.
4. **One-page briefing** for a selected area, printable for a responder.
5. **FWI context:** this year's fire weather anomaly next to the burning anomaly.

## Architecture (proposal)

- **Pipeline (Python):** download FIRMS per-country CSVs, clean, grid, calibrate, write Parquet files
  (daily cell-days, raw hotspots, calibration table with errors). Country-agnostic: adding a country is one
  command.
- **Web app (static site):** Vite + TypeScript, MapLibre GL for the map and drawing, DuckDB-WASM querying
  the Parquet files in the browser, a chart library for the calendar. Hosted on GitHub Pages: free, public,
  no login, nothing to keep running during judging.
- **Scope:** Romania fully processed; the pipeline proven on one more high-fire country if time allows,
  to show the method is not Romania-specific.
- **Near-real-time:** the current month comes from the FIRMS API (`*_NRT`, needs a MAP_KEY). If the key or
  time is missing, the app uses the latest standard-processing data and says so.

## Pitch story (draft)

"Romania's fire record has a hole in the middle: in 2012 the satellites changed and the numbers quadrupled.
We fixed the record. Now a county inspector can draw their area, see 25 years of burning on one calendar,
and know in one sentence whether this month is normal." Then, if the data supports it, the stubble burning
shift from summer to spring and autumn.

## Timeline to the deadline (Sunday 23:59)

| When | Pipeline / science | Web app | Pitch |
|---|---|---|---|
| Sat afternoon | Download Romania 2000 to 2026, clean, grid | Scaffold, map, area selection | Name, story |
| Sat evening | Calibration + cross-validation | Calendar from a mock Parquet file | |
| Sun morning | Final Parquet, uncertainty, outlook numbers | Wire real data, anomaly card, exports | Screenshots |
| Sun afternoon | Second country if time | Toggle, polish, deploy to Pages | Video or 7 slides |
| Sun 20:00 | Freeze | Freeze, test links in private window | Fill the submission form, submit by 22:00 |

## Open questions for the team

1. **Team size and skills:** who takes the pipeline, the web app and the pitch? This decides how many
   differentiators are realistic.
2. **Harmonized unit:** VIIRS-equivalent cell-days (proposed) or MODIS-equivalent hotspot counts?
3. **Scope:** Romania only, or Romania plus one more country?
4. **Does anyone already have a FIRMS MAP_KEY?** Needed only for the near-real-time current month.
