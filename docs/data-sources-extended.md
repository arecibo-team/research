# Extended data sources for the hot spot calendar

Researched 2026-11-14. Complements `Wildfire Data Sources.md` (written for prediction) with sources that
serve **this** challenge: harmonization, validation, context, storytelling and future sensors.

Status column: **verified** = we downloaded or opened it today; **source** = stated by the linked page;
**to verify** = from general knowledge only.

## 1. Fire detections (inputs to the calendar)

| Source | What it gives us | Access | Status |
|---|---|---|---|
| FIRMS per-country yearly CSVs | MODIS (Terra/Aqua) and VIIRS (S-NPP, NOAA-20) hotspots, 2000 to 2025 | `firms.modaps.eosdis.nasa.gov/data/country/<sensor>/<year>/<sensor>_<year>_<Country>.csv`, no key | verified |
| FIRMS area API (`*_SP`, `*_NRT`) | Same data by bounding box, plus near-real-time | MAP_KEY, 5 days per call, 5000 calls / 10 min | verified |

Gaps found today:

- **2026 is not in the country files yet** (`modis_2026_Romania.csv` returns 404). The current year,
  which the "is now normal?" feature needs, must come from the API with a MAP_KEY. Getting a key is now
  on the critical path.
- **NOAA-21 is not in the country files** under `viirs-jpss2` or `viirs-noaa21`. Use the API source
  `VIIRS_NOAA21_SP` / `_NRT` if we want it; S-NPP plus NOAA-20 is enough for the calendar.
- Neighbours are available: `Moldova` (not `Republic_of_Moldova`), `Bulgaria`, `Ukraine` (1.35 MB for
  MODIS 2025 alone).

## 2. Validation and prior art for the harmonization

| Source | Use | Status |
|---|---|---|
| MODIS MCD64A1 and VIIRS VNP64A1 burned area (NASA) | Independent check: does the harmonized series follow burned area? VNP64A1 adapts the MCD64A1 algorithm to VIIRS ([Giglio et al.](https://geog.umd.edu/sites/geog.umd.edu/files/pubs/1-s2.0-S0034425725004109-main.pdf)) | source |
| Boschetti et al., harmonized MODIS/VIIRS burned area, 0.25°, 2002-2024 | NASA MODIS science team work on the same problem for burned area; cite it as prior art ([2022 slides](https://modis.gsfc.nasa.gov/sci_team/meetings/202204/presentations/session1/boschetti.pdf), [2023 slides](https://modis.gsfc.nasa.gov/sci_team/meetings/202305/presentations/boschetti.pdf)) | source |
| Fused MODIS-VIIRS active fire product, *Remote Sensing* 2026 | Closest published method: duplicate correction, footprint-scale matching, cloud correction, view-angle FRP calibration ([PDF](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-18-01650/article_deploy/remotesensing-18-01650.pdf)). Read its overlap method before finalizing ours | source |
| Li et al., VIIRS vs MODIS FRP across scales (NOAA) | FRP agrees well within fire clusters, except large boreal fires ([PDF](https://repository.library.noaa.gov/view/noaa/49896/noaa_49896_DS1.pdf)). Supports using FRP to match detection limits | source |
| GFED5 / GFED5NRT (ESSD 2026 preprint) | Converts VIIRS fire counts to burned area with biome-specific "effective fire areas", a validated way to put counts on a physical scale ([ESSD](https://essd.copernicus.org/preprints/essd-2026-158/essd-2026-158-manuscript-version6.pdf)) | source |
| EFFIS burnt areas and country yearly totals | Ground-level check for Romania. Note: mapping threshold about 30 ha, and fires only on agricultural land are not mapped, so EFFIS undercounts exactly our stubble fires ([data and services](https://forest-fire.emergency.copernicus.eu/applications/data-and-services), [JRC dataset](https://data.jrc.ec.europa.eu/dataset/022cdeed-159f-407d-be18-0dface69ef92)) | source |
| ESA FireCCI burned area | Long burned-area record from an ESA programme (ESA is a Space Agency Partner) | to verify |

## 3. Context layers (explain the calendar)

| Source | Use | Status |
|---|---|---|
| ESA WorldCover 2020/2021 (10 m) | Calibration strata; split cropland / forest / grassland / wetland | catalog |
| Corine Land Cover 2000, 2006, 2012, 2018 (EEA) | Land cover that changes over time, so 2003 fires are classified with 2000-era land cover | to verify |
| ERA5 fire danger indices / CEMS GEFF (Copernicus) | Fire weather anomaly next to burning anomaly ("weather or people?") | catalog |
| EFFIS fire danger forecast (up to 6 days, WMS) | Short-term danger next to the climatological outlook | source |
| Natura 2000 sites (EEA), WDPA | Protected area lens. Romania had about half of all burnt area inside Natura 2000 sites in 2019 and 2020, mostly in the Danube Delta ([European Data Journalism](https://www.europeandatajournalism.eu/?p=237189)) | source |
| Romanian county boundaries (geoBoundaries or GADM) | "Pick your county" selector | to verify |
| Public holidays (Python `holidays` package, RO) | Weekday and holiday fingerprint of human burning | to verify |
| Crop calendar (wheat harvest July, maize October) | Explain the July-August and October peaks | to verify |
| Lightning climatology | Lightning-caused fires are rare in Romania, so nearly all detected burning is human ([EGU24-6624](https://meetingorganizer.copernicus.org/EGU24/EGU24-6624.html)) | source |
| WorldPop / GHS-POP | People living near recurrent burning (exposure) | catalog |

## 4. Impact layers (why it matters)

| Source | Use | Status |
|---|---|---|
| CAMS GFAS fire emissions | Turn fire activity into emitted smoke. Daily v1.2 updates stopped 2025-12-04; hourly v1.4.2 runs from Dec 2025 via the ECMWF portal ([ADS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-fire-emissions-gfas), [ECMWF forum](https://forum.ecmwf.int/t/changes-to-cams-global-biomass-burning-emissions-based-on-fire-radiative-power-gfas-data-availability-on-ads-and-ecmwf-data-portal/14325)) | source |
| Sentinel-5P TROPOMI CO | Smoke plumes from big burning days | catalog |
| EEA air quality stations (PM2.5) | Ground-level smoke impact; stubble burning in Giurgiu has been reported to pollute Ruse across the border ([BTA](https://bta.bg/en/news/539983-burning-stubble-in-giurgiu-causes-cross-border-air-pollution-in-ruse)) | source (event), to verify (data) |
| IGSU press statistics | Ground truth anecdotes: over 8,500 vegetation fires in summer 2025 ([Romania Insider](https://www.romania-insider.com/romania-vegetation-fires-summer-2025)) | source |
| Policy timeline | EU accession 2007; GAEC 3 bans stubble burning, GAEC 10 heather and grass; 2022 ordinance raised fines to RON 7,000-15,000 for individuals and RON 50,000-100,000 for companies ([Romania Insider](https://www.romania-insider.com/ro-govt-waste-burning-punishment-apr-2022), [Stiripesurse](https://www.stiripesurse.ro/romanian-farmers-reminded-not-to-burn-arable-stubble-heather-grass_3609175.html)) | source |
| Danube Delta reed burning | Over 35,000 ha burned inside the Biosphere Reserve 2020-2022; Tulcea emergency inspectorate attributes 99% of 2020-2023 fires to human causes ([PressOne](https://pressone.ro/romania-burns-i-how-the-danube-delta-found-itself-on-the-bushfire-map-of-europe-boatmen-are-using-fire-to-get-rid-of-reeds)) | source |

## 5. Future sensors (the "sensor-agnostic" pitch)

| Source | Why it matters | Status |
|---|---|---|
| **MODIS end of life** | NASA plans to stop Terra MODIS science data around Feb 2027 and Aqua around Sep 2027; dates have shifted before ([LAADS](https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition/), [Earthdata alert](https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs)). This is the "why now" of the pitch | source |
| MTG FCI Fire Radiative Power (EUMETSAT LSA SAF) | Geostationary, 1 km, every 10 minutes over Europe and Africa, back-processed from 2025-01-01; demonstration status since Oct 2025 ([LSA SAF](https://lsa-saf.eumetsat.int/en/news/news/2025/10/01/release-of-mtg-fire-radiative-power-product-as-demonstration/)) | source |
| Sentinel-3 SLSTR FRP (ESA / Copernicus) | Polar orbit, 1 km, since Aug 2020, NRT and NTC streams on the Copernicus Data Space; C3S publishes a monthly 0.25° global product ([ESA](https://sentinel.esa.int/web/sentinel/-/new-copernicus-sentinel-3-fire-radiative-power-products-released)). ESA partner data | source |
| FireSat (Earth Fire Alliance) | First 3 operational satellites launched July 2026; data to early adopters from Q4 2026; 50+ satellites planned by 2030 ([KUNC](https://www.kunc.org/2026-10-19/wildfire-satellites-noaa-nasa-earth-fire-alliance), [Google Research](https://sites.research.google/gr/wildfires/firesat/)) | source |
| MSG SEVIRI FRP (LSA SAF) | Older geostationary FRP record for Europe | to verify |

## 6. Neighbouring uses of FIRMS (inspiration, handle with care)

- Conflict fires: FIRMS detections shifted toward the front line in Ukraine; DLR found fire density
  correlates with damage counts ([DLR](https://elib.dlr.de/223099/1/VNF%20Ukraine%20SCR.pdf));
  The Economist uses a model trained on pre-war fire patterns to flag war-related fires
  ([summary](https://smallwarsjournal.com/2026/03/25/fire-detection-as-a-proxy-for-combat-the-economist/)).
  Relevant to us only as proof that "anomaly versus a harmonized baseline" is a powerful idea. Showing
  conflict data in our app is sensitive and off-challenge; we should not.
- SaveEcoBot aggregates FIRMS hourly for Ukraine ([site](https://www.saveecobot.com/en/analytics/fires?days=60)),
  an example of a public FIRMS dashboard.

## 7. Existing tools we must differentiate from

| Tool | What it does | What it lacks that we add |
|---|---|---|
| FIRMS Fire Map | Points on a map, recent days | No harmonized history, no calendar for an arbitrary area |
| EFFIS | European burnt areas, danger forecast, country statistics | Excludes agricultural-only fires and fires under 30 ha, no hotspot calendar |
| GWIS country profiles | Country and sub-country fire statistics, seasonality charts, current year vs 10-year average | Based on burned area (MCD64A1) and GlobFire, not hotspots; no drawn areas |
| Global Forest Watch fire dashboards | Fire alerts by area, weekly counts vs historical average | MODIS (2000-) and VIIRS (2012-) offered as separate products, not harmonized |
| FIRECAM (Earth Engine app) | Daily FIRMS time series for a drawn region | MODIS only, emissions focus |

See `docs/interface-inspiration.md` for the full survey of existing apps.
