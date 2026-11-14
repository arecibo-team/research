# Feature catalog and how to promote each feature

Draft 2026-11-14 for team review. Builds on `docs/project-idea.md`; data references point to
`docs/data-sources-extended.md`.

For every feature:
- **What:** what the user sees.
- **Data:** what it needs.
- **Effort:** S = a few hours, M = half a day, L = a day or more for one person.
- **Scores on:** the judging criteria (Impact, Creativity, Validity, Relevance, Presentation) and any Global Award it supports.
- **Promote:** the line or demo moment that sells it.

Features are grouped by tier. Tier 1 answers the challenge text directly and must ship. Pick from
tier 2 and tier 3 by team capacity; tier 4 is the "after the hackathon" vision for the pitch.

---

## Tier 1: required by the challenge

### 1. Harmonized fire record
- **What:** one daily series per area in VIIRS-equivalent "fire cell-days", 2000 to today. Years from the
  MODIS era are marked "modelled", years from the VIIRS era "observed".
- **Data:** FIRMS MODIS and VIIRS; static-source mask; land cover strata.
- **Effort:** L (the scientific core).
- **Scores on:** Validity, Relevance. Award: Best Use of Science.
- **Promote:** "Satellites changed in 2012 and Romania's fire count quadrupled overnight. We fixed the record."

### 2. Area selection four ways
- **What:** draw a polygon or box; type lat/lon plus a radius; pick a Romanian county; pick a protected
  area such as the Danube Delta.
- **Data:** county boundaries, Natura 2000.
- **Effort:** M.
- **Scores on:** Validity (usability). Award: Local Impact.
- **Promote:** "Any shape, any place: your county, your forest, your farm."

### 3. Burning calendar
- **What:** heatmap with years as rows and months as columns, 2000 to now, on an accessible sequential
  ramp; modelled cells hatched. Click a cell for the daily view.
- **Data:** output of feature 1.
- **Effort:** M.
- **Scores on:** Relevance, Presentation. Award: Best Use of Data.
- **Promote:** the hero image of the project page and the first frame of the video. "Twenty-five years
  of fire on one screen."

### 4. "Is now normal?" card
- **What:** one sentence plus a gauge, e.g. "October 2026: 3rd most active October since 2001,
  2.4x the median."
- **Data:** feature 1 plus current-month data from the FIRMS API (needs a MAP_KEY; 2026 is not in the
  country files).
- **Effort:** S.
- **Scores on:** Impact, Relevance.
- **Promote:** "The question every fire manager asks, answered in one sentence."

### 5. Exports
- **What:** CSV of the hotspots in the search (with sensor and harmonized fields); CSV of the monthly
  harmonized table; PNG of the calendar; shareable link that reopens the exact view.
- **Data:** none extra.
- **Effort:** S.
- **Scores on:** Validity, Relevance (explicitly requested).
- **Promote:** "Take it with you: data for analysts, pictures for reports, a link for the group chat."

### 6. Accessibility built in
- **What:** colour-blind-safe ramps (viridis-style) with a high-contrast option; every chart has a
  data-table fallback for screen readers; keyboard navigation; readable on a phone.
- **Data:** none.
- **Effort:** S.
- **Scores on:** Validity (user-friendly). The challenge asks for accessible ramps explicitly.
- **Promote:** one slide line: "Readable by everyone, including the 1 in 12 men with colour blindness." Check
  the statistic before using it.

---

## Tier 2: scientific credibility (what separates us from a dashboard)

### 7. "The 2012 cliff" toggle
- **What:** the same chart with raw stitched counts and with harmonized counts; the jump in 2012 appears
  and disappears.
- **Data:** feature 1.
- **Effort:** S.
- **Scores on:** Validity, Presentation. Award: Best Use of Science.
- **Promote:** the strongest 5 seconds of the video. Nobody else will show the problem this clearly.

### 8. Trust meter and uncertainty band
- **What:** a shaded band showing the cross-validated error on every chart, plus a per-area badge
  ("high trust: 2,400 overlapping detections" / "low trust: too few fires to calibrate").
- **Data:** leave-one-year-out cross-validation results.
- **Effort:** M.
- **Scores on:** Validity. Award: Best Use of Science.
- **Promote:** "We tell you how sure we are." Rare at hackathons and respected by scientific judges.

### 9. "Not a fire" filter
- **What:** toggle that shows what we removed: industrial heat sources, flares, offshore. Early MODIS
  has no such flags, so we built our own mask from VIIRS.
- **Data:** VIIRS `type` 2/3 locations, buffered.
- **Effort:** S.
- **Scores on:** Validity, Creativity.
- **Promote:** "About 8% of what satellites call fire in Romania is a factory chimney. We take it out,
  even for 2003." (8% is the VIIRS 2015 share; recompute before quoting.)

### 10. Independent validation view
- **What:** our harmonized yearly totals next to NASA burned area (MCD64A1 / VNP64A1) and EFFIS
  statistics, with the correlation.
- **Data:** burned area products, EFFIS yearly xls.
- **Effort:** M.
- **Scores on:** Validity.
- **Promote:** methods slide: "Checked against two independent records."

### 11. Satellite timeline strip
- **What:** a thin bar under the calendar showing which satellites were flying each year: Terra only
  (2000-2002), Terra+Aqua, plus S-NPP (2012), NOAA-20, NOAA-21, and MODIS ending in 2027.
- **Data:** launch and end dates.
- **Effort:** S.
- **Scores on:** Presentation, Relevance.
- **Promote:** turns a technical problem into a picture anyone understands. Good for the second slide.

### 12. Open method and open dataset
- **What:** a methods page, a reproducible notebook, and the harmonized Parquet files published for
  anyone to download.
- **Data:** pipeline outputs.
- **Effort:** S (if the pipeline is clean).
- **Scores on:** Validity, Impact. Award: Best Use of Data.
- **Promote:** "We didn't just build an app, we released the harmonized record."

---

## Tier 3: insight features (the "wow")

### 13. Fire events, not just dots
- **What:** cluster hotspots into events (start, end, duration, footprint) and answer the challenge's own
  question: "how does a current fire compare with previous ones?" Example: "This fire is the 4th largest
  in this county since 2000."
- **Data:** feature 1 plus space-time clustering.
- **Effort:** M-L.
- **Scores on:** Relevance, Impact, Creativity.
- **Promote:** "Not 300 dots: one fire, ranked against every fire before it."

### 14. Fire season clock
- **What:** radial day-of-year chart; per year, season start, peak and length; shows whether the season is
  shifting earlier or growing longer.
- **Data:** feature 1.
- **Effort:** M.
- **Scores on:** Creativity, Presentation. Awards: Art & Technology, Best Storytelling.
- **Promote:** the most beautiful visual in the deck. "Romania's fire year used to peak in August. Now it
  peaks twice, in March and October." (Only if the harmonized data confirms it.)

### 15. Trend with significance
- **What:** "Burning in this area fell 41% since 2005 (statistically significant)" using a Mann-Kendall test
  and Sen's slope, with a plain-language explanation.
- **Data:** feature 1.
- **Effort:** S.
- **Scores on:** Validity, Impact.
- **Promote:** gives the anomaly card a long-term companion.

### 16. "Weather or us?" quadrant
- **What:** for each month, plot the fire weather anomaly (FWI from ERA5) against the burning anomaly. High
  burning in normal weather points at human behaviour; high burning in extreme weather points at the
  climate.
- **Data:** ERA5 fire danger indices or CEMS GEFF.
- **Effort:** M-L.
- **Scores on:** Creativity, Validity. Award: Best Use of Science.
- **Promote:** "Was it the weather, or was it us?" Most creative single idea in this list, and it uses the
  team's original prediction research.

### 17. Human fingerprint
- **What:** weekday and holiday pattern of fires. Natural fires don't know it is Sunday; human burning
  peaks on weekends and around holidays. Lightning fires are rare in Romania, so this exposes how human
  the fire regime is.
- **Data:** FIRMS dates plus the Romanian holiday calendar.
- **Effort:** S.
- **Scores on:** Creativity, Impact.
- **Promote:** surprising and cheap. "Fires in Romania take the weekend off... or rather, they start then."
  (Check the direction in the data first.)

### 18. Policy impact lens
- **What:** policy milestones on the timeline (EU accession 2007, GAEC stubble-burning rules, 2022 fines
  ordinance) with before/after statistics per area.
- **Data:** feature 1 plus the policy timeline.
- **Effort:** S.
- **Scores on:** Impact. Award: Local Impact.
- **Promote:** "Did the fines work? Now we can measure it." Speaks to ministries, APIA and the Environmental
  Guard. Claims must stay correlational.

### 19. Chronic burn sites
- **What:** map of grid cells that burn nearly every year, ranked. Targets for prevention, patrols and
  farmer outreach.
- **Data:** feature 1.
- **Effort:** S.
- **Scores on:** Impact, Relevance.
- **Promote:** "These 50 places burn every single year." Concrete and actionable for responders.

### 20. Land type split
- **What:** calendar split into cropland, forest, grassland and wetland.
- **Data:** ESA WorldCover; Corine for older years.
- **Effort:** M.
- **Scores on:** Relevance, Validity. Uses ESA (partner) data.
- **Promote:** "Stubble, forest or reeds? Three different problems, three different responses."

### 21. Climatological outlook
- **What:** "Historically, 62% of this area's yearly burning happens in the next 6 weeks", with median and
  90th-percentile expectations, next to EFFIS's 6-day danger forecast.
- **Data:** feature 1; EFFIS WMS.
- **Effort:** S-M.
- **Scores on:** Impact, Relevance (early warning).
- **Promote:** "Plan staff before the season, not during it."

### 22. Place memory
- **What:** click any point: "This spot burned in 2007, 2012 and 2019."
- **Data:** feature 1.
- **Effort:** S.
- **Scores on:** Presentation, Impact.
- **Promote:** an intimate demo moment, for example clicking a village in the Danube Delta.

### 23. Smoke impact
- **What:** estimated smoke emissions per month (CAMS GFAS) and, for a big event, the CO plume (Sentinel-5P);
  optionally nearby PM2.5 stations.
- **Data:** CAMS GFAS, TROPOMI, EEA stations.
- **Effort:** L.
- **Scores on:** Impact. Award: Global Connection (smoke crosses borders, e.g. Giurgiu to Ruse).
- **Promote:** "Fire doesn't stop at the border, and neither does smoke."

### 24. Cross-border view
- **What:** same calendar for Moldova, Bulgaria and Ukraine, or for an area spanning a border.
- **Data:** FIRMS country files for neighbours (verified available).
- **Effort:** S once the pipeline is country-agnostic.
- **Scores on:** Impact. Award: Global Connection.
- **Promote:** proves the method generalizes. Avoid showing conflict-driven fires in Ukraine.

### 25. Story mode
- **What:** a guided scroll-through: "Romania's burning year", from stubble fires to Delta reed burning
  to the policy change, with the calendar animating along.
- **Data:** features 1, 14, 18.
- **Effort:** M.
- **Scores on:** Presentation. Award: Best Storytelling.
- **Promote:** doubles as the slide deck and the video script.

### 26. Area briefing
- **What:** one printable page for a selected area: calendar, anomaly, trend, chronic sites, outlook.
- **Data:** all above.
- **Effort:** M.
- **Scores on:** Impact, Validity (usable by non-experts).
- **Promote:** "What a county inspector puts on the wall in March."

### 27. Bilingual interface (English and Romanian)
- **What:** language switch. Submission stays in English; Romanian serves the people who would use it.
- **Effort:** S.
- **Scores on:** Impact. Award: Local Impact.
- **Promote:** "Built in Bucharest, for the people who fight these fires."

---

## Tier 4: vision for the pitch (do not build this weekend)

### 28. Sensor-agnostic by design
- **What:** the harmonization is a framework: any new sensor is calibrated against the record during an
  overlap year. Next candidates: Sentinel-3 SLSTR (ESA), MTG FCI (10-minute geostationary over Europe,
  1 km), FireSat (data from Q4 2026).
- **Promote:** the video's closing line: "MODIS dies in 2027. Your fire history doesn't have to."

### 29. Alerts
- **What:** subscribe to an area; get notified when weekly activity passes the 90th percentile of its own
  history.
- **Promote:** early warning that is relative to the place, not a global threshold.

### 30. Embeddable widget and API
- **What:** an iframe calendar that county websites or newsrooms can embed; a JSON endpoint per area.
- **Promote:** reach beyond our own site.

### 31. Field mode
- **What:** offline-capable, low-bandwidth version for phones in the field.
- **Promote:** firefighters, not just analysts.

---

## Additions from the literature study

See `docs/literature-study.md` for the papers behind these.

### 32. One season or two?
- **What:** classify each area's year as having one or two burning seasons, and show when that changed.
  Two seasons per year is a known human fingerprint (Benali et al. 2017).
- **Data:** feature 1; circular statistics on day of year.
- **Effort:** S-M.
- **Scores on:** Validity, Creativity. Award: Best Use of Science.
- **Promote:** "Nature burns once a year. Romania burns twice. Here's why." (Only if the data shows it.)

### 33. Energy view
- **What:** toggle between counting fires and summing their energy (fire radiative power). Energy agrees
  better between sensors and separates a big forest fire from many small stubble fires.
- **Data:** FIRMS `frp` column.
- **Effort:** S.
- **Scores on:** Validity, Creativity.
- **Promote:** "Not just how many fires, but how much fire."

### 34. Return periods
- **What:** "A month this active happens once every 12 years here."
- **Data:** feature 1.
- **Effort:** S.
- **Scores on:** Impact (language that emergency managers already use for floods).
- **Promote:** borrows a concept managers trust from flood planning.

### 35. Analog years
- **What:** the past years whose calendar so far looks most like this year's, and what happened next in them.
- **Data:** feature 1.
- **Effort:** M.
- **Scores on:** Creativity, Impact (early warning without a trained model).
- **Promote:** "This year looks like 2012. In 2012, October was the worst month."

### 36. Fire regime context
- **What:** which global fire regime ("pyrome") the area belongs to, and similar places elsewhere.
- **Data:** Pais et al. 2023 classification, if downloadable.
- **Effort:** M.
- **Scores on:** Global Connection award.
- **Promote:** "Your county burns like [region]; here is what they learned."

### 37. Seasonal forecast (vision)
- **What:** forecast the coming season's burning from drought indices (as in Turco et al. 2018), shown on the
  calendar as next year's expected row.
- **Promote:** tier 4 pitch: from history to foresight.

---

## Recommended build set

With an unknown team size, this is the order to build in, stopping wherever time runs out:

1. Tier 1, all six (1-6).
2. Cheap high-value: 7 (cliff toggle), 9 (not-a-fire), 11 (timeline strip), 15 (trend), 19 (chronic
   sites), 17 (human fingerprint), 33 (energy view), 34 (return periods).
3. One big differentiator: 13 (fire events) for Relevance, or 16 ("weather or us?") for Creativity.
4. 8 (trust meter) if the science person has time; 25 (story mode) if the pitch person has time.

---

## Promotion plan

### Name and tagline candidates
- *Ember Ledger*: "25 years of fire, one honest record."
- *Firecal*: "Is this fire season normal? Ask the calendar."
- *Hotspot Almanac*: "The fire history MODIS leaves behind."

### 30-second video storyboard (follows the guide's beats)
| Time | Shot | Line |
|---|---|---|
| 0:00 | Team name over the calendar hero image | "We're [team], from Bucharest." |
| 0:02 | Raw chart, 2012 cliff | "In 2012 the satellites changed, and Romania's fire record broke." |
| 0:05 | Title card | "[Name]: 25 years of fire, one honest record." |
| 0:10 | Toggle: cliff disappears; draw the Danube Delta; calendar fills; anomaly card | "We harmonized NASA's MODIS and VIIRS data. Draw any area, see its fire history, know if today is normal." |
| 0:20 | Chronic sites, season clock, export | "Find the places that burn every year. Plan before the season." |
| 0:27 | Satellite timeline ending 2027 | "MODIS ends in 2027. Your fire history doesn't have to." |

English subtitles are required if anyone speaks Romanian. Watermark any AI-generated imagery.

### Seven slides (alternative to video)
1. Title, team, members, challenge.
2. The problem: the 2012 cliff plus the satellite timeline.
3. Our fix: harmonization in one diagram (grid, mask, calibrate, validate) with the error number.
4. The app: calendar plus anomaly card screenshot.
5. Insights: chronic sites, season shift, human fingerprint.
6. Who it helps: IGSU and county inspectorates, Delta administration, scientists (as examples, not
   partners).
7. Future: sensor-agnostic, MTG/FireSat, alerts; links to app, data and code.

### Project page checklist
- Hero image of the calendar (JPG/PNG under 10 MB).
- Summary that names FIRMS, MODIS and VIIRS in the first two sentences (Relevance).
- Methods paragraph with the validation error (Validity).
- "NASA Data" field: FIRMS MODIS C6.1 and VIIRS 375 m, plus burned area products if used.
- "Partner data" field: ESA WorldCover, Sentinel-3 if used, EFFIS / Copernicus.
- AI disclosure in the README and file headers.
- Every link tested in a private window.
