/* Arecibo research showcase. Plain JS, no build step.
 * Drafted with an AI assistant (Claude) for the team to review.
 * Libraries (CDN): Leaflet, d3, Observable Plot, marked, DOMPurify.
 */
"use strict";

const REPO_URL = "https://github.com/arecibo-team/research";
const DEADLINE = Date.UTC(2026, 10, 15, 21, 59); // Sun 15 Nov 2026 23:59 Bucharest (UTC+2)
const STORE_KEY = "arecibo-showcase-v1";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RO_BOUNDS = [[43.4, 20.0], [48.4, 30.0]];
const EFFORT_H = { S: 3, M: 6, L: 12 };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = d3.format(",");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = { summary: null, features: [], sources: [], baseline: null, local: null, pointsCache: {}, maps: {} };

/* ---------- storage (browser only, never required) ---------- */
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.local)); } catch { /* private mode: keep in memory */ }
  renderDiffNote();
  renderProgress();
}

/* ---------- boot ---------- */
async function getJSON(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.json();
}

async function boot() {
  tickDeadline(); setInterval(tickDeadline, 30000);
  try {
    const [summary, features, sources, baseline] = await Promise.all([
      getJSON("data/firms_summary.json"), getJSON("data/features.json"),
      getJSON("data/sources.json"), getJSON("decisions.json"),
    ]);
    Object.assign(state, { summary, features, sources, baseline });
  } catch (e) {
    document.querySelector("main").innerHTML = `<div class="card"><h2>Could not load data</h2>
      <p>This page needs to be served over HTTP, not opened as a file. From the repo root run
      <code>python3 -m http.server 8000</code> and open <code>http://localhost:8000/showcase/</code>.</p>
      <p class="hint">${esc(e.message)}</p></div>`;
    return;
  }
  state.local = mergeLocal(state.baseline, loadLocal());
  window.addEventListener("hashchange", route);
  route();
}

function mergeLocal(base, local) {
  const out = JSON.parse(JSON.stringify(base));
  if (!local) return out;
  for (const q of out.questions) {
    const l = (local.questions || []).find((x) => x.id === q.id);
    if (l) Object.assign(q, { choice: l.choice, notes: l.notes, status: l.status });
  }
  out.features = Object.assign({}, base.features, local.features || {});
  return out;
}

function tickDeadline() {
  const ms = DEADLINE - Date.now();
  const el = $("#deadline");
  if (ms <= 0) { el.innerHTML = "<b>Submission closed</b>"; return; }
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  el.innerHTML = `Submission closes in <b>${h} h ${m} min</b>`;
}

/* ---------- routing ---------- */
const rendered = {};
function route() {
  const id = (location.hash || "#overview").slice(1).split("/")[0];
  const view = $("#view-" + id) ? id : "overview";
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $$("#nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + view));
  const fn = { overview: renderOverview, data: renderData, sources: renderSources, ideas: renderIdeas, decisions: renderDecisions, library: renderLibrary }[view];
  if (!rendered[view]) { rendered[view] = true; fn(); }
  else if (view === "overview") renderProgress();
  Object.values(state.maps).forEach((m) => setTimeout(() => m.invalidateSize(), 50));
}

/* ---------- data helpers ---------- */
const S = () => state.summary;
const years = (a, b) => d3.range(a, b + 1);
function series(key) { return S().monthly_detections[key] || {}; }
function yearSum(obj, y) { const v = obj[y]; return v ? d3.sum(v) : null; }

function yearlyRows() {
  const out = [];
  const modis = series("modis_veg"), viirs = series("viirs_veg");
  for (const y of years(2000, 2025)) {
    const m = yearSum(modis, y), v = yearSum(viirs, y), h = d3.sum(S().harmonized[y]);
    if (m != null) out.push({ year: y, value: m, series: "MODIS detections" });
    if (v != null) out.push({ year: y, value: v, series: "VIIRS S-NPP detections" });
    out.push({ year: y, value: y < 2012 ? m : v, series: "Raw, stitched" });
    out.push({ year: y, value: h, series: "Harmonized cell-days" });
  }
  return out;
}

function overlapRatio() {
  let m = 0, v = 0;
  for (const y of years(2013, 2022)) { m += yearSum(series("modis_veg"), y); v += yearSum(series("viirs_veg"), y); }
  return v / m;
}

/* ---------- OVERVIEW ---------- */
function renderOverview() {
  const s = S();
  const total = Object.values(s.types).reduce((a, t) => a + d3.sum(Object.values(t)), 0);
  $("#kpis").innerHTML = [
    [fmt(total), "FIRMS records for Romania, 2000–2025"],
    [overlapRatio().toFixed(1) + "×", "more VIIRS than MODIS vegetation detections (2013–2022)"],
    [s.loyo_mape_pct + "%", "yearly error of the prototype harmonization (leave-one-year-out)"],
    ["2027", "NASA's planned end of MODIS science data"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  const findings = [
    `VIIRS reports about ${overlapRatio().toFixed(1)}× more vegetation hotspots than MODIS; stitching them invents a jump in 2012.`,
    `The VIIRS/MODIS ratio swings by season (${d3.min(s.ratio_by_month)}–${d3.max(s.ratio_by_month)}× in cell-days), so one global factor is wrong.`,
    `Mixing S-NPP and NOAA-20 creates a second break in 2018; an S-NPP-only reference cut the prototype error from about 28% to ${s.loyo_mape_pct}%.`,
    `MODIS files mix product versions (${Object.keys(s.versions.modis).join(", ")}) and early years carry no static-source flags; our own mask removed ${fmt(d3.sum(Object.values(s.modis_removed_by_mask)))} MODIS detections.`,
    "FIRMS country files stop at 2025: the current year needs the API and a MAP_KEY.",
    "EFFIS skips farmland-only and small fires, which is most of Romania's burning: a gap our tool fills.",
  ];
  $("#findings").innerHTML = findings.map((f) => `<li>${esc(f)}</li>`).join("");

  const draw = (mode) => {
    const rows = yearlyRows().filter((r) => r.series === (mode === "raw" ? "Raw, stitched" : "Harmonized cell-days"));
    const el = $("#cliff-mini"); el.replaceChildren(Plot.plot({
      height: 240, marginLeft: 56, x: { label: null, ticks: [2000, 2005, 2010, 2015, 2020, 2025], tickFormat: "d" }, y: { grid: true, label: mode === "raw" ? "detections" : "fire cell-days" },
      marks: [
        Plot.rectX([{ x1: 2011.5, x2: 2025.5 }], { x1: "x1", x2: "x2", fill: css("--viirs"), fillOpacity: 0.07 }),
        Plot.barY(rows, { x: "year", y: "value", fill: (d) => d.year < 2012 ? css("--modis") : css("--viirs"), tip: true }),
        Plot.text([{ x: 2006, t: "MODIS era" }, { x: 2018.5, t: "VIIRS era" }], { x: "x", frameAnchor: "top", text: "t", fill: css("--muted"), dy: 4 }),
      ],
    }));
  };
  segmented("#cliff-toggle", draw);
  draw("raw");
  renderProgress();
}

function renderProgress() {
  if (!state.local) return;
  const qs = state.local.questions, decided = qs.filter((q) => q.status === "decided").length;
  const f = state.local.features, vals = Object.values(f).map((x) => x.status).filter(Boolean);
  const build = vals.filter((v) => v === "build").length;
  const el = $("#progress"); if (!el) return;
  el.innerHTML = `
    <p><b>${decided}</b> of ${qs.length} questions decided</p>
    <div class="bar"><div style="width:${(100 * decided) / qs.length}%"></div></div>
    <p><b>${vals.length}</b> of ${state.features.length} features triaged, <b>${build}</b> marked Build</p>
    <div class="bar"><div style="width:${(100 * vals.length) / state.features.length}%"></div></div>`;
}

/* ---------- FIRMS DATA ---------- */
function renderData() {
  const s = S();
  const total = Object.values(s.types).reduce((a, t) => a + d3.sum(Object.values(t)), 0);
  $("#data-count").textContent = `${fmt(total)} records across MODIS Terra/Aqua, VIIRS S-NPP and NOAA-20`;
  renderRows();
  renderFireMap();
  renderCalendar();
  renderCliffFull();
  renderTimeline();
  renderRatio();
  renderLoyo();
  renderFrp();
  renderSeason();
  renderWeekday();
  renderTypes();
}

const COLUMN_HELP = {
  latitude: "Centre of the fire pixel", longitude: "Centre of the fire pixel",
  brightness: "MODIS channel 21/22 brightness temperature (K)", bright_ti4: "VIIRS I-4 brightness temperature (K)",
  scan: "Pixel size along scan (km); grows toward the swath edge", track: "Pixel size along track (km)",
  acq_date: "Acquisition date (UTC)", acq_time: "Overpass time HHMM (UTC)", satellite: "Terra/Aqua, N = S-NPP, N20 = NOAA-20",
  instrument: "MODIS or VIIRS", confidence: "MODIS 0–100; VIIRS l/n/h", version: "Collection / processing version",
  bright_t31: "MODIS channel 31 brightness temperature (K)", bright_ti5: "VIIRS I-5 brightness temperature (K)",
  frp: "Fire radiative power (MW): how strong the fire is", daynight: "D = day, N = night",
  type: "0 vegetation fire, 1 volcano, 2 other static land source, 3 offshore",
};
async function renderRows() {
  const rows = await getJSON("data/sample_rows.json");
  for (const k of ["modis", "snpp"]) {
    const cols = Object.keys(rows[k][0]);
    $("#rows-" + k).innerHTML = `<table><thead><tr>${cols.map((c) => `<th title="${esc(COLUMN_HELP[c] || c)}">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows[k].map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
}

function baseMap(el) {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const m = L.map(el, { preferCanvas: true, scrollWheelZoom: false }).fitBounds(RO_BOUNDS);
  const base = dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
  L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${base}/MapServer/tile/{z}/{y}/{x}`, {
    attribution: "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors", maxZoom: 16,
  }).addTo(m);
  return m;
}

const monthColor = (doy) => d3.interpolateSinebow(((doy - 1) / 366 + 0.6) % 1);
async function renderFireMap() {
  const sel = $("#map-year");
  sel.innerHTML = [2025, 2023, 2019, 2015, 2007].map((y) => `<option>${y}</option>`).join("");
  sel.value = "2019";
  const map = baseMap("fire-map"); state.maps.fire = map;
  const layer = L.layerGroup().addTo(map);
  const renderer = L.canvas({ padding: 0.3 });
  let sensor = "both", type = "veg";
  const draw = async () => {
    const y = sel.value;
    if (!state.pointsCache[y]) state.pointsCache[y] = await getJSON(`data/points_${y}.json`);
    const pts = state.pointsCache[y].filter((p) => (sensor === "both" || p[5] === sensor) &&
      (type === "all" || (type === "veg" ? p[4] === 0 : p[4] !== 0)));
    layer.clearLayers();
    for (const [lat, lon, doy, frp, t, sen] of pts) {
      L.circleMarker([lat, lon], {
        renderer, radius: sen === "M" ? 3.2 : 1.8, weight: sen === "M" ? 1 : 0, color: css("--ink"),
        fillColor: t === 0 ? monthColor(doy) : "#666", fillOpacity: 0.85,
      }).bindTooltip(`${sen === "M" ? "MODIS" : "VIIRS"} · day ${doy} · ${frp} MW${t ? " · type " + t : ""}`).addTo(layer);
    }
    const nm = pts.filter((p) => p[5] === "M").length, nv = pts.length - nm;
    $("#map-stats").textContent = `${fmt(pts.length)} points (MODIS ${fmt(nm)}, VIIRS ${fmt(nv)})`;
  };
  segmented("#map-sensor", (v) => { sensor = v; draw(); });
  segmented("#map-type", (v) => { type = v; draw(); });
  sel.onchange = draw;
  $("#map-legend").innerHTML = MONTHS.map((m, i) => `<span><i style="background:${monthColor(i * 30.5 + 15)}"></i>${m}</span>`).join("") +
    `<span><i style="background:#666"></i>static source</span><span>Larger outlined dots = MODIS (1 km), small = VIIRS (375 m)</span>`;
  draw();
}

function calendarRows(mode) {
  const s = S(), out = [];
  const med = MONTHS.map((_, m) => d3.median(years(2000, 2025), (y) => s.harmonized[y][m]));
  for (const y of years(2000, 2025)) for (let m = 0; m < 12; m++) {
    let v = null;
    const modis = series("modis_veg")[y], viirs = series("viirs_veg")[y];
    if (mode === "modis") v = modis ? modis[m] : null;
    else if (mode === "viirs") v = viirs ? viirs[m] : null;
    else if (mode === "stitched") v = y < 2012 ? (modis ? modis[m] : null) : (viirs ? viirs[m] : null);
    else if (mode === "harm") v = s.harmonized[y][m];
    else if (mode === "anom") v = Math.log2((s.harmonized[y][m] + 1) / (med[m] + 1));
    if (v == null) continue;
    out.push({ year: y, month: MONTHS[m], v, modelled: s.harmonized_flag[y][m] === "modelled" && (mode === "harm" || mode === "anom") });
  }
  return out;
}
function renderCalendar() {
  const draw = () => {
    const mode = $("#cal-mode").value, scheme = $("#cal-scheme").value;
    const rows = calendarRows(mode);
    const anom = mode === "anom";
    $("#calendar").replaceChildren(Plot.plot({
      width: 900, height: 26 * 26 + 40, marginLeft: 44, padding: 0.04,
      x: { domain: MONTHS, label: null, axis: "top" }, y: { domain: years(2000, 2025).map(String), label: null },
      color: anom ? { type: "diverging", scheme: "RdBu", reverse: true, domain: [-3, 3], legend: true, label: "log2 vs median (−3 = 8× less, +3 = 8× more)" }
                  : { type: "sqrt", scheme, legend: true, label: mode === "harm" ? "fire cell-days" : "detections" },
      marks: [
        Plot.cell(rows, { x: "month", y: (d) => String(d.year), fill: "v", inset: 0.5, tip: { format: { v: anom ? ".2f" : "," } } }),
        Plot.text(rows.filter((d) => d.modelled), { x: "month", y: (d) => String(d.year), text: () => "m", fill: "currentColor", fillOpacity: 0.45, fontSize: 9 }),
      ],
    }));
  };
  $("#cal-mode").onchange = draw; $("#cal-scheme").onchange = draw; draw();
}

function renderCliffFull() {
  const rows = yearlyRows();
  const color = { "MODIS detections": css("--modis"), "VIIRS S-NPP detections": css("--viirs"), "Raw, stitched": css("--muted"), "Harmonized cell-days": css("--harm") };
  $("#cliff-full").replaceChildren(Plot.plot({
    height: 300, marginLeft: 56, x: { tickFormat: "d", label: null }, y: { grid: true, label: "per year" },
    color: { domain: Object.keys(color), range: Object.values(color), legend: true },
    marks: [
      Plot.ruleX([2012], { stroke: css("--line"), strokeDasharray: "4 3" }),
      Plot.lineY(rows, { x: "year", y: "value", stroke: "series", strokeWidth: (d) => d.series === "Harmonized cell-days" ? 2.5 : 1.5,
        strokeDasharray: (d) => d.series === "Raw, stitched" ? "5 3" : null, marker: "dot", tip: true }),
    ],
  }));
}

function renderTimeline() {
  const D = (s) => new Date(s);
  const sats = [
    { sat: "Terra MODIS", a: D("2000-11-01"), b: D("2027-02-01"), c: css("--modis") },
    { sat: "Aqua MODIS", a: D("2002-07-04"), b: D("2027-09-01"), c: css("--modis") },
    { sat: "S-NPP VIIRS", a: D("2012-01-20"), b: D("2026-11-15"), c: css("--viirs") },
    { sat: "NOAA-20 VIIRS", a: D("2018-01-01"), b: D("2026-11-15"), c: css("--viirs") },
    { sat: "NOAA-21 VIIRS", a: D("2023-11-01"), b: D("2026-11-15"), c: css("--viirs") },
  ];
  const today = D("2026-11-14");
  $("#timeline").replaceChildren(Plot.plot({
    height: 220, marginLeft: 110, x: { type: "time", label: null }, y: { label: null, domain: sats.map((d) => d.sat) },
    marks: [
      Plot.barX(sats, { y: "sat", x1: "a", x2: (d) => (d.b > today ? today : d.b), fill: "c", inset: 6 }),
      Plot.ruleY(sats.filter((d) => d.b > today && d.sat.includes("MODIS")), { y: "sat", x1: () => today, x2: "b", stroke: "c", strokeDasharray: "3 3", strokeWidth: 2 }),
      Plot.ruleX([today], { stroke: css("--accent") }),
      Plot.text([{ x: today }], { x: "x", text: () => "today", frameAnchor: "top", dy: -2, fill: css("--accent"), textAnchor: "end", dx: -4 }),
    ],
  }));
}

function renderRatio() {
  const s = S();
  const rows = s.ratio_by_month.map((v, i) => ({ month: MONTHS[i], v }));
  $("#ratio").replaceChildren(Plot.plot({
    height: 240, marginLeft: 40, x: { domain: MONTHS, label: null }, y: { grid: true, label: "VIIRS ÷ MODIS cell-days" },
    marks: [Plot.barY(rows, { x: "month", y: "v", fill: css("--viirs"), tip: true }), Plot.ruleY([1])],
  }));
}

function renderLoyo() {
  const rows = S().loyo.flatMap((d) => [{ year: String(d.year), k: "observed (VIIRS)", v: d.observed }, { year: String(d.year), k: "predicted from MODIS", v: d.predicted }]);
  $("#loyo").replaceChildren(Plot.plot({
    height: 240, marginLeft: 56, fx: { label: null }, y: { grid: true, label: "fire cell-days" },
    color: { domain: ["observed (VIIRS)", "predicted from MODIS"], range: [css("--viirs"), css("--modis")], legend: true },
    marks: [Plot.barY(rows, { fx: "year", x: "k", y: "v", fill: "k", tip: true }), Plot.ruleY([0])],
    x: { axis: null },
  }));
}

function renderFrp() {
  const h = S().frp_log10_hist;
  const rows = [];
  for (const [k, name] of [["modis", "MODIS"], ["snpp", "VIIRS S-NPP"]]) {
    const tot = d3.sum(h[k], (d) => d[1]);
    for (const [bin, n] of h[k]) rows.push({ frp: 10 ** bin, share: n / tot, sensor: name });
  }
  $("#frp").replaceChildren(Plot.plot({
    height: 240, marginLeft: 48, x: { type: "log", label: "FRP (MW)" }, y: { grid: true, label: "share", tickFormat: "%" },
    color: { domain: ["MODIS", "VIIRS S-NPP"], range: [css("--modis"), css("--viirs")], legend: true },
    marks: [Plot.lineY(rows, { x: "frp", y: "share", stroke: "sensor", strokeWidth: 2, curve: "monotone-x", tip: true })],
  }));
}

function renderSeason() {
  const w = S().week_of_year_modis, rows = [];
  for (const [era, arr] of Object.entries(w)) {
    const tot = d3.sum(arr);
    arr.forEach((n, i) => rows.push({ week: i + 1, share: n / tot, era }));
  }
  $("#season").replaceChildren(Plot.plot({
    height: 240, marginLeft: 48, x: { label: "week of year", ticks: [1, 9, 18, 27, 35, 44, 52] }, y: { grid: true, label: "share", tickFormat: "%" },
    color: { domain: ["2001-2007", "2019-2025"], range: [css("--muted"), css("--accent")], legend: true },
    marks: [Plot.lineY(rows, { x: "week", y: "share", stroke: "era", strokeWidth: 2, curve: "basis", tip: true })],
  }));
}

function renderWeekday() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], arr = S().weekday_viirs, mean = d3.mean(arr);
  const rows = arr.map((n, i) => ({ day: days[i], diff: n / mean - 1, n }));
  $("#weekday").replaceChildren(Plot.plot({
    height: 220, marginLeft: 48, x: { domain: days, label: null }, y: { grid: true, label: "vs weekly mean", tickFormat: "+.0%" },
    marks: [Plot.barY(rows, { x: "day", y: "diff", fill: (d) => d.diff > 0 ? css("--accent") : css("--muted"), tip: true }), Plot.ruleY([0])],
  }));
}

function renderTypes() {
  const t = S().types, names = { 0: "vegetation", 1: "volcano", 2: "static land", 3: "offshore" };
  const rows = [];
  for (const [k, label] of [["modis", "MODIS"], ["snpp", "VIIRS S-NPP"], ["n20", "VIIRS NOAA-20"]]) {
    const tot = d3.sum(Object.values(t[k]));
    for (const [type, n] of Object.entries(t[k])) rows.push({ sensor: label, type: names[type], share: n / tot, n });
  }
  $("#types").replaceChildren(Plot.plot({
    height: 170, marginLeft: 100, x: { label: "share of records", tickFormat: "%" }, y: { label: null },
    color: { domain: ["vegetation", "static land", "offshore", "volcano"], range: [css("--ok"), css("--muted"), css("--modis"), css("--bad")], legend: true },
    marks: [Plot.barX(rows, Plot.stackX({ y: "sensor", x: "share", fill: "type", tip: true }))],
  }));
  const rem = d3.sum(Object.values(S().modis_removed_by_mask));
  $("#mask-note").textContent = `Our mask (${fmt(S().static_mask_cells)} small cells around every spot VIIRS flags as static) removed ${fmt(rem)} MODIS "vegetation" detections across 2000–2025.`;
}

/* ---------- SOURCES ---------- */
const SHAPES = {
  points: [`<svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">${[[8,30],[14,12],[22,22],[30,34],[36,10],[44,26],[52,16],[56,34],[26,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="var(--viirs)"/>`).join("")}</svg>`, "Points: one row per detection (lat, lon, time, attributes)"],
  raster: [`<svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">${d3.range(32).map((i)=>`<rect x="${(i%8)*8}" y="${Math.floor(i/8)*11}" width="7.5" height="10.5" fill="${d3.interpolateYlOrRd(((i*37)%100)/100)}"/>`).join("")}</svg>`, "Raster grid: a value per cell per time step"],
  polygons: [`<svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true"><path d="M6 30 L14 8 L30 12 L28 32 Z" fill="var(--accent-soft)" stroke="var(--accent)"/><path d="M36 36 L40 14 L58 10 L56 34 Z" fill="var(--accent-soft)" stroke="var(--accent)"/></svg>`, "Polygons: outlines with attributes"],
  table: [`<svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true">${d3.range(5).map((r)=>`<rect x="2" y="${2+r*8}" width="60" height="7" fill="${r? 'var(--surface)':'var(--accent-soft)'}" stroke="var(--line)"/>`).join("")}</svg>`, "Table: dates and labels"],
  imagery: [`<svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true"><rect width="64" height="44" fill="#4f6b3a"/><path d="M0 30 Q20 20 40 28 T64 22 V44 H0Z" fill="#7a8c55"/><circle cx="46" cy="12" r="7" fill="#e8e3d8" opacity=".85"/></svg>`, "Imagery: pictures in visible bands"],
};

function renderSources() {
  // context map with image overlays
  const map = baseMap("ctx-map"); state.maps.ctx = map;
  const imgs = state.sources.filter((s) => s.preview && s.preview.type === "image");
  let overlay = null;
  const show = (src) => {
    if (overlay) map.removeLayer(overlay);
    overlay = L.imageOverlay(src.preview.src, RO_BOUNDS, { opacity: +$("#ctx-opacity").value }).addTo(map);
    $("#ctx-caption").textContent = src.preview.caption + " · " + src.agency;
  };
  $("#ctx-list").innerHTML = imgs.map((s, i) => `<label><input type="radio" name="ctx" value="${i}" ${i === 0 ? "checked" : ""}> ${esc(s.name)}</label>`).join("");
  $$("#ctx-list input").forEach((r) => r.onchange = () => show(imgs[+r.value]));
  $("#ctx-opacity").oninput = (e) => overlay && overlay.setOpacity(+e.target.value);
  show(imgs[0]);

  // catalog
  const groups = ["All", ...new Set(state.sources.map((s) => s.group))];
  $("#src-filter").innerHTML = groups.map((g, i) => `<button data-v="${esc(g)}" class="${i ? "" : "on"}">${esc(g)}</button>`).join("");
  const draw = (g) => {
    const list = state.sources.filter((s) => g === "All" || s.group === g);
    $("#src-grid").innerHTML = list.map(sourceCard).join("");
    list.filter((s) => s.preview && s.preview.type === "firms").forEach((s) => firmsSpark($("#spark-" + s.id), s.preview.sensor));
  };
  segmented("#src-filter", draw);
  draw("All");
}

function sourceCard(s) {
  const [svg, shapeLabel] = SHAPES[s.shape] || SHAPES.table;
  let preview = "";
  if (s.preview?.type === "image") preview = `<img src="${esc(s.preview.src)}" alt="${esc(s.preview.caption)}" loading="lazy"><span class="hint">${esc(s.preview.caption)}</span>`;
  else if (s.preview?.type === "firms") preview = `<div id="spark-${esc(s.id)}" class="chart"></div><span class="hint">Real Romania data. Full view in <a href="#data">FIRMS data</a>.</span>`;
  return `<article class="card src">
    <div class="head"><div><h3>${esc(s.name)}</h3><span class="agency">${esc(s.agency)} · ${esc(s.group)}</span></div>
      <span class="badge ${esc(s.status.replace(" ", "-"))}">${esc(s.status)}</span></div>
    ${preview}
    <div class="shape">${svg}<span>${esc(shapeLabel)}</span></div>
    <dl><dt>Resolution</dt><dd>${esc(s.res)}</dd><dt>Period</dt><dd>${esc(s.period)}</dd>
      <dt>Access</dt><dd>${esc(s.access)}</dd><dt>Our use</dt><dd>${esc(s.use)}</dd></dl>
    <a href="${esc(s.link)}" target="_blank" rel="noopener">Source →</a>
  </article>`;
}

function firmsSpark(el, sensor) {
  if (!el) return;
  const key = sensor === "M" ? "modis_veg" : "viirs_veg", rows = [];
  for (const [y, arr] of Object.entries(series(key))) arr.forEach((v, m) => rows.push({ t: new Date(+y, m, 15), v }));
  el.replaceChildren(Plot.plot({
    height: 120, marginLeft: 40, x: { type: "time", label: null }, y: { label: "per month", grid: true },
    marks: [Plot.areaY(rows, { x: "t", y: "v", fill: sensor === "M" ? css("--modis") : css("--viirs"), fillOpacity: 0.8, curve: "step" })],
  }));
}

/* ---------- FEATURES ---------- */
function featState(id) { return state.local.features[id] || {}; }
function setFeat(id, patch) { state.local.features[id] = Object.assign({}, featState(id), patch); saveLocal(); }
function effortHours(code) {
  if (!code) return 0;
  const parts = code.split("-").map((c) => EFFORT_H[c]);
  return d3.mean(parts);
}

function renderIdeas() {
  let tier = "all", status = "all";
  const draw = () => {
    const list = state.features.filter((f) => (tier === "all" || f.tier === tier) &&
      (status === "all" || (status === "none" ? !featState(f.id).status : featState(f.id).status === status)));
    $("#feat-grid").innerHTML = list.map(featureCard).join("") || `<p class="hint">Nothing matches.</p>`;
    $$("#feat-grid .feat").forEach((card) => {
      const id = +card.dataset.id;
      $$(".dec button", card).forEach((b) => b.onclick = () => {
        const cur = featState(id).status; setFeat(id, { status: cur === b.dataset.v ? null : b.dataset.v }); draw(); renderPlan();
      });
      $("input", card).onchange = (e) => setFeat(id, { owner: e.target.value });
    });
  };
  segmented("#feat-tier", (v) => { tier = v; draw(); });
  segmented("#feat-status", (v) => { status = v; draw(); });
  $("#cap-people").oninput = renderPlan; $("#cap-hours").oninput = renderPlan;
  draw(); renderPlan();
}

const TIER_LABEL = { 1: "Tier 1 · required", 2: "Tier 2 · credibility", 3: "Tier 3 · insight", 4: "Vision", L: "From papers" };
function featureCard(f) {
  const st = featState(f.id);
  return `<article class="card feat ${st.status || ""}" data-id="${f.id}">
    <div class="meta"><span class="chip tier">${TIER_LABEL[f.tier]}</span>${f.effort_code ? `<span class="chip">effort ${esc(f.effort_code)}</span>` : ""}
      ${f.criteria.map((c) => `<span class="chip">${c}</span>`).join("")}${f.award.map((a) => `<span class="chip">Award: ${esc(a)}</span>`).join("")}</div>
    <h3 style="color:var(--ink);margin:0">${f.id}. ${esc(f.name)}</h3>
    <p>${esc(f.what || "")}</p>
    ${f.data ? `<p class="hint">Data: ${esc(f.data)}</p>` : ""}
    ${f.promote ? `<p class="promote">${esc(f.promote)}</p>` : ""}
    <div class="row"><div class="seg dec">${["build", "maybe", "skip"].map((v) => `<button data-v="${v}" class="${st.status === v ? "on" : ""}">${v[0].toUpperCase() + v.slice(1)}</button>`).join("")}</div>
      <input type="text" placeholder="Owner" value="${esc(st.owner || "")}" aria-label="Owner of feature ${f.id}"></div>
  </article>`;
}

function renderPlan() {
  const cap = (+$("#cap-people").value || 1) * (+$("#cap-hours").value || 1);
  const build = state.features.filter((f) => featState(f.id).status === "build");
  const maybe = state.features.filter((f) => featState(f.id).status === "maybe");
  const hb = d3.sum(build, (f) => effortHours(f.effort_code)), hm = d3.sum(maybe, (f) => effortHours(f.effort_code));
  const pct = Math.min(100, (100 * hb) / cap);
  $("#capacity").innerHTML = `
    <p><b>${hb.toFixed(0)} h</b> committed (Build) of <b>${cap} h</b> available · Maybe adds ${hm.toFixed(0)} h</p>
    <div class="bar ${hb > cap ? "over" : ""}"><div style="width:${pct}%"></div></div>
    <p class="hint">${hb > cap ? "Over capacity: move something to Maybe." : `${(cap - hb).toFixed(0)} h left for polish, demo and buffer.`}</p>`;
  const crit = ["Impact", "Creativity", "Validity", "Relevance", "Presentation"];
  const rows = crit.map((c) => ({ c, n: build.filter((f) => f.criteria.includes(c)).length }));
  $("#coverage").replaceChildren(Plot.plot({
    height: 180, marginLeft: 90, x: { label: "Build features serving it", grid: true, domain: [0, Math.max(3, d3.max(rows, (d) => d.n))] }, y: { domain: crit, label: null },
    marks: [Plot.barX(rows, { y: "c", x: "n", fill: css("--accent") }), Plot.ruleX([0])],
  }));
}

/* ---------- DECISIONS ---------- */
function renderDecisions() {
  const draw = () => {
    $("#q-list").innerHTML = state.local.questions.map(questionCard).join("");
    for (const q of state.local.questions) {
      const card = $(`#q-${q.id}`);
      $$("input[type=radio]", card).forEach((r) => r.onchange = () => { q.choice = r.value; q.status = "decided"; saveLocal(); draw(); });
      $$("input[data-assign]", card).forEach((inp) => inp.onchange = () => {
        q.choice = Object.assign({}, q.choice || {}, { [inp.dataset.assign]: inp.value });
        q.status = Object.values(q.choice).some(Boolean) ? "decided" : "open"; saveLocal(); draw();
      });
      const txt = $("input[data-text]", card);
      if (txt) txt.onchange = () => { q.choice = txt.value; q.status = txt.value ? "decided" : "open"; saveLocal(); draw(); };
      $("textarea", card).onchange = (e) => { q.notes = e.target.value; saveLocal(); };
      const reopen = $("button[data-reopen]", card);
      if (reopen) reopen.onclick = () => { q.status = "open"; q.choice = null; saveLocal(); draw(); };
    }
    updateExports();
  };
  $("#btn-download").onclick = () => {
    const blob = new Blob([JSON.stringify(exportDecisions(), null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "decisions.json" });
    a.click(); URL.revokeObjectURL(a.href);
  };
  $("#btn-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(decisionsMarkdown()); $("#btn-copy").textContent = "Copied"; }
    catch { $("#btn-copy").textContent = "Copy failed"; }
    setTimeout(() => ($("#btn-copy").textContent = "Copy as Markdown"), 1500);
  };
  $("#btn-reset").onclick = () => { state.local = mergeLocal(state.baseline, null); saveLocal(); draw(); };
  draw();
}

function questionCard(q) {
  const base = state.baseline.questions.find((x) => x.id === q.id);
  const changed = JSON.stringify([base.choice, base.notes, base.status]) !== JSON.stringify([q.choice, q.notes, q.status]);
  let input = "";
  if (q.kind === "single") input = `<div class="opts">${q.options.map((o) => `<label><input type="radio" name="r-${q.id}" value="${esc(o)}" ${q.choice === o ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>`;
  else if (q.kind === "assign") input = `<div class="assign">${q.options.map((o) => `<span>${esc(o)}</span><input type="text" data-assign="${esc(o)}" placeholder="Name" value="${esc((q.choice || {})[o] || "")}">`).join("")}</div>`;
  else input = `<input type="text" data-text placeholder="Answer" value="${esc(q.choice || "")}">`;
  return `<article class="card q ${changed ? "changed" : ""}" id="q-${q.id}">
    <div class="head" style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
      <h2 style="margin:0">${esc(q.title)}</h2>
      <span class="badge ${q.status === "decided" ? "verified" : "to-verify"} status">${q.status}${changed ? " · not in repo yet" : ""}</span></div>
    <p class="why">${esc(q.why)}</p>
    ${input}
    <textarea placeholder="Rationale or notes">${esc(q.notes || "")}</textarea>
    ${q.status === "decided" ? `<div><button class="ghost" data-reopen>Reopen</button></div>` : ""}
  </article>`;
}

function exportDecisions() {
  const out = JSON.parse(JSON.stringify(state.local));
  out.updated = new Date().toISOString().slice(0, 10);
  return out;
}
function decisionsMarkdown() {
  const L = ["## Team decisions", ""];
  for (const q of state.local.questions) {
    const c = q.choice && typeof q.choice === "object" ? Object.entries(q.choice).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ") : q.choice;
    L.push(`- **${q.title}** (${q.status}): ${c || "_open_"}${q.notes ? ` — ${q.notes}` : ""}`);
  }
  const feats = state.features.map((f) => ({ f, s: featState(f.id) })).filter((x) => x.s.status);
  if (feats.length) {
    L.push("", "## Feature triage", "");
    for (const st of ["build", "maybe", "skip"]) {
      const list = feats.filter((x) => x.s.status === st);
      if (list.length) L.push(`**${st}:** ` + list.map((x) => `${x.f.id}. ${x.f.name}${x.s.owner ? ` (${x.s.owner})` : ""}`).join(", "));
    }
  }
  return L.join("\n");
}
function updateExports() {
  const body = decisionsMarkdown() + "\n\n_Exported from the research showcase._";
  $("#btn-issue").href = `${REPO_URL}/issues/new?title=${encodeURIComponent("Decisions update " + new Date().toISOString().slice(0, 10))}&body=${encodeURIComponent(body.slice(0, 6000))}`;
  renderDiffNote();
}
function renderDiffNote() {
  const el = $("#diff-note"); if (!el || !state.baseline) return;
  const n = state.local.questions.filter((q) => {
    const b = state.baseline.questions.find((x) => x.id === q.id);
    return JSON.stringify([b.choice, b.notes, b.status]) !== JSON.stringify([q.choice, q.notes, q.status]);
  }).length;
  const nf = Object.keys(state.local.features).filter((k) => JSON.stringify(state.local.features[k]) !== JSON.stringify(state.baseline.features[k] || undefined)).length;
  el.textContent = n || nf ? `${n} question(s) and ${nf} feature(s) differ from the repo copy.` : "In sync with the repo copy.";
}

/* ---------- LIBRARY ---------- */
const DOCS = [
  ["README.md", "README"], ["docs/project-idea.md", "Project idea"], ["docs/feature-catalog.md", "Feature catalog"],
  ["docs/hackathon-brief.md", "Hackathon brief"], ["docs/data-findings-romania.md", "Data findings: Romania"],
  ["docs/data-sources-extended.md", "Data sources (extended)"], ["Wildfire Data Sources.md", "Wildfire data catalog"],
  ["docs/interface-inspiration.md", "Interface inspiration"], ["docs/literature-study.md", "Literature study"],
  ["docs/source/judging-criteria.md", "Judging criteria"], ["docs/source/challenge-page.md", "Challenge page (raw)"],
  ["CLAUDE.md", "AI assistant memory"],
];
function renderLibrary() {
  $("#doc-nav").innerHTML = DOCS.map(([p, t]) => `<a href="#library/${encodeURIComponent(p)}" data-p="${esc(p)}">${esc(t)}</a>`).join("");
  const open = async () => {
    const p = decodeURIComponent((location.hash.split("/").slice(1).join("/")) || "docs%2Fproject-idea.md");
    $$("#doc-nav a").forEach((a) => a.classList.toggle("active", a.dataset.p === p));
    try {
      const r = await fetch("../" + p.split("/").map(encodeURIComponent).join("/"));
      if (!r.ok) throw new Error(r.status);
      const md = await r.text();
      const html = DOMPurify.sanitize(marked.parse(md));
      $("#doc").innerHTML = html + `<p class="hint"><a href="${REPO_URL}/blob/main/${p.split("/").map(encodeURIComponent).join("/")}" target="_blank" rel="noopener">View on GitHub →</a></p>`;
      $$("#doc a[href]").forEach((a) => { if (/^https?:/.test(a.getAttribute("href"))) { a.target = "_blank"; a.rel = "noopener"; } });
    } catch (e) {
      $("#doc").innerHTML = `<p>Could not load <code>${esc(p)}</code>. Serve the repo root over HTTP (see the README in <code>showcase/</code>).</p>`;
    }
  };
  window.addEventListener("hashchange", () => { if (location.hash.startsWith("#library")) open(); });
  open();
}

/* ---------- UI helper ---------- */
function segmented(sel, cb) {
  $$(sel + " button").forEach((b) => b.addEventListener("click", () => {
    $$(sel + " button").forEach((x) => x.classList.toggle("on", x === b));
    cb(b.dataset.v);
  }));
}

boot();
