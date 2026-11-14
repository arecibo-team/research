# Interface inspiration and state of the art

Researched 2026-11-14. This collects existing fire and climate apps whose interfaces we can learn from,
the interface patterns worth borrowing for each of our screens, and the building blocks to implement them.

Descriptions come from documentation, help pages and press coverage found by web search, not from using
each app hands-on. **Before the design session, someone should open the top links and take screenshots**
into `docs/inspiration/` (the list at the end says which).

## 1. State of the art in one paragraph

Near-real-time fire maps are everywhere (FIRMS, CWFIS, DEA Hotspots, SiPongi, Watch Duty, OroraTech).
"This year versus normal" charts exist, but mostly for **whole countries** and for **burned area or
emissions** (EFFIS, GWIS, Our World in Data, CAMS Fire Emissions Watch, INPE bulletins). Area-of-interest
time series of hotspots exist in Global Forest Watch and the FIRECAM Earth Engine app, but they show
**MODIS (2000-) and VIIRS (2012-) as separate products**. We found no tool that gives a harmonized
MODIS + VIIRS hotspot calendar for an arbitrary drawn area. That is our gap, and it should be the first
sentence of the pitch.

## 2. Apps to learn from

### Fire monitoring platforms

| App | What it does | Interface patterns to borrow | What it lacks (our angle) |
|---|---|---|---|
| [NASA FIRMS Fire Map](https://earthdata.nasa.gov/learn/articles/firms-data-tool-focus) | Global hotspot map | Bottom timeline: drag a box for one day, drag its ends for a range; location search by coordinates or place name; measure tool; email alerts for an area; since 2025 a layer that separates non-vegetation fires ([customize](https://www.earthdata.nasa.gov/learn/blog/customize-fires-displayed-firms), [fire type](https://www.earthdata.nasa.gov/news/blog/firms-releases-new-features-identify-active-fires-type)) | No statistics or charts for a drawn area found; no harmonized history |
| [Global Forest Watch fires](https://www.globalforestwatch.org/blog/data-and-tools/wildfire-trends-gfw-fire-data/) | Fire alerts by country, region or drawn area | Weekly alert counts against the historical average, with a "significant fires" view; widgets embeddable in articles; any 3-month window since 2012 ([local context](https://www.globalforestwatch.org/blog/fires/placing-global-wildfires-into-local-context/), [5 graphs](https://www.globalforestwatch.org/blog/forest-insights/5-graphs-show-just-how-unusual-this-years-wildfires-are)) | MODIS and VIIRS kept as separate products; their own caveat that early-season comparisons mislead |
| Vizzuality (builders of GFW) | Design write-ups | A normalized index where -1 to +1 means "normal for this time of year", built from 8 years of VIIRS ([playing with fires](https://medium.com/vizzuality-blog/playing-with-fires-bd018bf941b2), [worse than normal?](https://medium.com/vizzuality-blog/the-amazon-is-on-fire-is-it-worse-than-normal-5fa430a7880e)) | Our baseline can be 25 years instead of 8, thanks to harmonization |
| [EFFIS current situation](https://forest-fire.emergency.copernicus.eu/) | European burnt areas and danger | Cumulative burnt area for this year against the 2006-2025 average with a min-max band, per country, downloadable as CSV, PDF, JSON ([seasonal trend PDF, EU 2026](https://api2.effis.emergency.copernicus.eu/api/effis/seasonaltrend/pdf/EU/2026/CO2)) | Country level; skips agricultural-only fires and fires under about 30 ha |
| [GWIS](https://gwis.jrc.ec.europa.eu/) country profiles and statistics portal | Global fire regime per country and sub-country | Multi-year charts of fires, burned area, **fire seasonality**, monthly fire size distribution, land cover damage and emissions; current year against the 10-year average ([applications](https://gwis.jrc.ec.europa.eu/applications), [UN-SPIDER](https://un-spider.org/news-and-events/news/gwis-launches-country-profiles-support-wildfire-risk-management-lac-region)) | Burned area based; no drawn areas; no hotspot calendar |
| [CWFIS](https://cwfis.cfs.nrcan.gc.ca/home) (Canada) | National fire information | Map carousel (agency fires, fire weather, hotspots, smoke); statistics panel with today's numbers and year-to-date; hotspots as CSV; perimeter estimates built from season-to-date hotspots ([release notes](https://cwfis.cfs.nrcan.gc.ca/downloads/docs/en/release-notes/whats-new-in-cwfif-and-cwfis.pdf)) | Canada only; operational, not historical |
| [DEA Hotspots](https://hotspots.dea.ga.gov.au/help) (Australia) | National hotspot monitoring | Per-layer About, Legend, Filter and Fit-extent; opacity sliders; serves both emergency managers and the public | Current situation, no calendar |
| SiPongi (Indonesia, ministry of environment) | National hotspot monitoring | Daily counts by province, split into confidence tiers (low 0-29, medium 30-79, high 80-100) ([Databoks summaries](https://databoks.katadata.co.id/en/demographics/statistics/ea10fda6897ac80/ministry-of-environment-and-forestry-indonesia-recorded-15141-hotspots-in-last-24-hours-monday-31-august-2026)) | Daily snapshots, no harmonized history |
| INPE Queimadas / BDQueimadas (Brazil) | Hotspot database for Brazil since 1998 | Monthly bulletins compare each month with a long-term average and rank states by change; user-defined period graphs ([Infoqueima Sep 2025](https://dataserver-coids.inpe.br/queimadas/queimadas/Infoqueima/2025/2025_09_infoqueima.pdf)). The closest existing thing to our calendar, but as PDFs and tables | One "reference satellite" approach rather than harmonizing; Brazil only |
| [MapBiomas Fogo](https://brasil.mapbiomas.org/en/mapbiomas-fogo/) (Brazil) | Monthly burned area 1985-2025 | Fire **frequency** map (how many years each pixel burned); per-territory tables; QGIS plugin ([ATBD collection 5](https://brasil.mapbiomas.org/wp-content/uploads/sites/4/2026/07/ATBD-MapBiomas-Fogo-Colecao-5.pdf)) | Burned area, Brazil only; inspires our "chronic burn sites" |
| [FIRECAM](https://github.com/tianjialiu/firecam) (Earth Engine app) | Compare fire emission inventories | Region picked from a list or **drawn**; daily FIRMS time series for the region | Emissions focus, MODIS only |
| [OroraTech Wildfire Solution](https://help.ororatech.com/navigating-the-oroatech-platform) | Commercial fire intelligence | Three zones: tools on the right, map in the centre, **incident table at the bottom** that sorts and filters by confidence, date, severity; public snapshot without an account ([2.0 redesign](https://ororatech.com/resources/news-blog/wildfire-solution-2-0)) | Commercial, real-time only |
| [Watch Duty](https://www.watchduty.org/blog/watch-duty-is-saving-people-from-the-l-a-wildfires-heres-how-the-app-actually-works) | Public wildfire alert app | Map of flame icons sized by fire size; plain-language updates; praised as simple ([Mapbox case](https://www.mapbox.com/blog/mapbox-partners-with-watch-duty-award-winning-wildfire-alert-app-honored-by-time-apple-and-fast-company), [screens](https://screensdesign.com/showcase/watch-duty-wildfire-maps)) | US only, current fires only |

### "Now versus history" displays from other fields

| App | Pattern to borrow |
|---|---|
| [Our World in Data, weekly area burnt](https://ourworldindata.org/grapher/weekly-area-burnt-by-wildfires) | One line per year of cumulative area burned by week; current year highlighted, other years grey; mean, min and max of 2012-2023 as reference; any country selectable ([Spain insight](https://ourworldindata.org/data-insights/spain-is-having-its-largest-wildfire-year-in-well-over-a-decade)) |
| [CAMS Fire Emissions Watch](https://atmosphere.copernicus.eu/copernicus-new-fire-emissions-watch-tool-provides-instant-access-global-fire-emissions-data) (launched 2026-07-30) | Daily, monthly and year-to-date views; compare countries and regions; rank the top countries for any period; replay events back to 2003 |
| [Copernicus Climate Pulse](https://climate.copernicus.eu/climate-pulse-tool-take-temperature-our-planet-glance) | Current year in colour, every past year in grey, all on one daily chart; compare years and regions at daily, monthly and annual scales |
| [Climate Reanalyzer](https://climatereanalyzer.org/clim/t2_daily/) | Daily "spaghetti" chart with one line per year; tooltip shows the value and its anomaly against two baselines |
| [Warming stripes](https://www.reading.ac.uk/en/planet/climate-resources/climate-stripes) (Ed Hawkins) | One stripe per year, colour = anomaly, no axes. Built so non-scientists get it instantly ([WMO](https://wmo.int/site/science-action/warming-stripes), [Climate Central](https://app.climatecentral.org/dataviz/warming-stripes)). Model for "fire stripes" of a county |
| GitHub contribution graph / [Cal-Heatmap](https://github.com/wa0x6e/cal-heatmap) | Calendar heatmap that everyone already knows how to read; day or month cells |

## 3. Patterns mapped to our screens

### Map and area selection
- **Search box first** (place names and coordinates, as FIRMS), then the drawing tools, then the county
  and protected-area pickers.
- **Draw** with [Terra Draw](https://maplibre.org/maplibre-gl-js/docs/examples/draw-geometries-with-terra-draw/)
  (polygon, rectangle, circle), as FIRECAM and GFW let users draw.
- **Hotspots as density, not dots,** when zoomed out: hexagons or the grid cells we use for harmonization.
  Dots only when zoomed in, as FIRMS does.
- **Layer panel** with About, Legend, Filter and opacity per layer (DEA Hotspots). Our layers: hotspots
  (by sensor), harmonized cells, chronic burn sites, land cover, static sources removed.
- **Bottom time bar** with a draggable range (FIRMS), driving both map and charts.

### The burning calendar (hero)
- **Years as rows, months as columns,** like a contribution graph turned into a table (INPE's monthly
  tables, GWIS seasonality). Sequential colour-blind-safe ramp; MODIS-era cells hatched as "modelled".
- **Second mode: anomaly colours** on a diverging ramp (warming stripes logic), so "unusual" pops out
  instead of "big".
- **Collapsed form: fire stripes,** one stripe per year for the area. Works as a thumbnail, social card
  and slide image.
- **Click a cell** for a daily strip of that month and the hotspots on the map.

### "Is now normal?"
- **Spaghetti chart** (Climate Pulse, OWID): cumulative harmonized activity by day of year, every past year in
  grey, the current year in colour, median line and 10-90 percentile band.
- **Normalized index** (Vizzuality): show the value on a scale where -1 to +1 is normal for the season.
- **One sentence** above the chart, with rank and ratio ("3rd most active October since 2001, 2.4x the
  median"), like the CAMS and Copernicus press lines.
- **Caveat chip** early in the season (GFW's lesson): "Season has barely started; comparison is uncertain."

### Comparison and ranking
- **Compare two areas or two years** side by side (Climate Pulse, CAMS Fire Emissions Watch).
- **Ranking table** of counties by anomaly this month (INPE bulletins, CAMS "top countries"), sortable
  like OroraTech's incident table.

### Fire events and chronic sites
- **Bottom table of fire events,** sortable by size, duration and date (OroraTech).
- **Frequency map** of how many years each cell burned (MapBiomas Fogo) for chronic burn sites.

### Trust and provenance
- **Satellite timeline strip** under the calendar.
- **Confidence tiers** shown explicitly (SiPongi).
- **Methods drawer** behind an "About this number" link on every chart, with baseline period stated (every
  good example above states its baseline: 2006-2025, 2012-2023, 1991-2020).

### Sharing and export
- **Embeddable widgets** (GFW) and a **public view without login** (OroraTech snapshot).
- **Downloads in CSV, PDF, JSON** (EFFIS) plus PNG.
- **URL holds the state** (area, dates, mode) so every view is a link.

## 4. Building blocks

| Need | Option | Notes |
|---|---|---|
| Map | MapLibre GL JS | Open source; Terra Draw has a MapLibre adapter and a ready control (`maplibre-gl-terradraw`) |
| Drawing | [Terra Draw](https://github.com/JamesLMilner/terra-draw) | MIT; replaces the unmaintained mapbox-gl-draw |
| Big point layers | deck.gl | Hexagon or grid layers for density |
| In-browser queries | DuckDB-WASM over Parquet / GeoParquet | No backend ([Development Seed](https://developmentseed.org/blog/2025-10-08-spatial-access-lab), [demo repo](https://github.com/sunu/geoparquet-duckdb-deckgl-demo)); known slowness when exporting very large results, and remote file access depends on the setup |
| Calendar heatmap | [Cal-Heatmap](https://github.com/wa0x6e/cal-heatmap) (MIT, needs d3), ECharts calendar series, or Observable Plot `cell` | A years x months grid is also easy to draw by hand in SVG |
| Colour ramps | [Crameri Scientific Colour Maps](https://zenodo.org/records/5501399) (batlow, lajolla, vik), viridis, cividis | Perceptually uniform, colour-vision-deficiency friendly, readable in black and white ([Crameri et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7595127)) |

## 5. Wireframe combining the patterns

```
+----------------------------------------------------------------------------------+
| [Search place or lat,lon]  [Draw: poly | box | circle]  [County v] [Protected v] |
+--------------------------------------------+-------------------------------------+
|                                            | Danube Delta, 2001-2026             |
|                 MAP                        | "October 2026: 3rd most active      |
|   harmonized cells / hotspots by sensor    |  October since 2001, 2.4x median"   |
|   layer panel: About | Legend | Filter     |  [normal |----o-----| unusual]      |
|                                            +-------------------------------------+
|                                            | CALENDAR  [counts | anomaly]        |
|                                            |      J F M A M J J A S O N D        |
|                                            | 2001 . . # . . . # # . . . .  (m)   |
|                                            | ...                                 |
|                                            | 2026 . . # . . . . . # # .          |
|                                            | satellites: T | T+A | +S-NPP | +N20 |
+--------------------------------------------+-------------------------------------+
| [timeline: 2000 =========[=====]== 2026]   [Spaghetti] [Season] [Events] [Export]|
+----------------------------------------------------------------------------------+
```

## 6. Screenshots to collect (team task)

Save into `docs/inspiration/` with the app name in the file name:

1. OWID weekly cumulative area burnt chart, for Romania or Spain.
2. EFFIS seasonal trend chart for Romania (cumulative vs 2006-2025 band).
3. GWIS country profile for Romania: the seasonality chart.
4. GFW fire alerts widget for Romania (weekly vs average).
5. Climate Pulse daily chart (years in grey, current in colour).
6. FIRMS Fire Map with the timeline open.
7. OroraTech platform layout (from their help page).
8. Warming stripes for Romania (showyourstripes.info).
9. MapBiomas Fogo frequency map.
10. One INPE Infoqueima monthly table.
