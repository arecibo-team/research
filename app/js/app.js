/* Ember Ledger: UI. Drafted with an AI assistant (Claude). */
"use strict";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = d3.format(","), fmt1 = d3.format(",.1f"), pct = d3.format(".0%");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ord = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
const doyLabel = (doy) => { const d = new Date(Date.UTC(2025, 0, 1) + doy * 864e5); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

const S = {
  tab: "explore", aoi: null, series: null, rows: null, ref: null,
  calMode: "harm", scheme: "YlOrRd", map: null, layers: {}, drawing: null, rendered: {},
};

/* ---------------- errors: show them instead of failing silently ---------------- */
function showError(msg) {
  let el = document.getElementById("err-banner");
  if (!el) { el = Object.assign(document.createElement("div"), { id: "err-banner", role: "alert" }); el.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:3000;background:#b42318;color:#fff;padding:.6rem .9rem;border-radius:8px;font-size:.85rem"; document.body.append(el); }
  el.textContent = "Something went wrong: " + msg;
}
window.addEventListener("error", (e) => showError(e.message));
window.addEventListener("unhandledrejection", (e) => showError(e.reason?.message || String(e.reason)));

/* ---------------- boot ---------------- */
async function boot() {
  try { await loadCore(); }
  catch (e) {
    $("#loading").innerHTML = `Could not load data (${esc(e.message)}). Serve the repository over HTTP, e.g. <code>python3 -m http.server</code> from the repo root, then open <code>/app/</code>.`;
    return;
  }
  $("#loading").remove();
  S.ref = { year: DATA.endDate.getUTCFullYear(), month: DATA.endDate.getUTCMonth() };
  initMap();
  initControls();
  readHash(true);
  window.addEventListener("hashchange", () => readHash(false));
}

/* ---------------- URL state ---------------- */
function encodeAoi(spec) {
  if (spec.type === "county") return "c" + spec.id;
  if (spec.type === "circle") return `k${spec.lat.toFixed(3)},${spec.lon.toFixed(3)},${spec.r}`;
  if (spec.type === "poly") return "p" + spec.coords.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(";");
  return "ro";
}
function decodeAoi(s) {
  if (!s || s === "ro") return { type: "ro" };
  if (s[0] === "c") return { type: "county", id: +s.slice(1) };
  if (s[0] === "k") { const [lat, lon, r] = s.slice(1).split(",").map(Number); return { type: "circle", lat, lon, r }; }
  if (s[0] === "p") return { type: "poly", coords: s.slice(1).split(";").map((p) => p.split(",").map(Number)) };
  return { type: "ro" };
}
function writeHash() {
  const h = `#${S.tab}&a=${encodeAoi(S.aoi.spec)}&r=${S.ref.year}-${String(S.ref.month + 1).padStart(2, "0")}`;
  if (location.hash !== h) history.replaceState(null, "", h);
}
function readHash(first) {
  const parts = location.hash.slice(1).split("&"), kv = Object.fromEntries(parts.slice(1).map((p) => p.split("=")));
  const tab = ["explore", "prevent", "plan", "fires", "data"].includes(parts[0]) ? parts[0] : "explore";
  if (kv.r) { const [y, m] = kv.r.split("-").map(Number); if (y >= 2000 && y <= DATA.meta.years[1]) S.ref = { year: y, month: m - 1 }; }
  const aoiStr = kv.a || (S.aoi ? encodeAoi(S.aoi.spec) : "ro");
  if (first || !S.aoi || aoiStr !== encodeAoi(S.aoi.spec)) setAoi(decodeAoi(aoiStr), false);
  setTab(tab);
}

/* ---------------- area ---------------- */
function setAoi(spec, write = true) {
  try { S.aoi = makeAoi(spec); } catch { S.aoi = makeAoi({ type: "ro" }); }
  S.series = dailySeries(S.aoi);
  S.rows = monthly(S.series);
  S.trust = localTrust(S.series);
  S.rendered = {};
  $("#aoi-name").textContent = S.aoi.name;
  const total = d3.sum(S.rows, (r) => r.harm);
  $("#aoi-stats").textContent = `${fmt(S.aoi.cells.size)} grid cells with fire history · ${fmt(Math.round(total))} harmonized fire cell-days since 2000`;
  $("#sel-county").value = spec.type === "county" ? String(spec.id) : spec.type === "ro" ? "ro" : "";
  drawAoiOutline();
  if (write) writeHash();
  renderTab();
}

function drawAoiOutline() {
  const m = S.map; if (S.layers.aoi) m.removeLayer(S.layers.aoi);
  const spec = S.aoi.spec, style = { color: css("--accent"), weight: 2.5, fill: false };
  let layer = null;
  if (spec.type === "county") {
    const f = DATA.counties.features.find((x) => x.properties.id === spec.id);
    layer = L.geoJSON(f, { style, interactive: false });
  } else if (spec.type === "poly") layer = L.polygon(spec.coords.map(([x, y]) => [y, x]), { ...style, interactive: false });
  else if (spec.type === "circle") layer = L.circle([spec.lat, spec.lon], { radius: spec.r * 1000, ...style, interactive: false });
  if (layer) { S.layers.aoi = layer.addTo(m); m.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 10 }); }
  else { S.layers.aoi = null; m.fitBounds([[43.6, 20.2], [48.3, 29.8]]); }
}

/* ---------------- map ---------------- */
function initMap() {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const m = (S.map = L.map("map", { preferCanvas: true, zoomSnap: 0.5 }).fitBounds([[43.6, 20.2], [48.3, 29.8]]));
  L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base"}/MapServer/tile/{z}/{y}/{x}`,
    { attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors", maxZoom: 16 }).addTo(m);
  S.layers.counties = L.geoJSON(DATA.counties, {
    style: { color: css("--muted"), weight: 0.7, fillOpacity: 0, opacity: 0.6 },
    onEachFeature: (f, l) => { l.on("click", () => setAoi({ type: "county", id: f.properties.id })); l.bindTooltip(f.properties.name, { sticky: true }); },
  }).addTo(m);
  m.on(L.Draw.Event.CREATED, (e) => {
    stopDrawing();
    const ll = e.layer.getLatLngs()[0].map((p) => [p.lng, p.lat]);
    setAoi({ type: "poly", coords: ll, name: e.layerType === "rectangle" ? "Drawn box" : "Drawn area" });
  });
  S.renderer = L.canvas({ padding: 0.3 });
}

function stopDrawing() { if (S.drawing) { S.drawing.disable(); S.drawing = null; } $$(".draw-btns button").forEach((b) => b.classList.remove("on-draw")); }
function startDrawing(kind, btn) {
  stopDrawing();
  const opts = { shapeOptions: { color: css("--accent"), weight: 2 }, showArea: false };
  S.drawing = kind === "rect" ? new L.Draw.Rectangle(S.map, opts) : new L.Draw.Polygon(S.map, opts);
  S.drawing.enable(); btn.classList.add("on-draw");
}

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
/** Paint grid cells as one image overlay (fast for tens of thousands of cells). */
function gridOverlay(values, color) {
  const g = DATA.meta.grid, rows = 275, cols = 500, scale = 2;
  const latTop = g.lat0 + rows * g.size, latBot = g.lat0, yT = mercY(latTop), yB = mercY(latBot);
  const H = rows * scale * 1.4, W = cols * scale;
  const cv = Object.assign(document.createElement("canvas"), { width: W, height: Math.round(H) }), ctx = cv.getContext("2d");
  for (const [key, v] of values) {
    if (!v) continue;
    const c = DATA.cells.get(key); if (!c) continue;
    const y0 = ((yT - mercY(g.lat0 + (c.row + 1) * g.size)) / (yT - yB)) * cv.height;
    const y1 = ((yT - mercY(g.lat0 + c.row * g.size)) / (yT - yB)) * cv.height;
    ctx.fillStyle = color(v);
    ctx.fillRect(c.col * scale, y0, scale + 0.3, y1 - y0 + 0.3);
  }
  return L.imageOverlay(cv.toDataURL(), [[latBot, g.lon0], [latTop, g.lon0 + cols * g.size]], { opacity: 0.9, interactive: false });
}
function setDataLayer(layer, legendHtml) {
  if (S.layers.data) S.map.removeLayer(S.layers.data);
  S.layers.data = layer ? layer.addTo(S.map) : null;
  if (S.layers.aoi) S.layers.aoi.bringToFront?.();
  $("#map-legend").innerHTML = legendHtml || "";
}
const rampCss = (interp) => `linear-gradient(90deg, ${d3.range(0, 1.01, 0.1).map((t) => interp(t)).join(",")})`;

/* ---------------- controls ---------------- */
function initControls() {
  const sel = $("#sel-county");
  sel.insertAdjacentHTML("beforeend", `<option value="" disabled>Drawn / custom area</option>` +
    DATA.meta.counties.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join(""));
  sel.onchange = () => setAoi(sel.value === "ro" ? { type: "ro" } : { type: "county", id: +sel.value });
  $("#btn-rect").onclick = (e) => startDrawing("rect", e.currentTarget);
  $("#btn-poly").onclick = (e) => startDrawing("poly", e.currentTarget);
  $("#form-circle").onsubmit = (e) => {
    e.preventDefault();
    const lat = +$("#in-lat").value, lon = +$("#in-lon").value, r = +$("#in-r").value || 25;
    if (!(lat >= 43 && lat <= 48.6 && lon >= 20 && lon <= 30)) { $("#in-lat").focus(); return; }
    setAoi({ type: "circle", lat, lon, r });
  };
  const presets = [
    ["Danube Delta (Tulcea)", { type: "county", id: idOf("Tulcea") }],
    ["Dolj stubble belt", { type: "circle", lat: 44.18, lon: 23.15, r: 25, name: "Dolj stubble belt (25 km)" }],
    ["Bucharest + Ilfov", { type: "circle", lat: 44.43, lon: 26.1, r: 35, name: "Bucharest area (35 km)" }],
    ["Romania", { type: "ro" }],
  ];
  $("#presets").innerHTML = presets.map(([n], i) => `<button class="ghost" data-i="${i}">${esc(n)}</button>`).join("");
  $$("#presets button").forEach((b) => (b.onclick = () => setAoi(presets[+b.dataset.i][1])));
  $("#btn-share").onclick = async () => {
    writeHash();
    try { await navigator.clipboard.writeText(location.href); flash($("#btn-share"), "Copied"); } catch { flash($("#btn-share"), "Copy failed"); }
  };
  segmented("#cal-mode", (v) => { S.calMode = v; renderCalendar(); });
  $("#cal-scheme").onchange = (e) => { S.scheme = e.target.value; renderCalendar(); renderExploreMap(); };
  $("#btn-cal-table").onclick = (e) => {
    const t = $("#calendar-table"), on = t.hidden; t.hidden = !on; $("#calendar").hidden = on;
    e.currentTarget.setAttribute("aria-pressed", String(on)); e.currentTarget.textContent = on ? "Chart" : "Table";
  };
  $("#in-k").oninput = renderBacktest;
  const today = new Date(); $("#plan-date").value = `2026-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  $("#plan-date").onchange = renderPlan; $("#plan-base").onchange = renderPlan;
  $("#fires-sort").onchange = renderFiresTable; $("#fires-month").onchange = renderFiresCompare;
  const ys = d3.range(DATA.meta.years[1], DATA.meta.years[0] - 1, -1);
  $("#hs-year").innerHTML = ys.map((y) => `<option>${y}</option>`).join("");
  $("#hs-year").onchange = renderHotspotLayer; $("#hs-static").onchange = renderHotspotLayer;
  segmented("#hs-sensor", () => renderHotspotLayer());
  $("#ex-from").innerHTML = ys.slice().reverse().map((y) => `<option>${y}</option>`).join("");
  $("#ex-to").innerHTML = ys.map((y) => `<option>${y}</option>`).join("");
  $("#ex-from").value = "2024"; $("#ex-to").value = String(DATA.meta.years[1]);
  $("#ex-hotspots").onclick = exportHotspots; $("#ex-monthly").onclick = exportMonthly;
  $("#ex-png").onclick = exportPng; $("#ex-fires").onclick = exportFires;
  $$("#tabs a[data-tab]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); setTab(a.dataset.tab); writeHash(); }));
}
const idOf = (name) => DATA.meta.counties.find((c) => c.name === name)?.id ?? 0;
function segmented(sel, cb) {
  $$(sel + " button").forEach((b) => b.addEventListener("click", () => { $$(sel + " button").forEach((x) => x.classList.toggle("on", x === b)); cb(b.dataset.v); }));
}
function flash(btn, text) { const t = btn.textContent; btn.textContent = text; setTimeout(() => (btn.textContent = t), 1400); }

function setTab(tab) {
  S.tab = tab;
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + tab));
  $$("#tabs a[data-tab]").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
  renderTab();
  setTimeout(() => S.map.invalidateSize(), 50);
}
function renderTab() {
  if (!S.aoi) return;
  const fn = { explore: renderExplore, prevent: renderPrevent, plan: renderPlan, fires: renderFires, data: renderData }[S.tab];
  fn();
}

/* ---------------- CALENDAR ---------------- */
function renderExplore() { renderNow(); renderCalendar(); renderYearly(); renderSpaghetti(); renderSeason(); renderExploreMap(); }

function renderExploreMap() {
  if (S.exploreLayer && S.exploreScheme === S.scheme) { setDataLayer(S.exploreLayer.layer, S.exploreLayer.legend); return; }
  const tot = new Map(), M = DATA.modis, V = DATA.viirs, vs = DATA.viirsStartDay, ratio = DATA.meta.ratio_by_month;
  for (let i = 0; i < V.length; i += 3) { if (V[i + 2] < vs) continue; const k = cellKey(V[i], V[i + 1]); tot.set(k, (tot.get(k) || 0) + 1); }
  for (let i = 0; i < M.length; i += 3) { const d = M[i + 2]; if (d >= vs) continue; const k = cellKey(M[i], M[i + 1]); tot.set(k, (tot.get(k) || 0) + ratio[DATA.dayMonth[d]]); }
  const max = d3.quantile([...tot.values()].sort(d3.ascending), 0.99);
  const interp = d3["interpolate" + S.scheme];
  const col = (v) => interp(0.15 + 0.85 * Math.min(1, Math.sqrt(v / max)));
  const legend = `<span>Harmonized fire cell-days per 2 km cell, 2000–2025</span><span class="ramp" style="background:${rampCss((t) => interp(0.15 + 0.85 * t))}"></span><span>low → high</span>`;
  S.exploreLayer = { layer: gridOverlay(tot, col), legend }; S.exploreScheme = S.scheme;
  setDataLayer(S.exploreLayer.layer, legend);
}

function renderNow() {
  const { year, month } = S.ref, ctx = monthContext(S.series, year, month), t = S.trust;
  const mName = MONTHS_LONG[month];
  let where = "within the usual range";
  if (ctx.value > ctx.p90) where = "above the usual range"; else if (ctx.value < ctx.p10) where = "below the usual range";
  const ratioTxt = ctx.ratio == null ? "" : ctx.ratio >= 1 ? ` · ${ctx.ratio.toFixed(1)}× the median ${mName}` : ` · ${Math.round(ctx.ratio * 100)}% of the median ${mName}`;
  const max = Math.max(ctx.value, ctx.p90, 1) * 1.1, pos = (v) => `${Math.min(100, (100 * v) / max)}%`;
  const yOpts = d3.range(DATA.meta.years[1], DATA.meta.years[0] - 1, -1).map((y) => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("");
  const mOpts = MONTHS_LONG.map((m, i) => `<option value="${i}" ${i === month ? "selected" : ""}>${m}</option>`).join("");
  $("#now-card").innerHTML = `
    <div>
      <div class="pick"><span class="kicker">Is this normal?</span>
        <select id="ref-m" aria-label="Month">${mOpts}</select><select id="ref-y" aria-label="Year">${yOpts}</select></div>
      <p class="sentence"><b>${mName} ${year}${ctx.inProgress ? ` (1–${ctx.cut})` : ""}</b> ${ctx.inProgress ? "is" : "was"} the <b>${ord(ctx.rank)} most active ${mName}${ctx.inProgress ? ` start` : ""}</b> of ${ctx.n} years in ${esc(S.aoi.name)}${ratioTxt}: <b>${where}</b>.</p>
      <span class="badge ${t.level}" title="Harmonization checked against VIIRS on 2013–2022 in this area">${t.level} trust · ±${t.err == null ? "–" : t.err.toFixed(0)}% locally</span>
      <span class="hint"> ${year < 2012 ? "Modelled from MODIS." : "Observed by VIIRS."} Latest data: ${isoOf(DATA.nDays - 1)}.</span>
    </div>
    <div>
      <div class="gauge" aria-hidden="true"><div class="track"></div>
        <div class="band" style="left:${pos(ctx.p10)};width:calc(${pos(ctx.p90)} - ${pos(ctx.p10)})"></div>
        <div class="med" style="left:${pos(ctx.median)}"></div><div class="cur" style="left:${pos(ctx.value)}"></div></div>
      <div class="gauge-labels"><span>0</span><span>usual range ${fmt(Math.round(ctx.p10))}–${fmt(Math.round(ctx.p90))}</span><span>${fmt(Math.round(max))}</span></div>
      <p class="hint">${fmt(Math.round(ctx.value))} fire cell-days vs median ${fmt(Math.round(ctx.median))} (other years). Click any calendar cell to compare another month.</p>
    </div>`;
  const upd = () => { S.ref = { year: +$("#ref-y").value, month: +$("#ref-m").value }; writeHash(); renderNow(); renderCalendar(); renderSpaghetti(); };
  $("#ref-y").onchange = upd; $("#ref-m").onchange = upd;
}

function calendarData() {
  const med = d3.range(12).map((m) => d3.median(S.rows.filter((r) => r.month === m), (r) => r.harm));
  return S.rows.map((r) => {
    let v;
    if (S.calMode === "harm") v = r.harm;
    else if (S.calMode === "raw") v = r.year < 2012 || (r.year === 2012 && r.month === 0) ? r.modis : r.viirs;
    else v = Math.log2((r.harm + 1) / (med[r.month] + 1));
    return { ...r, v, label: MONTHS[r.month], y: String(r.year) };
  });
}
function renderCalendar() {
  const data = calendarData(), anom = S.calMode === "anom";
  $("#cal-hint").textContent = {
    harm: "Harmonized fire cell-days (VIIRS-equivalent). Faded cells are modelled from MODIS (before 2012), solid cells are observed by VIIRS.",
    raw: "Raw fire cell-days: MODIS until Jan 2012, VIIRS after. Note the jump: this is the problem harmonization fixes.",
    anom: "Each month against the median of the same month across all years (log2: +1 = twice the median, −1 = half).",
  }[S.calMode];
  const ref = data.find((d) => d.year === S.ref.year && d.month === S.ref.month);
  const plot = Plot.plot({
    width: 760, height: 24 * 26 + 50, marginLeft: 44, marginTop: 40, padding: 0.06,
    x: { domain: MONTHS, label: null, axis: "top" }, y: { domain: d3.range(2000, DATA.meta.years[1] + 1).map(String), label: null },
    color: anom ? { type: "diverging", scheme: "RdBu", reverse: true, domain: [-3, 3], legend: true, label: "vs median (log2)" }
                : { type: "sqrt", scheme: S.scheme, legend: true, label: S.calMode === "harm" ? "harmonized fire cell-days" : "raw fire cell-days" },
    marks: [
      Plot.cell(data, { x: "label", y: "y", fill: "v", fillOpacity: (d) => (S.calMode !== "raw" && d.modelled ? 0.72 : 1), inset: 0.5 }),
      Plot.cell(ref ? [ref] : [], { x: "label", y: "y", stroke: css("--ink"), strokeWidth: 2.5, fill: "none" }),
      Plot.text(data.filter((d) => d.partial), { x: "label", y: "y", text: () => "…", fill: "currentColor" }),
      Plot.tip(data, Plot.pointer({ x: "label", y: "y", title: (d) => `${MONTHS_LONG[d.month]} ${d.year}${d.partial ? " (to date)" : ""}\nharmonized ${fmt1(d.harm)}\nMODIS ${fmt(d.modis)} · VIIRS ${fmt(d.viirs)} cell-days${d.modelled ? "\n(modelled from MODIS)" : ""}` })),
    ],
  });
  plot.addEventListener("click", () => { const d = plot.value; if (d) { S.ref = { year: d.year, month: d.month }; writeHash(); renderNow(); renderCalendar(); renderSpaghetti(); } });
  plot.style.cursor = "pointer";
  $("#calendar").replaceChildren(plot);
  // accessible table
  const ys = d3.range(DATA.meta.years[1], DATA.meta.years[0] - 1, -1);
  $("#calendar-table").innerHTML = `<table><thead><tr><th>Year</th>${MONTHS.map((m) => `<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${ys.map((y) => {
    const r = data.filter((d) => d.year === y).sort((a, b) => a.month - b.month);
    return `<tr><td>${y}${y < 2012 ? " (m)" : ""}</td>${r.map((d) => `<td>${anom ? d.v.toFixed(2) : fmt(Math.round(d.v))}</td>`).join("")}<td>${anom ? "" : fmt(Math.round(d3.sum(r, (d) => d.v)))}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderYearly() {
  const ys = yearly(S.series).filter((r) => r.year > 2000 && r.year <= DATA.lastFull), err = (S.trust.err ?? 10) / 100;
  const raw = ys.map((r) => ({ year: r.year, v: r.year < 2012 ? r.modis : r.viirs }));
  const band = ys.filter((r) => r.year < 2012).map((r) => ({ year: r.year, lo: r.harm * (1 - err), hi: r.harm * (1 + err) }));
  $("#yearly").replaceChildren(Plot.plot({
    height: 260, marginLeft: 52, x: { label: null, tickFormat: "d" }, y: { grid: true, label: "fire cell-days / year" },
    marks: [
      Plot.areaY(band, { x: "year", y1: "lo", y2: "hi", fill: css("--modis"), fillOpacity: 0.18 }),
      Plot.ruleX([2012], { stroke: css("--line"), strokeDasharray: "3 3" }),
      Plot.lineY(raw, { x: "year", y: "v", stroke: css("--muted"), strokeDasharray: "5 4", strokeWidth: 1.5 }),
      Plot.lineY(ys, { x: "year", y: "harm", stroke: css("--accent"), strokeWidth: 2.5, marker: "dot" }),
      Plot.tip(ys, Plot.pointerX({ x: "year", y: "harm", title: (d) => `${d.year}\nharmonized ${fmt(Math.round(d.harm))}\nraw MODIS ${fmt(d.modis)} · VIIRS ${fmt(d.viirs)}` })),
    ],
  }));
  const D = (s) => new Date(s), today = D("2026-11-14");
  const sats = [
    { s: "Terra MODIS", a: D("2000-11-01"), b: D("2027-02-01"), c: css("--modis") }, { s: "Aqua MODIS", a: D("2002-07-04"), b: D("2027-09-01"), c: css("--modis") },
    { s: "S-NPP VIIRS", a: D("2012-01-20"), b: today, c: css("--viirs") }, { s: "NOAA-20 VIIRS", a: D("2018-01-01"), b: today, c: css("--viirs") },
  ];
  $("#sats").replaceChildren(Plot.plot({
    height: 110, marginLeft: 100, x: { type: "time", label: null, domain: [D("2000-01-01"), D("2028-01-01")] }, y: { label: null },
    marks: [Plot.barX(sats, { y: "s", x1: "a", x2: (d) => (d.b > today ? today : d.b), fill: "c", inset: 3 }),
      Plot.ruleY(sats.filter((d) => d.b > today), { y: "s", x1: () => today, x2: "b", stroke: "c", strokeDasharray: "2 2", strokeWidth: 2 })],
  }));
  const full = ys.filter((r) => r.year >= 2001 && r.year <= DATA.lastFull), tr = trend(full.map((r) => r.harm));
  const mean = d3.mean(full, (r) => r.harm), rel = mean ? (tr.slope / mean) * 100 : 0;
  $("#trend-text").textContent = `Trend 2001–${DATA.lastFull}: ${tr.slope >= 0 ? "+" : ""}${fmt1(tr.slope)} fire cell-days per year (${rel >= 0 ? "+" : ""}${rel.toFixed(1)}% of the average per year), ` +
    (tr.p < 0.05 ? `statistically significant (Mann-Kendall p = ${tr.p.toFixed(3)}).` : `not statistically significant (p = ${tr.p.toFixed(2)}).`);
}

function renderSpaghetti() {
  const lines = [], step = 3;
  for (const y of d3.range(2001, DATA.meta.years[1] + 1)) {
    const d0 = dayOf(`${y}-01-01`); let c = 0;
    for (let i = 0; i < 365 && d0 + i < DATA.nDays; i++) { c += S.series.harm[d0 + i] || 0; if (i % step === 0 || i === 364 || d0 + i === DATA.nDays - 1) lines.push({ year: y, doy: i, c }); }
  }
  const byDoy = d3.group(lines.filter((d) => d.year <= DATA.lastFull), (d) => d.doy);
  const band = [...byDoy].map(([doy, v]) => { const s = v.map((d) => d.c).sort(d3.ascending); return { doy, lo: d3.quantile(s, 0.1), hi: d3.quantile(s, 0.9), med: d3.quantile(s, 0.5) }; });
  const refY = S.ref.year < 2001 ? 2001 : S.ref.year;
  $("#spaghetti").replaceChildren(Plot.plot({
    height: 300, marginLeft: 52, x: { label: "day of year", ticks: [0, 59, 120, 181, 243, 304, 364], tickFormat: (d) => doyLabel(d) },
    y: { grid: true, label: "cumulative fire cell-days" },
    marks: [
      Plot.areaY(band, { x: "doy", y1: "lo", y2: "hi", fill: css("--muted"), fillOpacity: 0.15 }),
      Plot.lineY(lines.filter((d) => d.year !== refY), { x: "doy", y: "c", z: "year", stroke: css("--muted"), strokeOpacity: 0.25, strokeWidth: 1 }),
      Plot.lineY(band, { x: "doy", y: "med", stroke: css("--ink"), strokeDasharray: "4 3" }),
      Plot.lineY(lines.filter((d) => d.year === refY), { x: "doy", y: "c", stroke: css("--accent"), strokeWidth: 3 }),
      Plot.text(lines.filter((d) => d.year === refY).slice(-1), { x: "doy", y: "c", text: () => String(refY), dx: -4, dy: -8, textAnchor: "end", fill: css("--accent"), fontWeight: 700 }),
      Plot.tip(lines, Plot.pointer({ x: "doy", y: "c", title: (d) => `${d.year}, by ${doyLabel(d.doy)}: ${fmt(Math.round(d.c))}` })),
    ],
  }));
}

function renderSeason() {
  const s = seasons(S.series).filter((d) => d.total >= 10);
  $("#season").replaceChildren(Plot.plot({
    height: Math.max(220, s.length * 14 + 50), marginLeft: 44, x: { domain: [0, 365], label: null, ticks: [0, 59, 120, 181, 243, 304], tickFormat: (d) => doyLabel(d) },
    y: { label: null, domain: s.map((d) => String(d.year)) },
    marks: [Plot.ruleY(s, { y: (d) => String(d.year), x1: "start", x2: "end", stroke: (d) => (d.year < 2012 ? css("--modis") : css("--viirs")), strokeWidth: 6, strokeOpacity: 0.55 }),
      Plot.dot(s, { y: (d) => String(d.year), x: "mid", fill: css("--ink"), r: 3, tip: true, title: (d) => `${d.year}: ${doyLabel(d.start)} – ${doyLabel(d.end)}, half done by ${doyLabel(d.mid)}` })],
  }));
  const early = s.filter((d) => d.year <= 2010), late = s.filter((d) => d.year >= 2016);
  if (early.length >= 4 && late.length >= 4) {
    const dm = d3.median(late, (d) => d.mid) - d3.median(early, (d) => d.mid);
    const dl = d3.median(late, (d) => d.end - d.start) - d3.median(early, (d) => d.end - d.start);
    $("#season-text").textContent = `Compared with 2001–2010, the midpoint of the burning year in 2016–${DATA.lastFull} is ${Math.abs(Math.round(dm))} days ${dm < 0 ? "earlier" : "later"}, and the main window is ${Math.abs(Math.round(dl))} days ${dl >= 0 ? "longer" : "shorter"} (medians).`;
  } else $("#season-text").textContent = "Too little fire activity in this area to describe the season reliably.";
}

/* ---------------- PREVENTION ---------------- */
function renderPrevent() {
  const sites = recurringSites(S.aoi);
  S.sites = sites;
  const n = sites.length, of = sites[0]?.of || 14;
  const ge = (k) => sites.filter((s) => s.nYears >= k).length;
  $("#recur-summary").innerHTML = [
    [fmt(n), "2 km cells with any fire 2012–2025"], [fmt(ge(7)), `burned in at least half the years`],
    [fmt(ge(10)), "burned in 10 or more of 14 years"], [n ? pct(ge(7) / n) : "–", "of burned cells are repeat sites"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  const hist = d3.range(1, of + 1).map((k) => ({ k, n: sites.filter((s) => s.nYears === k).length }));
  $("#recur-chart").replaceChildren(Plot.plot({
    height: 200, marginLeft: 52, x: { label: "number of years with fire (of 14)" }, y: { grid: true, label: "cells", type: "sqrt" },
    color: { type: "sequential", scheme: "YlOrRd", domain: [1, of] },
    marks: [Plot.barY(hist, { x: "k", y: "n", fill: "k", tip: true }), Plot.ruleY([0])],
  }));
  const top = sites.slice(0, 60);
  $("#recur-table").innerHTML = `<table><thead><tr><th>Place (2 km cell)</th><th>County</th><th>Years</th><th>Fire days</th><th>Peak months</th><th>Usual window</th></tr></thead><tbody>${top.map((s, i) => `
    <tr class="click" data-i="${i}"><td>${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}</td><td>${esc(DATA.meta.counties.find((c) => c.id === s.county)?.name || "–")}</td>
    <td><span class="bar-cell" style="width:${(40 * s.nYears) / of}px"></span> ${s.nYears}/${of}</td><td>${s.days}</td>
    <td>${s.topMonths.map((m) => MONTHS[m]).join(", ")}</td><td>${doyLabel(Math.round(s.winStart))} – ${doyLabel(Math.round(s.winEnd))}</td></tr>`).join("")}</tbody></table>`;
  $$("#recur-table tr.click").forEach((tr) => (tr.onclick = () => { const s = top[+tr.dataset.i]; S.map.setView([s.lat, s.lon], 12); }));
  renderBacktest();
  const w = weekdayProfile(S.series), mean = d3.mean(w), days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  $("#weekday").replaceChildren(Plot.plot({
    height: 190, marginLeft: 48, x: { domain: days, label: null }, y: { grid: true, label: "vs weekly mean", tickFormat: "+.0%" },
    marks: [Plot.barY(w.map((v, i) => ({ d: days[i], v: mean ? v / mean - 1 : 0 })), { x: "d", y: "v", fill: (d) => (d.v > 0 ? css("--accent") : css("--muted")), tip: true }), Plot.ruleY([0])],
  }));
  // map layer: years burned
  const vals = new Map(sites.map((s) => [s.key, s.nYears]));
  const col = (v) => d3.interpolateYlOrRd(0.15 + (0.85 * (v - 1)) / (of - 1));
  setDataLayer(gridOverlay(vals, col), `<span>Years with fire, 2012–2025</span><span class="ramp" style="background:${rampCss((t) => d3.interpolateYlOrRd(0.15 + 0.85 * t))}"></span><span>1 → 14</span>`);
}

function renderBacktest() {
  const k = Math.max(1, Math.min(8, +$("#in-k").value || 5)), b = recurringBacktest(S.aoi, k);
  $("#backtest").innerHTML = b.total < 30 ? `<p class="hint">Too few fires in this area after 2019 for a meaningful test.</p>` : `
    <div class="kpis">
      <div class="kpi"><div class="v">${pct(b.areaShare)}</div><div class="l">of burned cells picked (${fmt(b.picked)} cells)</div></div>
      <div class="kpi"><div class="v">${pct(b.capShare)}</div><div class="l">of 2020–2025 fire days happened in them</div></div>
      <div class="kpi"><div class="v">${b.lift ? b.lift.toFixed(1) + "×" : "–"}</div><div class="l">better than picking cells at random</div></div>
    </div>
    <p class="hint">Chosen using 2012–2019 only, tested on 2020–2025. Higher thresholds pick fewer places with a stronger signal.</p>`;
}

/* ---------------- PLANNING ---------------- */
function planWindow() {
  const v = $("#plan-date").value || "2026-08-01", [, m, d] = v.split("-").map(Number);
  const doy = Math.round((Date.UTC(2025, m - 1, d) - Date.UTC(2025, 0, 1)) / 864e5);
  return { startWeek: Math.min(51, Math.floor(doy / 7)), nWeeks: 6, doy };
}
function renderPlan() {
  const to = DATA.lastFull, base = $("#plan-base").value, from = base === "recent" ? to - 9 : 2001;
  const clim = weeklyClimatology(S.series, from, to), w = planWindow();
  const inWin = (wk) => { const rel = (wk - w.startWeek + 52) % 52; return rel < w.nWeeks; };
  $("#plan-curve").replaceChildren(Plot.plot({
    height: 260, marginLeft: 52, x: { label: "week of year", domain: d3.range(52), tickFormat: (d) => (d % 4 === 0 ? doyLabel(d * 7) : ""), tickRotate: 0 },
    y: { grid: true, label: "fire cell-days per week" },
    marks: [
      Plot.barY(clim, { x: "week", y: "median", fill: (d) => (inWin(d.week) ? css("--accent") : css("--muted")), fillOpacity: (d) => (inWin(d.week) ? 0.95 : 0.45) }),
      Plot.tickY(clim, { x: "week", y: "p90", stroke: css("--ink"), strokeWidth: 1.5 }),
      Plot.tip(clim, Plot.pointerX({ x: "week", y: "median", title: (d) => `week of ${doyLabel(d.week * 7)}\nmedian ${fmt1(d.median)} · 90th pct ${fmt1(d.p90)}\n${pct(d.share)} of a typical year` })),
    ],
  }));
  const win = clim.filter((d) => inWin(d.week)), share = d3.sum(win, (d) => d.share);
  const peak = clim.reduce((a, b) => (b.median > a.median ? b : a));
  const share1 = share < 0.1 ? d3.format(".1%")(share) : pct(share);
  $("#plan-text").innerHTML = [
    [share1, `of a typical year's burning falls in the 6 weeks from ${doyLabel(w.startWeek * 7)}`],
    [fmt(Math.round(d3.sum(win, (d) => d.median))), "expected fire cell-days in that window (median)"],
    [fmt(Math.round(d3.sum(win, (d) => d.p90))), "planning ceiling (90th percentile weeks)"],
    [doyLabel(peak.week * 7), "busiest week of the year here"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  // county ranking (national context)
  const rows = countyOutlook(w.startWeek, w.nWeeks, to - 9, to);
  S.countyRows = rows;
  const top = rows.slice(0, 15);
  $("#county-chart").replaceChildren(Plot.plot({
    height: 360, marginLeft: 110, x: { grid: true, label: `expected fire cell-days, 6 weeks from ${doyLabel(w.startWeek * 7)}` }, y: { domain: top.map((r) => r.name), label: null },
    marks: [Plot.barX(top, { y: "name", x: "median", fill: css("--accent"), tip: true }), Plot.tickX(top, { y: "name", x: "p90", stroke: css("--ink"), strokeWidth: 2 }), Plot.ruleX([0])],
  }));
  $("#county-table").innerHTML = `<table><thead><tr><th>County</th><th>Rank</th><th>Median</th><th>90th pct</th><th>Worst year</th><th>Share of national</th></tr></thead><tbody>${rows.map((r, i) => `
    <tr class="click" data-id="${r.id}"><td>${esc(r.name)}</td><td>${i + 1}</td><td>${fmt1(r.median)}</td><td>${fmt1(r.p90)}</td><td>${fmt(r.max)}</td><td>${pct(r.share)}</td></tr>`).join("")}</tbody></table>`;
  $$("#county-table tr.click").forEach((tr) => (tr.onclick = () => setAoi({ type: "county", id: +tr.dataset.id })));
  // map: county choropleth
  const max = d3.max(rows, (r) => r.median) || 1, byId = new Map(rows.map((r) => [r.id, r]));
  const layer = L.geoJSON(DATA.counties, {
    style: (f) => { const r = byId.get(f.properties.id); return { color: css("--muted"), weight: 0.6, fillColor: d3.interpolateYlOrRd(0.08 + 0.92 * Math.sqrt((r?.median || 0) / max)), fillOpacity: 0.75 }; },
    onEachFeature: (f, l) => { const r = byId.get(f.properties.id); l.bindTooltip(`${f.properties.name}: ${fmt1(r?.median || 0)} expected (90th pct ${fmt1(r?.p90 || 0)})`, { sticky: true }); l.on("click", () => setAoi({ type: "county", id: f.properties.id })); },
  });
  setDataLayer(layer, `<span>Expected activity by county, 6 weeks from ${doyLabel(w.startWeek * 7)}</span><span class="ramp" style="background:${rampCss((t) => d3.interpolateYlOrRd(0.08 + 0.92 * t))}"></span>`);
}

/* ---------------- FIRES ---------------- */
async function renderFires() {
  $("#fires-summary").innerHTML = `<p class="hint">Loading fire events…</p>`;
  const all = await loadEvents();
  const ev = (S.fires = eventsIn(S.aoi, all));
  const big = ev.filter((e) => e.n >= 10).length, maxPix = d3.max(ev, (e) => e.pix) || 0;
  $("#fires-summary").innerHTML = [
    [fmt(ev.length), "fires since 2012"], [fmt(big), "with 10+ detections"],
    [ev.length ? `${(d3.mean(ev, (e) => e.dur)).toFixed(1)} d` : "–", "average duration"],
    [maxPix ? `~${fmt1(maxPix * 0.14)} km²` : "–", "largest footprint (approx.)"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  const bins = d3.bin().domain([0, 4]).thresholds(16)(ev.map((e) => Math.log10(e.pix)));
  $("#fires-hist").replaceChildren(Plot.plot({
    height: 190, marginLeft: 52, x: { label: "footprint in 375 m pixels (log scale)", tickFormat: (d) => fmt(Math.round(10 ** d)) }, y: { grid: true, type: "sqrt", label: "fires" },
    marks: [Plot.rectY(bins, { x1: "x0", x2: "x1", y: (b) => b.length, fill: css("--viirs"), insetLeft: 1 }), Plot.ruleY([0])],
  }));
  renderFiresTable(); renderFiresCompare();
  const top = ev.filter((e) => e.n >= 3);
  const layer = L.layerGroup(top.map((e) => L.circleMarker([e.lat, e.lon], { renderer: S.renderer, radius: Math.min(14, 2 + Math.sqrt(e.pix)), color: css("--ink"), weight: 0.5, fillColor: css("--viirs"), fillOpacity: 0.55 })
    .bindTooltip(`${isoOf(e.start)} · ${e.dur} d · ${e.n} detections · ~${fmt1(e.pix * 0.14)} km²`)));
  setDataLayer(layer, `<span><i style="background:${css("--viirs")}"></i>Fires with 3+ detections, 2012–2025; size = footprint</span>`);
}
function renderFiresTable() {
  if (!S.fires) return;
  const key = $("#fires-sort").value, list = S.fires.slice().sort((a, b) => b[key] - a[key]).slice(0, 25);
  $("#fires-table").innerHTML = `<table><thead><tr><th>Start</th><th>Days</th><th>Detections</th><th>Footprint</th><th>Energy (MW sum)</th><th>Location</th></tr></thead><tbody>${list.map((e, i) => `
    <tr class="click" data-i="${i}"><td>${isoOf(e.start)}</td><td>${e.dur}</td><td>${fmt(e.n)}</td><td>~${fmt1(e.pix * 0.14)} km²</td><td>${fmt(Math.round(e.frp))}</td><td>${e.lat.toFixed(3)}, ${e.lon.toFixed(3)}</td></tr>`).join("")}</tbody></table>`;
  $$("#fires-table tr.click").forEach((tr) => (tr.onclick = () => { const e = list[+tr.dataset.i]; S.map.setView([e.lat, e.lon], 11); }));
}
function renderFiresCompare() {
  if (!S.fires) return;
  const [y, m] = ($("#fires-month").value || "2025-08").split("-").map(Number);
  const inMonth = S.fires.filter((e) => { const d = dateOf(e.start); return d.getUTCFullYear() === y && d.getUTCMonth() === m - 1; }).sort((a, b) => b.pix - a.pix);
  if (!inMonth.length) { $("#fires-compare").innerHTML = `<p class="hint">No fires detected in this area in ${MONTHS_LONG[m - 1]} ${y}.</p>`; return; }
  const sorted = S.fires.map((e) => e.pix).sort(d3.descending), e = inMonth[0];
  const rank = 1 + sorted.findIndex((p) => p <= e.pix);
  $("#fires-compare").innerHTML = `<p class="sentence">The largest fire in ${MONTHS_LONG[m - 1]} ${y} started ${isoOf(e.start)}, lasted ${e.dur} day${e.dur > 1 ? "s" : ""}
    and covered ~${fmt1(e.pix * 0.14)} km²: the <b>${ord(rank)} largest</b> of ${fmt(S.fires.length)} fires in ${esc(S.aoi.name)} since 2012 (top ${Math.max(1, Math.round((100 * rank) / S.fires.length))}%).</p>
    <p class="hint">${inMonth.length} fire${inMonth.length > 1 ? "s" : ""} that month. <a href="#" id="fc-zoom">Show on map</a></p>`;
  $("#fc-zoom").onclick = (ev) => { ev.preventDefault(); S.map.setView([e.lat, e.lon], 11); };
}

/* ---------------- DATA ---------------- */
function renderData() { renderHotspotLayer(); }
async function renderHotspotLayer() {
  const y = +$("#hs-year").value, sensor = $("#hs-sensor .on").dataset.v, showStatic = $("#hs-static").checked;
  $("#hs-stats").textContent = "Loading…";
  const pts = (await loadHotspots(y)).filter((p) => (sensor === "all" || (sensor === "modis" ? p.sensor < 2 : p.sensor >= 2)) &&
    ((p.flags & 2) || (showStatic && (p.flags & 1 || p.type !== 0))) && S.aoi.contains(p.lat, p.lon));
  const color = (p) => (p.flags & 2 ? d3.interpolateSinebow(((p.day % 366) / 366 + 0.6) % 1) : "#777");
  const layer = L.layerGroup(pts.map((p) => L.circleMarker([p.lat, p.lon], { renderer: S.renderer, radius: p.sensor < 2 ? 3.2 : 1.8, weight: p.sensor < 2 ? 1 : 0, color: css("--ink"), fillColor: color(p), fillOpacity: 0.85 })
    .bindTooltip(`${SENSOR_NAME[p.sensor]} · ${isoOf(p.day)} ${String(p.time).padStart(4, "0")} UTC · ${p.frp} MW${p.flags & 2 ? "" : " · removed (static/low confidence)"}`)));
  const nm = pts.filter((p) => p.sensor < 2).length;
  $("#hs-stats").textContent = `${fmt(pts.length)} hotspots in ${y} (MODIS ${fmt(nm)}, VIIRS ${fmt(pts.length - nm)}). Colour = season; grey = removed by cleaning.`;
  setDataLayer(layer, `${MONTHS.map((m, i) => `<span><i style="background:${d3.interpolateSinebow(((i * 30.5 + 15) / 366 + 0.6) % 1)}"></i>${m}</span>`).join("")}<span>large outlined = MODIS, small = VIIRS</span>`);
}

/* ---------------- exports ---------------- */
function download(name, text, type = "text/csv") {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const slug = () => S.aoi.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function exportHotspots() {
  const a = +$("#ex-from").value, b = +$("#ex-to").value, lo = Math.min(a, b), hi = Math.max(a, b);
  $("#ex-status").textContent = "Preparing…";
  const lines = ["latitude,longitude,date,time_utc,sensor,confidence,frp_mw,type,static_mask,kept_in_harmonized"];
  for (const y of d3.range(lo, hi + 1)) for (const p of await loadHotspots(y)) {
    if (!S.aoi.contains(p.lat, p.lon)) continue;
    lines.push([p.lat.toFixed(5), p.lon.toFixed(5), isoOf(p.day), String(p.time).padStart(4, "0"), SENSOR_NAME[p.sensor], p.conf, p.frp.toFixed(1), p.type, p.flags & 1 ? 1 : 0, p.flags & 2 ? 1 : 0].join(","));
  }
  download(`hotspots_${slug()}_${lo}-${hi}.csv`, lines.join("\n"));
  $("#ex-status").textContent = `${fmt(lines.length - 1)} hotspots exported. Source: NASA FIRMS.`;
}
function exportMonthly() {
  const lines = ["year,month,harmonized_fire_cell_days,source,modis_fire_cell_days,viirs_snpp_fire_cell_days"];
  for (const r of S.rows.slice().sort((a, b) => a.year - b.year || a.month - b.month))
    lines.push([r.year, r.month + 1, r.harm.toFixed(2), r.modelled ? "modelled_from_modis" : "observed_viirs", r.modis, r.viirs].join(","));
  download(`monthly_${slug()}.csv`, lines.join("\n"));
  $("#ex-status").textContent = "Monthly table exported (VIIRS-equivalent fire cell-days on a 0.02° grid).";
}
function exportFires() {
  if (!S.fires) { loadEvents().then(() => { S.fires = eventsIn(S.aoi, DATA.events); exportFires(); }); return; }
  const lines = ["start_date,duration_days,detections,footprint_km2_approx,frp_sum_mw,lat,lon"];
  for (const e of S.fires) lines.push([isoOf(e.start), e.dur, e.n, (e.pix * 0.14).toFixed(2), e.frp.toFixed(1), e.lat.toFixed(4), e.lon.toFixed(4)].join(","));
  download(`fires_${slug()}.csv`, lines.join("\n"));
  $("#ex-status").textContent = `${fmt(S.fires.length)} fires exported.`;
}
function exportPng() {
  if (S.tab !== "explore") { setTab("explore"); writeHash(); }
  const fig = $("#calendar").firstElementChild; if (!fig) return;
  const svgs = fig.tagName === "svg" ? [fig] : [...fig.querySelectorAll("svg")];
  const main = svgs[svgs.length - 1];
  const clone = main.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.style.color = "#1c1a17"; clone.style.background = "#fff";
  const w = +main.getAttribute("width"), h = +main.getAttribute("height");
  const img = new Image(), url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  img.onload = () => {
    const pad = 50, cv = Object.assign(document.createElement("canvas"), { width: (w + 40) * 2, height: (h + pad + 30) * 2 }), ctx = cv.getContext("2d");
    ctx.scale(2, 2); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w + 40, h + pad + 30);
    ctx.fillStyle = "#1c1a17"; ctx.font = "600 16px system-ui, sans-serif"; ctx.fillText(`Burning calendar: ${S.aoi.name}`, 20, 26);
    ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = "#6a645b"; ctx.fillText("Harmonized MODIS + VIIRS fire cell-days · NASA FIRMS · Ember Ledger", 20, 44);
    ctx.drawImage(img, 20, pad); URL.revokeObjectURL(url);
    cv.toBlob((b) => { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(b), download: `calendar_${slug()}.png` }); a.click(); });
  };
  img.src = url;
}

boot();
