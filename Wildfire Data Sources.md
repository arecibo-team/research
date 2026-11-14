# Wildfire Prediction: Data Sources Catalog

A reference for brainstorming features and labels for a fire prediction model. Each section describes the data type in plain terms (what it measures and what it looks like), then lists concrete sources. Check current availability, licensing, and mission status before committing, since some missions and APIs change.

---

## 1. Fire labels and fire history

### Active fire detections (point data)
**What it measures:** Satellites see heat. When a pixel (roughly 375 m to 1 km) is much hotter than its surroundings, it gets flagged as a fire.
**What it looks like:** A table of rows. Each row is one hot spot with latitude, longitude, date, time, brightness temperature, confidence (low, nominal, high), fire radiative power (FRP, how strong the fire is), and a day/night flag. On a map it is a scatter of dots.

Sources:
- **FIRMS (NASA):** MODIS MCD14DL and VIIRS (SNPP, NOAA-20, NOAA-21). Near-real-time and archive.
- **GOES ABI fire products (NOAA):** detections every 5 to 10 minutes over the Americas.
- **Himawari-8/9 (JMA):** similar geostationary fire detection over Asia-Pacific.

### Burned area (polygon or raster data)
**What it measures:** The area that has actually burned, judged from changes in surface reflectance after a fire (the burned surface looks darker in near-infrared).
**What it looks like:** A map where each pixel is marked burned or not, or a polygon outlining a burn scar. Think of a black patch on a satellite picture.

Sources:
- **MODIS MCD64A1 (NASA):** monthly burned-area rasters at 500 m, global since 2000.
- **VIIRS burned area products:** higher-resolution burned area.
- **GlobFire and Global Fire Atlas:** fire events tracked with start date, end date, size, and daily growth.
- **MTBS (US):** verified burn perimeters with severity classes.
- **EFFIS (EU, Middle East, North Africa):** burned area and fire history for Europe and nearby regions.

### Fire incident records (tabular data)
**What it measures:** Reports from fire agencies: where and when a fire started, how big it got, what caused it, how much it cost to fight.
**What it looks like:** A spreadsheet. One row per incident, with coordinates or place name, start date, size in hectares or acres, cause code, and sometimes response time.

Sources:
- **NIFC incident records (US).**
- **US Forest Service FPA-FOD (1992 to 2020):** a large US database with fire cause, size, and location.
- **CNFDB (Canada) and CIFFC situation reports.**
- **INPE Queimadas (Brazil):** satellite-based fire records for Brazil.
- **CONAFOR (Mexico) and state forest agency archives.**
- **AFAC and state fire services (Australia).**
- **State or provincial fire perimeter layers:** often the most detailed local source.

---

## 2. Weather observations and reanalysis

### Gridded reanalysis (weather reconstructed everywhere)
**What it measures:** Weather for the whole planet, rebuilt by combining old observations with a forecast model. Variables include temperature, humidity (via dewpoint), wind, rain, solar radiation, and soil conditions.
**What it looks like:** A grid of values over the map for each hour or day. For a single location, it is a time series, such as "temperature every hour for 30 years." Stored as NetCDF or GRIB files.

Sources:
- **ERA5 and ERA5-Land (Copernicus):** hourly, about 30 km (ERA5) and about 9 km (ERA5-Land), from 1940 onward.
- **MERRA-2 (NASA):** reanalysis with extra aerosol and land fields.
- **JRA-55 (Japan Meteorological Agency):** reanalysis with good Asia-Pacific coverage.

### Station observations (point measurements)
**What it measures:** What an instrument on the ground recorded: air temperature, humidity, wind speed and direction, rainfall, pressure.
**What it looks like:** A table of station ID, time, and readings. Stations are sparse in remote areas and dense in cities. Quality varies, so check for gaps and flags.

Sources:
- **NOAA ISD (Integrated Surface Database):** global hourly observations from airports and weather stations.
- **GHCN-Daily (NOAA):** daily station summaries.
- **Meteostat:** an aggregated, easy-to-use station API.
- **Personal weather station networks (Weather Underground and similar):** dense but uneven quality.

### Precipitation (rainfall)
**What it measures:** How much rain or snow fell over an area in a given period.
**What it looks like:** A grid where each cell holds a total (mm per day). Dry spells show up as long runs of zeros.

Sources:
- **CHIRPS:** daily or monthly rainfall at about 5 km, from 1981.
- **IMERG (NASA GPM):** rainfall every half hour, from satellites.
- **PERSIANN-CDR:** long historical rainfall record.
- **NEXRAD and OPERA radar:** very fine time resolution where radar covers the area.

### Daily surface meteorology (high-resolution)
**What it measures:** Daily weather at fine spatial detail, usually based on station interpolation.
**What it looks like:** Gridded daily files with min and max temperature, precipitation, humidity, and radiation.

Sources:
- **gridMET (US):** daily, about 4 km.
- **Daymet (North America):** daily, 1 km.

### Water balance (monthly, derived)
**What it measures:** How much water goes into and out of the land: rain in, evaporation and plant water use out, leaving soil moisture and deficits.
**What it looks like:** Monthly grids of climate water deficit, soil moisture, and potential evapotranspiration.

Sources:
- **TerraClimate:** monthly, about 4 km, from 1958.

---

## 3. Weather forecasts

### Numerical weather prediction (forecast fields)
**What it measures:** Predicted future weather. Each forecast run gives values at many lead times (for example, every hour out to 7 days).
**What it looks like:** Gridded forecast files (GRIB) for each model run. Useful as features when you use the forecast issued before the prediction day, so you do not leak future information.

Sources:
- **GFS (NOAA):** global, about 13 km, runs four times a day.
- **ECMWF open data (IFS):** global, among the most accurate medium-range forecasts.
- **ICON (DWD, Germany):** global and regional.
- **GEM (Environment Canada):** global and regional.
- **HRRR (US):** hourly, about 3 km, for the contiguous US, forecasting up to 18 hours out.

### Ensemble forecasts
**What it measures:** Many slightly different forecasts from one model. The spread shows how uncertain the forecast is.
**What it looks like:** Multiple gridded fields per run, one per ensemble member. Summaries include the mean and spread.

Sources:
- **GEFS (NOAA):** ensemble version of GFS.
- **ECMWF ENS:** ensemble version of IFS.

### Seasonal and climate outlooks
**What it measures:** Expected climate anomalies for the next months, not daily weather. Useful for a long-term fire season signal.
**What it looks like:** Monthly anomaly grids, often as probability maps (for example, "60% chance of a hotter-than-normal summer").

Sources:
- **ECMWF SEAS5:** seasonal forecasts.
- **NMME (North American Multi-Model Ensemble):** multi-model seasonal forecasts.

### Fire-specific forecasts
**What it measures:** Forecast fire danger, derived from weather forecasts.
**What it looks like:** Daily maps of danger classes or index values, forecast several days ahead.

Sources:
- **CEMS GEFF (Copernicus):** global fire danger forecasts.

---

## 4. Fire danger and fire-weather indices

These are formulas that combine weather variables into a single number that says how easily fuels will ignite and spread. Many are computed from the reanalysis and forecast data above, so you can derive them yourself.

### Canadian Fire Weather Index (FWI) system
**What it measures:** How easily fuel ignites and how fast fire will spread, using a chain of codes. The fuel moisture codes (FFMC, DMC, DC) track drying over time at different depths. ISI and BUI reflect spread and fuel available. FWI combines them into a final danger score.
**What it looks like:** Daily numbers per location, from 0 upward. Higher means more dangerous. Values change slowly day to day for the deep codes (DC, the slow drying of deep layers) and quickly for FFMC (surface fuels).

### Keetch-Byram Drought Index (KBDI)
**What it measures:** Cumulative soil and duff dryness. It rises with heat and dry days and drops after significant rain.
**What it looks like:** A slowly moving number, from 0 (wet soil) to about 800 (very dry). Shows the build-up of drought over weeks.

### Haines Index
**What it measures:** How unstable and dry the air is above the surface, which lets smoke and fire plumes rise and makes fire growth more likely.
**What it looks like:** A small integer score, from 2 (stable and moist) to 6 (very unstable and dry).

### Vapor Pressure Deficit (VPD)
**What it measures:** How much moisture the air can still take up. High VPD pulls water out of plants and dead fuel.
**What it looks like:** Hourly or daily values in kPa. Low values mean humid air; high values mean the air is thirsty and dry.

### Other indices
- **Fosberg Fire Weather Index:** a simpler index based on humidity, wind, and temperature.
- **Angstrom index:** a quick humidity and temperature index.
- **McArthur Forest Fire Danger Index:** an Australian standard index.
- **NFDRS (US National Fire Danger Rating System):** combines weather and fuel models into danger classes.

---

## 5. Vegetation and fuel state

### Vegetation indices (greenness)
**What it measures:** How green and healthy plants are. Healthy leaves reflect more near-infrared light and absorb more red light. The index compares the two.
**What it looks like:** A grid of values from about -1 to +1. Bare soil and water are near zero or negative, dense healthy forest is high (around 0.6 to 0.9). Over time it becomes a curve, showing green-up in spring and drying in summer.

Sources:
- **MODIS NDVI and EVI (MOD13 products):** every 16 days, about 250 m to 1 km.
- **VIIRS vegetation indices:** newer continuity with MODIS.
- **Sentinel-2 indices (NDVI, NDMI, NBR, red-edge):** about 10 to 20 m, every 5 days.
- **Landsat (1972 onward):** long archive, 30 m, every 16 days.

### Leaf area and canopy structure
**What it measures:** How much leaf surface sits over the ground (LAI) and how much light plants absorb (fAPAR).
**What it looks like:** Grids with values from 0 to about 8 for LAI. Bigger values mean denser canopies.

Sources:
- **MODIS LAI and fAPAR (MOD15).**
- **ICESat-2 canopy height along tracks.**

### Canopy height and vertical structure (lidar)
**What it measures:** Height and layering of trees and shrubs. Tall, layered vegetation carries fire into the crowns.
**What it looks like:** Points or footprints (GEDI) with canopy height and vertical profile, or height maps.

Sources:
- **GEDI (NASA lidar on the ISS):** sparse footprints; check mission status and coverage for your period.

### Radar and thermal observations
**What it measures:** Radar sees surface roughness and moisture regardless of clouds. Thermal sensors measure how hot the ground surface is.
**What it looks like:** Radar gives backscatter maps (brighter means rougher or wetter structure). Thermal gives land surface temperature in kelvin, with hot areas showing as bright patches.

Sources:
- **Sentinel-1 SAR:** all-weather radar.
- **Landsat and ASTER thermal bands:** land surface temperature.
- **Sentinel-3 (SLSTR):** land surface temperature at coarser resolution, daily.

### Evapotranspiration and plant stress
**What it measures:** How much water plants move into the air (evapotranspiration) and how stressed they are. Stressed plants have dry, flammable leaves.
**What it looks like:** Thermal-based maps of evapotranspiration and a stress index, typically from 0 (unstressed) to 1 (fully stressed), or daily time series per pixel.

Sources:
- **ECOSTRESS (NASA):** evapotranspiration, water use efficiency, stress index, from the ISS; check mission status.

### Live and dead fuel moisture
**What it measures:** How much water is in fuel. Dead fuel (dry grass, litter) responds to weather within hours to days. Live fuel responds more slowly and depends on the plant's health.
**What it looks like:** Live fuel moisture is a percent (often 50 to 200 percent for living plants, lower when stressed). Dead fuel moisture is a percent that drops quickly in dry, warm air.

Sources:
- **Live Fuel Moisture Content (LFMC) field datasets:** measured samples, useful for calibration.
- **Dead fuel moisture models (for example, Nelson model):** computed from weather inputs.

### Biomass (fuel load)
**What it measures:** How much organic material sits on the land, which sets how much fuel there is to burn.
**What it looks like:** Maps in tonnes per hectare. Forests show high values, grasslands low values.

Sources:
- **ESA CCI Biomass.**
- **GEDI-derived biomass maps.**
- **Global Forest Watch:** forest carbon and cover data.

### Phenology (seasonal timing of plants)
**What it measures:** When plants green up, peak, and dry out each year.
**What it looks like:** Per-pixel dates or curves across the seasons, often from MODIS or Sentinel-2 time series.

---

## 6. Soil and hydrology

### Soil moisture
**What it measures:** Water held in the top layer of soil, or at root depth. Dry soil means dry vegetation and more fire potential.
**What it looks like:** Grids with values as volumetric fraction (for example, 0.05 for very dry, 0.40 for saturated). Time series show drying during dry spells.

Sources:
- **SMAP (NASA):** surface and root-zone moisture from L-band radar and radiometer.
- **SMOS (ESA):** L-band soil moisture.
- **ESA CCI soil moisture:** merged long-term record.
- **ERA5-Land soil layers:** modeled soil moisture at several depths.

### Groundwater and total water storage
**What it measures:** Water stored below ground and in the whole land column. Long-term drought shows up as a steady decline.
**What it looks like:** Monthly anomaly maps (above or below normal). Coarse resolution, around 100 km.

Sources:
- **GRACE and GRACE-FO (NASA):** total water storage anomalies.
- **USGS NWIS and national groundwater networks:** well level measurements.

### Surface water and streamflow
**What it measures:** Where water sits on the surface and how fast rivers flow. Falling flows signal drought.
**What it looks like:** Maps of water extent (where water is present or not), and river gauge time series of discharge (cubic meters per second).

Sources:
- **Global Surface Water (JRC):** water extent history, useful for masking non-burnable areas.
- **HydroSHEDS:** drainage networks and flow accumulation.
- **GRDC and USGS NWIS:** river discharge.

---

## 7. Terrain

### Elevation and derived terrain
**What it measures:** The height of the ground. Derived metrics include slope (how steep), aspect (which direction the slope faces), and curvature (whether the terrain is concave or convex).
**What it looks like:** A grid of elevations in meters. Slope and aspect maps show steep areas and sun-facing slopes. Fire spreads faster uphill and on south-facing slopes in the Northern Hemisphere, where sun dries fuel more.

Sources:
- **Copernicus DEM GLO-30 and GLO-90.**
- **SRTM (30 m).**
- **ALOS World 3D (30 m).**
- **TanDEM-X:** high-accuracy DEM.

### Derived terrain measures
- **Topographic wetness index:** where water collects, which is often moist and less flammable.
- **Terrain ruggedness:** how bumpy the land is, which can slow or channel fire.
- **Aspect-based solar exposure:** how much sun a slope gets over a year.
- **Wind exposure and sheltering:** how terrain blocks or funnels wind.

---

## 8. Land cover and fuel types

### Land cover (classes)
**What it measures:** What covers each piece of land: forest, grassland, shrubland, cropland, urban, water, bare ground.
**What it looks like:** A categorical map. Each pixel has a class number (for example, 10 = tree cover, 40 = cropland). Use one-hot encoding for models.

Sources:
- **ESA WorldCover (10 m, 2020 and 2021).**
- **Copernicus Global Land Cover (100 m).**
- **MODIS MCD12Q1 (500 m, annual).**
- **Dynamic World (Google and WRI, 10 m, near-real-time).**
- **ESA CCI Land Cover:** long-term record.

### Fuel models (how a fire behaves in a cover type)
**What it measures:** Fire-behavior classes that describe how fast fire spreads and how intense it burns in each cover type.
**What it looks like:** A categorical map with fuel codes (for example, grass, timber litter, brush). Each code links to expected spread rates.

Sources:
- **LANDFIRE (US):** fuel models and vegetation maps.
- **Canadian National Fire Behavior Prediction (FBP) fuel types:** Canadian equivalent.
- **Global fuel maps (various research products):** coarser but global.

### Forest disturbance and loss
**What it measures:** Where tree cover has been lost, by fire, logging, or other causes, and when.
**What it looks like:** Annual maps of loss pixels with years. Also alerts that flag new losses.

Sources:
- **Hansen Global Forest Change (30 m, annual).**
- **Global Forest Watch alerts.**

### Ecosystem and biome context
**What it measures:** The broad ecosystem type (desert, boreal forest, savanna, Mediterranean shrubland). Ecosystems set typical fire regimes.
**What it looks like:** Polygon or grid maps with ecosystem labels.

Sources:
- **WWF Terrestrial Ecoregions.**
- **Global Ecosystem Types (IUCN).**

---

## 9. Human activity and infrastructure

### Roads, rail, and power lines (line features)
**What it measures:** Where people travel and where infrastructure runs. Most human-caused fires start near roads, rail lines, and power corridors.
**What it looks like:** Vector lines with coordinates. Convert them to distance-to-nearest-line rasters or counts per cell.

Sources:
- **OpenStreetMap:** roads, railways, power lines, trails, campgrounds.
- **HIFLD (US) and OpenInfraMap:** transmission lines.
- **National transport and utility datasets.**

### Settlements and buildings
**What it measures:** Where people live and how dense the built environment is.
**What it looks like:** Footprint polygons for buildings, or density grids (buildings or people per square km).

Sources:
- **Overture Maps Foundation:** building footprints, places, and roads.
- **Microsoft Global Building Footprints.**
- **GHS-BUILT (JRC):** built-up area.

### Population
**What it measures:** How many people live in each area, which correlates with ignition risk.
**What it looks like:** Grids with people per cell, often at 100 m or 1 km.

Sources:
- **WorldPop (100 m).**
- **GHS-POP (JRC).**
- **SEDAC (NASA):** population and socioeconomic grids.

### Night lights (activity proxy)
**What it measures:** Artificial light at night. Brighter areas usually mean more human activity.
**What it looks like:** Radiance maps. Dark areas are near zero, cities are bright.

Sources:
- **VIIRS Black Marble (NASA).**

### Human pressure index
**What it measures:** A combined score of human pressures on land: population, roads, land use, lights, and more.
**What it looks like:** A single grid with values from 0 (wild) to high values (heavily used land).

Sources:
- **Human Footprint Index (WCS).**

### Wildland-urban interface (WUI)
**What it measures:** Where homes sit close to wildland vegetation. These areas have high fire risk and high exposure.
**What it looks like:** Zones labeled by type (intermix, interface, non-WUI).

Sources:
- **SILVIS and USFS WUI maps (US).**

### Land ownership and management
**What it measures:** Who owns or manages a parcel. Management affects burning, clearing, and suppression.
**What it looks like:** Parcel polygons with owner type (federal, state, private, tribal).

Sources:
- **National cadastre or county parcel data.**
- **Protected area database (WDPA).**

### Fuel treatments and prescribed burns
**What it measures:** Where fuel was reduced on purpose, through thinning or controlled burns. Treated areas burn less intensely.
**What it looks like:** Polygons with dates and treatment type.

Sources:
- **USFS and state agency treatment records.**

### Suppression resources
**What it measures:** How many firefighting resources are nearby, which shapes how far a fire spreads before it is contained.
**What it looks like:** Point locations for stations, crews, and aircraft bases, plus response-time estimates.

Sources:
- **Fire station registries (national fire services).**

---

## 10. Lightning (natural ignition)

### Lightning strikes
**What it measures:** Where and when lightning hits the ground or cloud. Dry lightning (strikes with little rain) is a major natural cause of wildfire.
**What it looks like:** Event rows with time, lat, lon, polarity, and peak current (kA). On a map, a scatter of flashes, often dense during storms.

Sources:
- **GOES GLM (NOAA):** continuous flash detection over the Americas.
- **WWLLN (World Wide Lightning Location Network):** global, lower detection rate.
- **ENTLN (Earth Networks):** commercial network.
- **NLDN (US):** cloud-to-ground strikes.
- **GLD360 (Vaisala):** global detection.
- **TRMM LIS and LIS-ISS:** historical climatology.

---

## 11. Air quality and smoke

### Aerosols and smoke
**What it measures:** Particles in the air, including smoke. High values show active burning or a smoke plume.
**What it looks like:** Aerosol optical depth (AOD) is a unitless value, usually 0 to 1, where higher means hazier air. Smoke forecasts are maps of concentration.

Sources:
- **CAMS (Copernicus): aerosol and smoke forecasts.**
- **MODIS and VIIRS AOD.**
- **MERRA-2 aerosols.**

### Combustion gases
**What it measures:** Gases emitted by burning, such as carbon monoxide (CO) and nitrogen dioxide (NO2).
**What it looks like:** Column concentration maps, with hot spots showing combustion sources.

Sources:
- **TROPOMI (Sentinel-5P):** CO, NO2, and other trace gases.

### Surface air quality
**What it measures:** Pollution at ground level, from monitoring stations.
**What it looks like:** Hourly time series of PM2.5 (µg/m3) per station.

Sources:
- **AirNow (US).**
- **EEA air quality network (Europe).**

---

## 12. Climate drivers and drought indices

### Large-scale climate indices
**What it measures:** Big ocean and atmosphere patterns that shift rainfall and temperature for months or years at a time.
**What it looks like:** Monthly time series of index values, typically positive or negative around zero.

Sources:
- **ENSO (ONI, Niño 3.4):** El Niño and La Niña phases. El Niño often means drier conditions in some fire-prone regions.
- **Indian Ocean Dipole (IOD).**
- **Pacific Decadal Oscillation (PDO).**
- **Atlantic Multidecadal Oscillation (AMO).**
- **MJO:** short-term rainfall oscillation (weeks).

### Drought indices
**What it measures:** How dry a location is compared to normal, over different time windows.
**What it looks like:** Gridded values, often scaled so 0 is normal and negative values are drier than normal.

Sources:
- **SPEI (multi-scale, from ERA5 or TerraClimate).**
- **SPI (rainfall only).**
- **PDSI (Palmer).**
- **US Drought Monitor:** categorical maps (D0 to D4).
- **Global Drought Observatory (EU).**

### Long-term climate projections
**What it measures:** Possible future climate under different emissions scenarios, used for long-horizon risk.
**What it looks like:** Gridded projections of temperature and precipitation for future decades.

Sources:
- **CMIP6 model archive.**
- **Copernicus Climate Data Store projections.**

---

## 13. Imagery and near-real-time observations

### Satellite imagery (visual and multispectral)
**What it measures:** Surface appearance across several wavelengths, including visible, near-infrared, and short-wave infrared. Smoke, burn scars, and vegetation all show distinct colors.
**What it looks like:** Pictures. True-color images look like photos. False-color images highlight vegetation (red), burn scars (dark), and smoke (grey-white).

Sources:
- **NASA Worldview:** daily true-color VIIRS and MODIS.
- **Sentinel-2:** 10 to 20 m, multispectral, every 5 days.
- **Landsat 8 and 9:** 30 m, every 16 days (combined).
- **Commercial high-resolution (Planet, Maxar, Airbus):** very fine, often restricted.

### Geostationary imagery (frequent)
**What it measures:** Repeated images of the same area every few minutes, showing smoke growth and fire spread in near real time.
**What it looks like:** Animated image sequences. Good for tracking fire progress hour by hour.

Sources:
- **GOES-16/17/18/19 ABI (NOAA):** Americas.
- **Himawari-8/9 (JMA):** Asia-Pacific.
- **MSG SEVIRI (EUMETSAT):** Europe and Africa.

### Camera networks and ground observations
**What it measures:** Smoke seen by fixed cameras on towers, plus human reports.
**What it looks like:** Still images or time-stamped photos. Human reports are text or point entries and tend to be noisy.

Sources:
- **ALERTCalifornia and AlertWildfire camera networks.**
- **State fire lookout networks.**
- **Volunteer or crowdsourced reports:** supplementary and noisy.

---

## 14. Socioeconomic and governance

### Demographics
**What it measures:** Age, income, education, housing age, and household structure by area.
**What it looks like:** Tables by census tract or district, often joined to map polygons.

Sources:
- **National census bureaus and statistics offices.**
- **US Census ACS (American Community Survey).**
- **Eurostat (EU).**

### Governance and funding
**What it measures:** Fire management budgets, policy, and staffing. Harder to use directly but can explain differences between regions.
**What it looks like:** Annual tables by agency or region.

---

## 15. Time and calendar features

### Solar geometry
**What it measures:** Sun angle and day length at each location. Affects drying and fire behavior.
**What it looks like:** Numeric values per timestamp and location (for example, solar elevation in degrees).

### Calendar and human rhythm
**What it measures:** Holidays, weekends, school breaks, and harvest or burn seasons. Human activity changes with them.
**What it looks like:** Binary or categorical flags per date.

---

## 16. Derived features (built from the sources above)

These are often the most useful features, because they capture change and context rather than single values.

### Time-based aggregates
- Rolling sums and means over 3, 7, 14, 30, and 60 days (rain, temperature, VPD).
- Days since last significant rain.
- Consecutive dry days and consecutive hot days.
- Cumulative heat or degree-day sums.
- Lagged values (yesterday's FWI, last week's NDVI).

### Anomalies
- Value minus the local climatology (for example, temperature anomaly).
- Z-scores or percentiles relative to the same day of year.
- Vegetation anomaly (current NDVI minus its seasonal average).

### Spatial features
- Fire counts in buffers around each cell (1, 5, 10, 25 km).
- Distance to the nearest prior fire, perimeter, or road.
- Neighbor averages of key variables.
- Upwind and downwind features (what is upstream of the wind direction).

### Interaction features
- Wind times slope (rapid uphill spread).
- VPD times fuel type (dry air on flammable fuel).
- Temperature times NDVI deficit (heat on stressed vegetation).
- Lightning times dry fuel (dry lightning risk).

### Graph and sequence representations
- Graph neighbors for GNN models (each cell connected to nearby cells).
- Multi-day image stacks for ConvLSTM, U-Net, or transformer models.

---

## Quick reference: which data types map to which model inputs

| Model input | Typical data types |
|---|---|
| Label (target) | Active fire points, burned area, incident records |
| Recent weather | Reanalysis, station data, precipitation |
| Forecast weather | GFS, ECMWF, HRRR, ensemble forecasts |
| Fire danger | FWI, KBDI, VPD, Haines |
| Dryness | Soil moisture, drought indices, water storage |
| Fuel state | NDVI, LAI, ECOSTRESS, live fuel moisture |
| Fuel type | Land cover, fuel models, biomass |
| Terrain | DEM, slope, aspect |
| Human ignition | Roads, power lines, population, night lights |
| Natural ignition | Lightning |
| Context | Climate indices, calendar, solar geometry |

---

## Practical notes
- **Common grid:** pick one resolution (for example, 1 km) and resample everything to it. Use mean for continuous variables (temperature), max or fraction for categorical ones (land cover).
- **Common time step:** daily is a good start. Many sources are daily or coarser; lightning and geostationary imagery are sub-daily and need aggregating.
- **Leakage:** only use forecasts issued before the prediction time, and only use satellite products that were available then (not later reprocessed versions) when you need strict real-time performance.
- **Platform:** Google Earth Engine hosts many of these (FIRMS, ERA5, MODIS, Sentinel, DEMs, WorldCover, GLM, Dynamic World, Global Surface Water), which simplifies building a cell-day table.
