# Hackathon brief: NASA Space Apps 2026

Compiled 2026-11-14 from the challenge page, the Project Submission Guide and the Judging & Awards Guide.
Raw sources are in `docs/source/`.

## Event

- NASA Space Apps Challenge 2026, Local Event: Bucharest.
- Submission opens Saturday 2026-11-14 09:00 local, closes **Sunday 2026-11-15 23:59 local**.
- Local judging and awards times may differ; ask the Local Lead.
- Global Winners announced 2027-01-26.

## Challenge: Harmonization of MODIS and VIIRS Hot Spots

- URL: https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/
- Difficulty: Intermediate / Advanced. Skills: Earth Science, Software.
- Page last published 2026-11-13; "more resources may be added", so recheck the Resources tab.

### Problem

Satellites have tracked active-fire hotspots for 20+ years, but the record is split across sensors that
cannot be compared directly. MODIS (Terra, Aqua) has the long history and is near end of life; VIIRS
replaces it. They differ in spatial resolution, sensitivity and observation schedule. Fire managers
therefore lack a consistent picture of when and where burning has occurred.

### Objective

Build a **web application** with a **harmonized burning activity calendar** based on active fire hotspots,
for a user-selected area of interest. Two parts:

1. **Harmonization** of MODIS and VIIRS hotspots, so "the sensor of origin no longer matters and the
   patterns, trends, and anomalies become the focus".
2. **Web app** taking the harmonized data as input: the user selects a region and date range, then downloads
   analytics and visualizations of fire activity.

### Outputs the page names

- Calendar of hotspot counts from the early 2000s to present: which periods of the year see more fires,
  which years burned most, how a current fire compares with previous ones.
- Current month's activity compared against the historical median for the selected area.
- Color ramps showing similarities and differences across months (accessible ramps).
- Downloadable CSV of the hotspots detected in a search.

### Potential considerations (optional)

- Audience: early warning and emergency responders, scientists, land managers, firefighters.
- Interactive map where users draw the area of interest, or enter latitude/longitude.
- A few key indices and figures: historical comparisons, anomalies against multi-year averages,
  number of fires detected and reported.

## Data

The challenge page lists exactly one resource:

- **NASA FIRMS** (Fire Information for Resource Management System):
  https://www.earthdata.nasa.gov/data/tools/firms

`Wildfire Data Sources.md` in this repo catalogs many more sources; `docs/project-idea.md` says which ones
the project uses.

### FIRMS access (verified 2026-11-14)

- **Per-country yearly CSVs, no key needed:**
  `https://firms.modaps.eosdis.nasa.gov/data/country/<sensor>/<year>/<sensor>_<year>_<Country>.csv`
  with `<sensor>` = `modis`, `viirs-snpp`, `viirs-jpss1` (NOAA-20). Example:
  `.../data/country/modis/2023/modis_2023_Romania.csv`. The directory listing itself returns 404,
  so build the URLs directly. NOAA-21 naming is not checked yet (probably `viirs-jpss2`).
- **Area API, needs a free MAP_KEY:** `/api/area/csv/[MAP_KEY]/[SOURCE]/[west,south,east,north]/[DAY_RANGE]/[DATE]`.
  DAY_RANGE is 1 to 5 days. Sources include standard-processing archives (`MODIS_SP`, `VIIRS_SNPP_SP`,
  `VIIRS_NOAA20_SP`, `VIIRS_NOAA21_SP`) and near-real-time (`*_NRT`). Limit: 5000 transactions per
  10 minutes. So the API *can* pull a 25-year history for a bounding box (about 1,800 calls per sensor),
  which corrects an earlier assumption that it could not.
- **Data availability:** `/api/data_availability/csv/[MAP_KEY]/ALL` shows the date range of each source.
- The archive download tool (queued, emailed) also exists but should not be needed.

### FIRMS record format (seen in the files)

MODIS columns: `latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite (Terra|Aqua),
instrument, confidence (0-100), version (61.03 = Collection 6.1), bright_t31, frp, daynight, type`.

VIIRS columns: same layout but `bright_ti4`, `bright_ti5`, `satellite` = `N` (S-NPP) or `N20`,
`confidence` = `l|n|h`, `version` = `2`.

`type`: 0 = presumed vegetation fire, 1 = active volcano, 2 = other static land source (industry, flares),
3 = offshore.

### Sensor facts (general knowledge, still to verify)

| Source | Pixel at nadir | Record starts |
|---|---|---|
| MODIS Terra / Aqua (C6.1) | 1 km | Nov 2000 / Jul 2002 |
| VIIRS S-NPP (375 m I-band) | 375 m | Jan 2012 |
| VIIRS NOAA-20 / NOAA-21 | 375 m | 2018 / 2023 |

- Aqua and the VIIRS platforms cross the equator around 13:30 and 01:30 local; Terra around 10:30 and 22:30.
- Terra and Aqua orbits have been drifting in recent years, which shifts overpass times; check how far
  before trusting post-2020 MODIS counts in the calibration.

## Submission requirements

- Click **"Submit for Judging"** before the deadline; saving alone does not count. Resubmitting is allowed;
  only the last saved submission is judged.
- All required form fields completed, all content in English.
- Form fields:
  1. Project Name
  2. High-Level Project Summary (what, how it addresses the challenge, why it matters)
  3. Link to Project Demo
  4. Link to Final Project
  5. Detailed Project Description (what it does, how it works, benefits, goals, tools and languages)
  6. Use of AI tools (the guide calls it "Super Intelligence (SI)"): data collection only, judges do not see it
  7. NASA Data (specific details of what was used)
  8. Space Agency Partner Data and Other References (all data, code, text, images used)
- **Demo:** video of 30 seconds or less, OR a slide deck of at most 7 slides including title and intro.
  Hosted externally. Slides must cover team name, members, the challenge selected.
  Suggested video beats: 0:00 team, 0:02 challenge, 0:05 project title and tagline, 0:10 how it works
  and how NASA data made it possible, 0:20-0:30 future vision.
- **Links** must be public: no login, permission or registration. Test in a private window.
- The project page accepts only images (JPG, PNG, GIF up to 10 MB); no video or document uploads.
- If hosting on a new website, optionally request a FortiGuard Web Filter Classification so judges can reach it.
- **NASA data:** at least one NASA dataset or resource is required for Global Award eligibility (FIRMS qualifies).
- **AI rules:** allowed as a tool, not for coming up with the idea. AI-generated code and data must be
  acknowledged in descriptive text and metadata; AI images and video need a visible watermark; AI audio
  must be acknowledged. No NASA logos, flags or mission identifiers in generated content.
- No images, video, audio or likeness of anyone under 18.
- All team members must be confirmed participants at the same Local Event.
- Tick "Terms and Conditions" and "Confirm All Work is Original" when submitting.

## Judging

Impact, Creativity, Validity, Relevance, Presentation, each scored 1 to 5. See `docs/source/judging-criteria.md`.
Most reachable Global Awards for this challenge: Best Use of Data, Best Use of Science, Local Impact.

## Space Agency Partners 2026

Angola (GGPEN), Bahrain Space Agency, Brazilian Space Agency, CSA, ESA, ISRO, Italian Space Agency, JAXA,
KASA, MBRSC (UAE), CONAE (Argentina), NASRDA (Nigeria), Paraguayan Space Agency, Senegalese Space Studies
Agency, Spanish Space Agency, Turkish Space Agency, UK Space Agency. Using partner data is "highly encouraged".
