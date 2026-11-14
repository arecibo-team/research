# Literature study guide

Source: a team member's query to the Sci-Bot research assistant
(https://sci-bot.ru/understanding-how-burning-activity-is-66013e31), which pasted the challenge text
and the Impact criterion wording. The public page shows only the bot's research notes and the papers
it read, not its final answer.

What we checked (2026-11-14): all 13 DOIs below resolve on Crossref with the listed authors, years and
journals. **What we did not check:** the one-line takeaways are from the bot's notes plus our reading of the
titles and abstracts. Confirm a claim in the paper before putting it on a slide.

Access: use the DOI link, the publisher's open-access version or Unpaywall. Do not cite or link Sci-Hub
in anything we submit.

## Reading order for the weekend

If you only have an hour, read these four, in this order:

1. **Li et al. 2018**: the MODIS-VIIRS comparison our method rests on.
2. **Giglio et al. 2010**: how NASA merged multiple fire sensors into one record before; our method's ancestor.
3. **Benali et al. 2017**: bimodal fire seasons as a human fingerprint. It may explain Romania's March and October peaks.
4. **Hope et al. 2024**: how people actually use FIRMS, GWIS and EFFIS; it shapes our audience claims.

## The papers and what each gives us

### Harmonization method

| Paper | Takeaway for us | Feature |
|---|---|---|
| Li F., Zhang X., Kondragunta S., Csiszar I. (2018). Comparison of Fire Radiative Power Estimates From VIIRS and MODIS Observations. *JGR Atmospheres*. [10.1029/2017jd027823](https://doi.org/10.1029/2017jd027823) | Quantifies the MODIS-VIIRS differences: view-angle effects, duplicate MODIS detections between scans, many more VIIRS detections (the bot's notes say about 70% more in the tropics). Short agricultural fires are sensitive to overpass time. | 1, 7, 8 |
| Giglio L. et al. (2010). Assessing variability and long-term trends in burned area by merging multiple satellite fire products. *Biogeosciences*. [10.5194/bg-7-1171-2010](https://doi.org/10.5194/bg-7-1171-2010) | NASA's own precedent for merging sensors into one long record (GFED3): calibrating across sensors, regional relationships, uncertainty, and a "month of peak burning" map. Cite as the method we adapt to hotspots. | 1, 8, 10 |
| Zhang T., Wooster M.J. et al. (2018). How Well Does the "Small Fire Boost" Methodology Used within GFED4.1s Represent the Timing, Location and Magnitude of Agricultural Burning? *Remote Sensing*. [10.3390/rs10060823](https://doi.org/10.3390/rs10060823) | Warns that statistical corrections for small fires can misplace agricultural burning in time and space. Relevant because Romania's fires are mostly small agricultural ones; a reason to show uncertainty. | 8, 20 |

### The calendar itself

| Paper | Takeaway for us | Feature |
|---|---|---|
| Carmona-Moreno C. et al. (2005). Characterizing interannual variations in global fire calendar using data from Earth observing satellites. *Global Change Biology*. [10.1111/j.1365-2486.2005.01003.x](https://doi.org/10.1111/j.1365-2486.2005.01003.x) | The "fire calendar" idea already exists in the literature (from AVHRR, 1982-1999, by the JRC). Gives us scientific vocabulary and shows our calendar is a modern, harmonized, local version of a recognized product. | 3 |
| Benali A. et al. (2017). Bimodal fire regimes unveil a global-scale anthropogenic fingerprint. *Global Ecology and Biogeography*. [10.1111/geb.12586](https://doi.org/10.1111/geb.12586) | Regions with two fire seasons per year are mostly human-driven, often croplands. Romania's March and October peaks look bimodal: a scientific basis for the "human fingerprint" story. | 14, 17, 32 |
| Pais C. et al. (2023). Global scale coupling of pyromes and fire regimes. *Communications Earth & Environment*. [10.1038/s43247-023-00881-8](https://doi.org/10.1038/s43247-023-00881-8) | Global classification of fire regimes ("pyromes"). Lets us say which regime an area belongs to and compare it with similar regions elsewhere. | 36 |
| Artés T. et al. (2019). A global wildfire dataset for the analysis of fire regimes and fire behaviour (GlobFire). *Scientific Data*. [10.1038/s41597-019-0312-2](https://doi.org/10.1038/s41597-019-0312-2) | Fire events built from burned area, with start, end and size, from the team behind GWIS. Validation reference and prior art for our fire-events feature. | 13 |
| Reddy C.S., Sarika N. (2022). Monitoring trends in global vegetation fire hot spots using MODIS data. *Spatial Information Research*. [10.1007/s41324-022-00457-2](https://doi.org/10.1007/s41324-022-00457-2) | Trend and emerging-hotspot analysis from MODIS alone; notes stubble burning as a significant share of fires. Shows what MODIS-only analysis looks like, which we improve on. | 15, 19 |

### Early warning and outlook

| Paper | Takeaway for us | Feature |
|---|---|---|
| Turco M. et al. (2018). Skilful forecasting of global fire activity using seasonal climate predictions. *Nature Communications*. [10.1038/s41467-018-05250-0](https://doi.org/10.1038/s41467-018-05250-0) | Burned area can be forecast months ahead from drought indices (SPI). A credible path from our climatological outlook to a real seasonal forecast. | 21, 37 |
| Jolly W.M. et al. (2015). Climate-induced variations in global wildfire danger from 1979 to 2013. *Nature Communications*. [10.1038/ncomms8537](https://doi.org/10.1038/ncomms8537) | Fire weather seasons got longer worldwide. Pairs with our "is the burning season shifting?" feature and the "weather or us?" quadrant. | 14, 16 |
| Zhang L. et al. (2025). Near-real-time wildfire detection with Himawari-8/9 geostationary data. *Int. J. Applied Earth Observation and Geoinformation*. [10.1016/j.jag.2025.104416](https://doi.org/10.1016/j.jag.2025.104416) | Ten-minute geostationary detection works. Supports the "sensor-agnostic" vision with MTG FCI over Europe. | 28 |

### Impact and users

| Paper | Takeaway for us | Feature |
|---|---|---|
| Roberts G., Wooster M. (2021). Global impact of landscape fire emissions on surface level PM2.5 concentrations, air quality exposure and population mortality. *Atmospheric Environment*. [10.1016/j.atmosenv.2021.118210](https://doi.org/10.1016/j.atmosenv.2021.118210) | Landscape fire smoke is a major PM2.5 source with a large mortality burden (the bot's notes cite about 677,000 deaths a year; verify before quoting). The "why it matters to everyone" argument for Impact. | 23, pitch |
| Hope E.S. et al. (2024). Exploring the use of satellite Earth observation active wildland fire hotspot data via open access web platforms. *Int. J. Digital Earth*. [10.1080/17538947.2024.2420821](https://doi.org/10.1080/17538947.2024.2420821) | Uses web traffic of FIRMS, GWIS and EFFIS to see who uses hotspot data and where; points at uneven uptake across regions. Grounds our audience claims and the low-bandwidth / bilingual features. | 27, 31 |

## Method ideas from the study (not yet in our plan)

1. **Treat detections as noisy observations of one underlying fire activity.** Each sensor sees the true
   activity times its own detection efficiency, which depends on pixel size, view angle and overpass time.
   This is the formal version of our calibration and could be our "advanced" method:
   `expected detections(sensor, place, day) = efficiency(sensor, view angle, time) x true activity(place, day)`.
   Our per-stratum ratio is the simple case where efficiency is constant within a month and land cover class.
2. **Use fire energy (FRP) next to counts.** Counts depend heavily on the sensor; summed FRP agrees better
   between MODIS and VIIRS within fire clusters (Li et al. 2018). Offer a "counts / energy" toggle and compare
   how much harmonization each needs.
3. **Account for overpass time.** Terra (about 10:30) sees a different part of the day than Aqua and VIIRS
   (about 13:30). The Terra-only years need a diurnal correction, not just a count ratio.
4. **Describe seasons with circular statistics.** Fit one or two peaks over the day of the year (von Mises
   mixture) to get onset, peak, end, length and "one or two seasons" per year, with uncertainty.
5. **Return periods.** "A month this active happens once every 12 years here" is clearer to managers than
   percentiles.
6. **Analog years.** Find past years whose calendar most resembles this year's so far, and show what
   happened next.
