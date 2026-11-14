/* Ember Ledger: data loading and analysis.
 * Drafted with an AI assistant (Claude). No dependencies besides d3 (for quantiles).
 */
"use strict";

const DATA = {
  meta: null,
  cells: null,        // { key -> {row, col, county, lat, lon} }
  cellList: [],       // array of the above
  modis: null,        // Uint16Array triples row, col, day
  viirs: null,
  counties: null,     // GeoJSON
  events: null,       // parsed lazily
  hotspots: {},       // year -> DataView, lazily
  nDays: 0,
  dayYear: null, dayMonth: null, dayDoy: null, dayWeek: null, dayWeekday: null,
  viirsStartDay: 0, aquaStartDay: 0,
};

const cellKey = (row, col) => row * 1000 + col;

async function fetchBin(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.arrayBuffer();
}

async function loadCore() {
  const [meta, cm, cv, cc, counties] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetchBin("data/cd_modis.bin"), fetchBin("data/cd_viirs.bin"), fetchBin("data/cellcounty.bin"),
    fetch("data/counties.geojson").then((r) => r.json()),
  ]);
  DATA.meta = meta;
  DATA.modis = new Uint16Array(cm);
  DATA.viirs = new Uint16Array(cv);
  DATA.counties = counties;
  const g = meta.grid, cc16 = new Uint16Array(cc);
  DATA.cells = new Map();
  for (let i = 0; i < cc16.length; i += 3) {
    const row = cc16[i], col = cc16[i + 1], county = cc16[i + 2];
    const c = { key: cellKey(row, col), row, col, county, lat: g.lat0 + (row + 0.5) * g.size, lon: g.lon0 + (col + 0.5) * g.size };
    DATA.cells.set(c.key, c); DATA.cellList.push(c);
  }
  // day lookup tables (days run from 2000-01-01 to the last day with data)
  const epoch = Date.UTC(2000, 0, 1), endIso = meta.data_end || `${meta.years[1]}-12-31`;
  const end = Date.UTC(+endIso.slice(0, 4), +endIso.slice(5, 7) - 1, +endIso.slice(8, 10));
  DATA.nDays = Math.round((end - epoch) / 864e5) + 1;
  DATA.dayYear = new Uint16Array(DATA.nDays); DATA.dayMonth = new Uint8Array(DATA.nDays);
  DATA.dayDoy = new Uint16Array(DATA.nDays); DATA.dayWeek = new Uint8Array(DATA.nDays); DATA.dayWeekday = new Uint8Array(DATA.nDays);
  for (let d = 0; d < DATA.nDays; d++) {
    const t = new Date(epoch + d * 864e5), y = t.getUTCFullYear();
    const doy = Math.round((Date.UTC(y, t.getUTCMonth(), t.getUTCDate()) - Date.UTC(y, 0, 1)) / 864e5);
    DATA.dayYear[d] = y; DATA.dayMonth[d] = t.getUTCMonth(); DATA.dayDoy[d] = doy;
    DATA.dayWeek[d] = Math.min(51, Math.floor(doy / 7)); DATA.dayWeekday[d] = (t.getUTCDay() + 6) % 7;
  }
  DATA.viirsStartDay = dayOf(meta.viirs_start);
  DATA.aquaStartDay = dayOf(meta.aqua_start);
  DATA.dataStartDay = dayOf(meta.data_start || "2000-11-01");
  DATA.lastFull = meta.last_full_year || meta.years[1];
  DATA.endDate = dateOf(DATA.nDays - 1);
}

function dayOf(iso) { const [y, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 864e5); }
function dateOf(day) { return new Date(Date.UTC(2000, 0, 1) + day * 864e5); }
function isoOf(day) { return dateOf(day).toISOString().slice(0, 10); }

/* ---------- areas of interest ---------- */
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi) inside = !inside;
  }
  return inside;
}
function pointInMultiPolygon(x, y, mp) {
  return mp.some((poly) => pointInRing(x, y, poly[0]) && !poly.slice(1).some((h) => pointInRing(x, y, h)));
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toR = Math.PI / 180, dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Build an AOI object from a spec: {type:"ro"} | {type:"county", id} | {type:"poly", coords:[[lon,lat],...]} | {type:"circle", lat, lon, r} */
function makeAoi(spec) {
  let name, contains, cellFilter;
  if (spec.type === "county") {
    const f = DATA.counties.features.find((x) => x.properties.id === spec.id);
    name = f.properties.name + " county";
    contains = (lat, lon) => pointInMultiPolygon(lon, lat, f.geometry.coordinates);
    cellFilter = (c) => c.county === spec.id;
  } else if (spec.type === "poly") {
    const ring = spec.coords;
    name = spec.name || "Drawn area";
    contains = (lat, lon) => pointInRing(lon, lat, ring);
    cellFilter = (c) => contains(c.lat, c.lon);
  } else if (spec.type === "circle") {
    name = spec.name || `${spec.r} km around ${spec.lat.toFixed(3)}, ${spec.lon.toFixed(3)}`;
    contains = (lat, lon) => haversineKm(lat, lon, spec.lat, spec.lon) <= spec.r;
    cellFilter = (c) => contains(c.lat, c.lon);
  } else {
    name = "All of Romania";
    contains = () => true;
    cellFilter = () => true;
  }
  const cells = new Set();
  for (const c of DATA.cellList) if (cellFilter(c)) cells.add(c.key);
  return { spec, name, contains, cells };
}

/* ---------- harmonized series ---------- */
/** Daily arrays for an AOI: harmonized (VIIRS-equivalent cell-days), raw MODIS and raw VIIRS cell-days. */
function dailySeries(aoi) {
  const n = DATA.nDays, harm = new Float32Array(n), modis = new Float32Array(n), viirs = new Float32Array(n);
  const ratio = DATA.meta.ratio_by_month, terra = DATA.meta.terra_factor_by_month;
  const M = DATA.modis, V = DATA.viirs, vs = DATA.viirsStartDay, as = DATA.aquaStartDay;
  for (let i = 0; i < M.length; i += 3) {
    if (!aoi.cells.has(cellKey(M[i], M[i + 1]))) continue;
    const d = M[i + 2]; if (d >= n) continue;
    modis[d] += 1;
    if (d < vs) { const m = DATA.dayMonth[d]; harm[d] += ratio[m] * (d < as ? terra[m] : 1); }
  }
  for (let i = 0; i < V.length; i += 3) {
    if (!aoi.cells.has(cellKey(V[i], V[i + 1]))) continue;
    const d = V[i + 2]; if (d >= n) continue;
    viirs[d] += 1;
    if (d >= vs) harm[d] += 1;
  }
  return { harm, modis, viirs };
}

const YEARS = () => d3.range(DATA.meta.years[0], DATA.meta.years[1] + 1);
const FULL_YEARS = () => d3.range(2001, DATA.lastFull + 1);

/** Monthly table [{year, month, harm, modis, viirs, modelled}] */
function monthly(series) {
  const map = new Map(), end = DATA.endDate, partialKey = end.getUTCFullYear() * 12 + end.getUTCMonth();
  const monthComplete = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate() === end.getUTCDate();
  for (let d = DATA.dataStartDay; d < DATA.nDays; d++) {
    const k = DATA.dayYear[d] * 12 + DATA.dayMonth[d];
    let r = map.get(k);
    if (!r) { r = { year: DATA.dayYear[d], month: DATA.dayMonth[d], harm: 0, modis: 0, viirs: 0, modelled: d < DATA.viirsStartDay, partial: k === partialKey && !monthComplete }; map.set(k, r); }
    r.harm += series.harm[d]; r.modis += series.modis[d]; r.viirs += series.viirs[d];
  }
  return [...map.values()];
}

function yearly(series) {
  const out = YEARS().map((y) => ({ year: y, harm: 0, modis: 0, viirs: 0 }));
  const y0 = DATA.meta.years[0];
  for (let d = 0; d < DATA.nDays; d++) { const r = out[DATA.dayYear[d] - y0]; r.harm += series.harm[d]; r.modis += series.modis[d]; r.viirs += series.viirs[d]; }
  return out;
}

/** Local check of the harmonization on the overlap years for this AOI. */
function localTrust(series) {
  const [a, b] = DATA.meta.overlap, ratio = DATA.meta.ratio_by_month;
  const pred = {}, obs = {};
  for (let d = 0; d < DATA.nDays; d++) {
    const y = DATA.dayYear[d]; if (y < a || y > b) continue;
    pred[y] = (pred[y] || 0) + series.modis[d] * ratio[DATA.dayMonth[d]];
    obs[y] = (obs[y] || 0) + series.viirs[d];
  }
  const ys = d3.range(a, b + 1).filter((y) => obs[y] > 0);
  const errs = ys.map((y) => Math.abs(pred[y] - obs[y]) / obs[y]);
  const n = d3.sum(ys, (y) => obs[y]);
  const err = errs.length ? d3.mean(errs) * 100 : null;
  const level = n >= 500 && err <= 15 ? "high" : n >= 100 && err <= 35 ? "medium" : "low";
  return { err, n, level, years: ys.map((y) => ({ year: y, predicted: pred[y], observed: obs[y] })) };
}

/** Where a month sits against the same calendar month in other years.
 *  For the month that is still in progress, every year is cut at the same day of the month. */
function monthContext(series, year, month) {
  const end = DATA.endDate, monthLen = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const inProgress = end.getUTCFullYear() === year && end.getUTCMonth() === month && end.getUTCDate() < monthLen;
  const cut = inProgress ? end.getUTCDate() : 31;
  const vals = [];
  for (let y = 2000; y <= DATA.meta.years[1]; y++) {
    const d0 = dayOf(`${y}-${String(month + 1).padStart(2, "0")}-01`);
    if (d0 < DATA.dataStartDay || d0 >= DATA.nDays) continue;
    const last = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
    let v = 0;
    for (let i = 0; i < Math.min(cut, last); i++) if (d0 + i < DATA.nDays) v += series.harm[d0 + i];
    vals.push({ year: y, v });
  }
  const cur = vals.find((r) => r.year === year) || { v: 0 };
  const others = vals.filter((r) => r.year !== year).map((r) => r.v).sort(d3.ascending);
  const median = d3.median(others), p10 = d3.quantile(others, 0.1), p90 = d3.quantile(others, 0.9);
  const rank = 1 + vals.filter((r) => r.v > cur.v).length;
  const pct = (100 * others.filter((v) => v < cur.v).length) / Math.max(1, others.length);
  return { value: cur.v, median, p10, p90, rank, n: vals.length, pct, ratio: median > 0 ? cur.v / median : null, inProgress, cut };
}

/** Mann-Kendall test with Sen's slope on yearly values. */
function trend(values) {
  const n = values.length;
  let s = 0; const slopes = [];
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
    s += Math.sign(values[j] - values[i]); slopes.push((values[j] - values[i]) / (j - i));
  }
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { slope: d3.median(slopes), z, p };
}
function normCdf(x) { // Abramowitz-Stegun
  const t = 1 / (1 + 0.2316419 * x), d = 0.3989423 * Math.exp((-x * x) / 2);
  return 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
}

/** Season window per year: day of year when 10%, 50%, 90% of the year's activity is reached. */
function seasons(series) {
  const out = [];
  for (const y of FULL_YEARS()) {
    const d0 = dayOf(`${y}-01-01`), d1 = Math.min(DATA.nDays - 1, dayOf(`${y}-12-31`));
    let tot = 0; for (let d = d0; d <= d1; d++) tot += series.harm[d];
    if (tot < 5) continue;
    let c = 0, q10 = null, q50 = null, q90 = null;
    for (let d = d0; d <= d1; d++) {
      c += series.harm[d];
      if (q10 == null && c >= 0.1 * tot) q10 = d - d0;
      if (q50 == null && c >= 0.5 * tot) q50 = d - d0;
      if (q90 == null && c >= 0.9 * tot) { q90 = d - d0; break; }
    }
    out.push({ year: y, start: q10, mid: q50, end: q90, total: tot });
  }
  return out;
}

/** Weekly climatology: per week of year, median / p10 / p90 across years. */
function weeklyClimatology(series, fromYear, toYear) {
  const ys = d3.range(fromYear, toYear + 1), y0 = fromYear;
  const tab = ys.map(() => new Float64Array(52));
  for (let d = 0; d < DATA.nDays; d++) {
    const y = DATA.dayYear[d]; if (y < fromYear || y > toYear) continue;
    tab[y - y0][DATA.dayWeek[d]] += series.harm[d];
  }
  const annual = tab.map((w) => d3.sum(w));
  return d3.range(52).map((w) => {
    const v = tab.map((t) => t[w]).sort(d3.ascending);
    return { week: w, median: d3.quantile(v, 0.5), p10: d3.quantile(v, 0.1), p90: d3.quantile(v, 0.9),
      share: d3.median(tab.map((t, i) => (annual[i] ? t[w] / annual[i] : 0))) };
  });
}

/** County ranking for a window of weeks: expected activity from VIIRS-era years (observed only). */
function countyOutlook(startWeek, nWeeks, fromYear, toYear) {
  const weeks = new Set(d3.range(nWeeks).map((i) => (startWeek + i) % 52));
  const counties = DATA.meta.counties, ys = d3.range(fromYear, toYear + 1);
  const tab = new Map(counties.map((c) => [c.id, new Float64Array(ys.length)]));
  const V = DATA.viirs;
  for (let i = 0; i < V.length; i += 3) {
    const d = V[i + 2]; if (d >= DATA.nDays) continue;
    const y = DATA.dayYear[d]; if (y < fromYear || y > toYear || !weeks.has(DATA.dayWeek[d])) continue;
    const c = DATA.cells.get(cellKey(V[i], V[i + 1])); if (!c || c.county === 255) continue;
    tab.get(c.county)[y - fromYear] += 1;
  }
  const rows = counties.map((c) => {
    const v = [...tab.get(c.id)].sort(d3.ascending);
    return { id: c.id, name: c.name, median: d3.quantile(v, 0.5), p90: d3.quantile(v, 0.9), max: v[v.length - 1] };
  });
  const tot = d3.sum(rows, (r) => r.median);
  rows.forEach((r) => (r.share = tot ? r.median / tot : 0));
  return rows.sort((a, b) => b.median - a.median || b.p90 - a.p90);
}

/** Recurring burn sites in the VIIRS era (observed S-NPP cell-days). */
function recurringSites(aoi, fromYear = 2012, toYear = DATA.meta.years[1]) {
  const V = DATA.viirs, sites = new Map();
  for (let i = 0; i < V.length; i += 3) {
    const k = cellKey(V[i], V[i + 1]); if (!aoi.cells.has(k)) continue;
    const d = V[i + 2]; if (d >= DATA.nDays) continue;
    const y = DATA.dayYear[d]; if (y < fromYear || y > toYear) continue;
    let s = sites.get(k); if (!s) { s = { key: k, years: new Set(), days: 0, doys: [], months: new Uint16Array(12) }; sites.set(k, s); }
    s.years.add(y); s.days++; s.doys.push(DATA.dayDoy[d]); s.months[DATA.dayMonth[d]]++;
  }
  const nYears = toYear - fromYear + 1;
  return [...sites.values()].map((s) => {
    const c = DATA.cells.get(s.key), doys = s.doys.sort(d3.ascending);
    const top = d3.range(12).sort((a, b) => s.months[b] - s.months[a]).slice(0, 2).filter((m) => s.months[m] > 0);
    return { ...c, nYears: s.years.size, of: nYears, days: s.days, topMonths: top,
      winStart: d3.quantile(doys, 0.25), winEnd: d3.quantile(doys, 0.75) };
  }).sort((a, b) => b.nYears - a.nYears || b.days - a.days);
}

/** Backtest: choose cells burning in >= k of the training years, measure how much later activity they capture. */
function recurringBacktest(aoi, k, train = [2012, 2019], test = [2020, DATA.meta.years[1]]) {
  const V = DATA.viirs, yrs = new Map(), later = new Map();
  for (let i = 0; i < V.length; i += 3) {
    const key = cellKey(V[i], V[i + 1]); if (!aoi.cells.has(key)) continue;
    const d = V[i + 2]; if (d >= DATA.nDays) continue;
    const y = DATA.dayYear[d];
    if (y >= train[0] && y <= train[1]) { let s = yrs.get(key); if (!s) yrs.set(key, (s = new Set())); s.add(y); }
    else if (y >= test[0] && y <= test[1]) later.set(key, (later.get(key) || 0) + 1);
  }
  const burned = new Set([...yrs.keys(), ...later.keys()]);
  const picked = [...yrs].filter(([, s]) => s.size >= k).map(([key]) => key);
  const total = d3.sum(later.values());
  const captured = d3.sum(picked, (key) => later.get(key) || 0);
  const areaShare = burned.size ? picked.length / burned.size : 0, capShare = total ? captured / total : 0;
  return { picked: picked.length, burned: burned.size, areaShare, capShare, lift: areaShare ? capShare / areaShare : null, total };
}

function weekdayProfile(series) {
  const w = new Float64Array(7);
  for (let d = DATA.viirsStartDay; d < DATA.nDays; d++) w[DATA.dayWeekday[d]] += series.viirs[d];
  return [...w];
}

/* ---------- events ---------- */
async function loadEvents() {
  if (DATA.events) return DATA.events;
  const buf = await fetchBin("data/events.bin"), dv = new DataView(buf), out = [];
  for (let o = 0; o + 20 <= buf.byteLength; o += 20) {
    out.push({ lat: dv.getFloat32(o, true), lon: dv.getFloat32(o + 4, true), frp: dv.getFloat32(o + 8, true),
      start: dv.getUint16(o + 12, true), dur: dv.getUint16(o + 14, true), n: dv.getUint16(o + 16, true), pix: dv.getUint16(o + 18, true) });
  }
  return (DATA.events = out);
}
function eventsIn(aoi, events) {
  const g = DATA.meta.grid;
  return events.filter((e) => aoi.cells.has(cellKey(Math.floor((e.lat - g.lat0) / g.size), Math.floor((e.lon - g.lon0) / g.size))) && aoi.contains(e.lat, e.lon));
}

/* ---------- hotspots ---------- */
async function loadHotspots(year) {
  if (DATA.hotspots[year]) return DATA.hotspots[year];
  const buf = await fetchBin(`data/hotspots/${year}.bin`), dv = new DataView(buf), out = [];
  for (let o = 0; o + 20 <= buf.byteLength; o += 20) {
    out.push({ lat: dv.getFloat32(o, true), lon: dv.getFloat32(o + 4, true), frp: dv.getFloat32(o + 8, true),
      day: dv.getUint16(o + 12, true), time: dv.getUint16(o + 14, true), sensor: dv.getUint8(o + 16), type: dv.getUint8(o + 17),
      conf: dv.getUint8(o + 18), flags: dv.getUint8(o + 19) });
  }
  return (DATA.hotspots[year] = out);
}
const SENSOR_NAME = ["Terra MODIS", "Aqua MODIS", "S-NPP VIIRS", "NOAA-20 VIIRS"];
