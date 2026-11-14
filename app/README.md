# Ember Ledger

*Working name; the team decides the final name.* NASA Space Apps 2026, challenge
**Harmonization of MODIS and VIIRS Hot Spots**.

> We turn 25 years of NASA fire satellite data into one consistent record that tells fire services where and when
> burning will happen next, so they can place patrols and crews before the fires start instead of after.

## What it does

| View | For whom | What it answers |
|---|---|---|
| **Calendar** | Everyone | 25 years of burning on one years × months calendar, harmonized across MODIS and VIIRS. "Is this month normal?" with rank, ratio to median and usual range. Trend with significance, season window per year, raw-vs-harmonized toggle. |
| **Prevention** | Prevention teams, APIA, protected-area managers | Places (2 km cells) that burn almost every year, their usual window, and a backtest showing how well past recurrence predicts later fires. |
| **Planning** | Emergency inspectorates (IGSU / ISU) | Weekly workload curve with median and 90th-percentile ceiling; counties ranked by expected activity in the next 6 weeks (where to pre-position crews). |
| **Fires** | Responders, analysts | Hotspots grouped into fires; largest fires; how a given fire ranks against every fire since 2012. |
| **Data & export** | Analysts | Hotspot map per year with removed points shown; CSV of hotspots, monthly harmonized table and fires; calendar PNG. |
| **Method** | Judges, scientists | Cleaning, unit, harmonization, validation (leave-one-year-out error 4.0% on yearly totals), limits. |

Any area works: a county, a drawn box or shape, or a point and radius. Every view is a shareable link.

## Run locally

From the repo root:

```sh
python3 -m http.server 8000
# open http://localhost:8000/app/
```

No build step. Libraries load from CDNs: Leaflet 1.9.4, Leaflet.draw 1.0.4, d3 7.9.0, Observable Plot 0.6.16.

## Rebuild the data

```sh
# 1. FIRMS country archives (no key) + county boundaries (geoBoundaries ROU ADM1, CC BY 4.0)
curl -L -o /tmp/ro_adm1.geojson https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ROU/ADM1/geoBoundaries-ROU-ADM1_simplified.geojson
python3 app/pipeline/build.py --raw /tmp/firms-ro --counties /tmp/ro_adm1.geojson --download

# 2. Optional: add the current year (needs a free FIRMS MAP_KEY)
FIRMS_MAP_KEY=... python3 app/pipeline/fetch_current.py --raw /tmp/firms-ro --counties /tmp/ro_adm1.geojson
python3 app/pipeline/build.py --raw /tmp/firms-ro --counties /tmp/ro_adm1.geojson
```

`fetch_current.py` has not been run against the live API yet (no key at the time of writing); the app's handling of a
partial year was tested with simulated data.

## Files

```
app/
  index.html, css/, js/data.js (loading + analysis), js/app.js (UI), methods.html
  data/            built by the pipeline: meta.json, cd_modis.bin, cd_viirs.bin, cellcounty.bin,
                   counties.geojson, events.bin, hotspots/<year>.bin (formats in meta.json)
  pipeline/build.py, pipeline/fetch_current.py
```

## Use of AI

The code and data pipeline were written with the help of an AI assistant (Claude) and reviewed by the team; files carry
a header saying so. No AI-generated images or media are used.

## Data credits

NASA FIRMS (MODIS Collection 6.x, VIIRS 375 m S-NPP and NOAA-20). geoBoundaries (CC BY 4.0). Basemap © Esri, HERE,
Garmin, © OpenStreetMap contributors.
