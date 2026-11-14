#!/usr/bin/env python3
"""Build the data files for the Ember Ledger web app.

Drafted with an AI assistant (Claude). Standard library only.

    python3 app/pipeline/build.py --raw /tmp/firms-ro --download --counties /tmp/ro_adm1.geojson

Inputs
  FIRMS per-country yearly CSVs for Romania: modis_<y>.csv (2000-2025), snpp_<y>.csv (2012-2025),
  n20_<y>.csv (2018-2025). With --download they are fetched from FIRMS (no key needed).
  County boundaries: geoBoundaries ROU ADM1 (CC BY 4.0).

Method (see app/methods.html for the long version)
  1. Clean: vegetation fires only (type 0); MODIS confidence >= 30; VIIRS confidence not "l";
     drop detections inside a static-source mask built from every location VIIRS flags as type 2/3.
  2. Common unit: fire cell-days on a 0.02 deg grid (a cell counts once per day).
  3. Reference = VIIRS S-NPP (NOAA-20 is kept for maps and exports but not mixed into the series,
     because mixing creates a break in 2018).
  4. Per-month ratio VIIRS/MODIS cell-days fitted on 2013-2022; MODIS months before Aqua
     (July 2002) are first scaled by a per-month (Terra+Aqua)/Terra factor fitted on 2003-2011.
  5. Leave-one-year-out validation on the overlap.

Outputs (app/data/)
  meta.json, cd_modis.bin, cd_viirs.bin, cellcounty.bin, counties.geojson, events.bin,
  hotspots/<year>.bin. Binary layouts are documented in meta.json["formats"].
"""
import argparse
import csv
import datetime as dt
import json
import math
import os
import struct
import urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
OUT = os.path.join(APP, "data")

LAT0, LON0, GRID = 43.0, 20.0, 0.02
MASK_GRID = 0.01
EPOCH = dt.date(2000, 1, 1)
OVERLAP = list(range(2013, 2023))
AQUA_START = dt.date(2002, 7, 4)
LAST_YEAR = dt.date.today().year
SOURCES = {"modis": ("modis", range(2000, LAST_YEAR + 1)), "snpp": ("viirs-snpp", range(2012, LAST_YEAR + 1)),
           "n20": ("viirs-jpss1", range(2018, LAST_YEAR + 1))}
# country archives use Terra/Aqua/N/N20; NRT files from the API may use T/A/1
SENSOR_CODE = {"Terra": 0, "T": 0, "Aqua": 1, "A": 1, "N": 2, "N20": 3, "1": 3}
VIIRS_CONF = {"l": 20, "n": 60, "h": 95}


def download(raw):
    os.makedirs(raw, exist_ok=True)
    for key, (folder, years) in SOURCES.items():
        for y in years:
            p = os.path.join(raw, f"{key}_{y}.csv")
            if os.path.exists(p):
                continue
            url = f"https://firms.modaps.eosdis.nasa.gov/data/country/{folder}/{y}/{folder}_{y}_Romania.csv"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=120) as r, open(p, "wb") as f:
                    f.write(r.read())
                print("downloaded", p)
            except Exception as e:
                print("skip", url, e)


def rows(raw, key, y):
    p = os.path.join(raw, f"{key}_{y}.csv")
    if not os.path.exists(p):
        return []
    with open(p, newline="") as f:
        return list(csv.DictReader(f))


def day_index(d):
    return (d - EPOCH).days


def grid_cell(lat, lon):
    return int((lat - LAT0) // GRID), int((lon - LON0) // GRID)


# ---------- geometry helpers ----------
def point_in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi:
            inside = not inside
        j = i
    return inside


def point_in_polys(x, y, polys):
    for poly in polys:  # poly = [outer, hole1, ...]
        if point_in_ring(x, y, poly[0]) and not any(point_in_ring(x, y, h) for h in poly[1:]):
            return True
    return False


def simplify(ring, tol):
    """Douglas-Peucker on a closed ring."""
    if len(ring) < 8:
        return ring

    def dp(pts):
        if len(pts) < 3:
            return pts
        (x1, y1), (x2, y2) = pts[0], pts[-1]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1e-12
        idx, dmax = 0, 0
        for i in range(1, len(pts) - 1):
            d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
            if d > dmax:
                idx, dmax = i, d
        if dmax > tol:
            return dp(pts[: idx + 1])[:-1] + dp(pts[idx:])
        return [pts[0], pts[-1]]

    half = len(ring) // 2
    out = dp(ring[: half + 1])[:-1] + dp(ring[half:])
    return out if len(out) >= 4 else ring


def load_counties(path):
    gj = json.load(open(path))
    counties = []
    for i, f in enumerate(sorted(gj["features"], key=lambda f: f["properties"]["shapeName"])):
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        polys = [[simplify([tuple(p) for p in ring], 0.004) for ring in poly] for poly in polys]
        name = f["properties"]["shapeName"].title().replace("Bucuresti", "Bucharest")
        xs = [p[0] for poly in polys for p in poly[0]]
        ys = [p[1] for poly in polys for p in poly[0]]
        counties.append({"id": i, "name": name, "polys": polys, "bbox": (min(xs), min(ys), max(xs), max(ys))})
    return counties


def county_of(lon, lat, counties):
    for c in counties:
        x0, y0, x1, y1 = c["bbox"]
        if x0 <= lon <= x1 and y0 <= lat <= y1 and point_in_polys(lon, lat, c["polys"]):
            return c["id"]
    return 255


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--counties", required=True)
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--out", default=None, help="output folder (default: app/data)")
    a = ap.parse_args()
    global OUT
    if a.out:
        OUT = a.out
    if a.download:
        download(a.raw)
    os.makedirs(os.path.join(OUT, "hotspots"), exist_ok=True)

    data = {k: {y: rows(a.raw, k, y) for y in yrs} for k, (_, yrs) in SOURCES.items()}
    max_year = max(y for k in data for y, rs in data[k].items() if rs)
    all_dates = [r["acq_date"] for k in data for rs in data[k].values() for r in rs]
    data_start, data_end = min(all_dates), max(all_dates)
    end = dt.date.fromisoformat(data_end)
    last_full_year = end.year if (end.month, end.day) == (12, 31) else end.year - 1

    # static-source mask
    static = set()
    for key in ("snpp", "n20"):
        for rs in data[key].values():
            for r in rs:
                if r.get("type", "0") in ("2", "3"):
                    i, j = math.floor(float(r["latitude"]) / MASK_GRID), math.floor(float(r["longitude"]) / MASK_GRID)
                    for di in (-1, 0, 1):
                        for dj in (-1, 0, 1):
                            static.add((i + di, j + dj))

    def is_masked(lat, lon):
        return (math.floor(lat / MASK_GRID), math.floor(lon / MASK_GRID)) in static

    cd = {"modis": set(), "viirs": set(), "terra": set()}  # (row, col, day)
    snpp_points = []  # for events
    year_stats = {}
    counts = Counter()
    for y in range(2000, max_year + 1):
        recs = []
        for key in ("modis", "snpp", "n20"):
            for r in data[key].get(y, []):
                lat, lon = float(r["latitude"]), float(r["longitude"])
                d = dt.date.fromisoformat(r["acq_date"])
                di = day_index(d)
                sensor = SENSOR_CODE.get(r["satellite"], 2 if key == "snpp" else 3 if key == "n20" else 0)
                t = int(r.get("type") or 0)  # NRT files have no type column; the static mask still applies
                vconf = (r["confidence"] or "n")[0].lower()
                conf = int(r["confidence"]) if key == "modis" else VIIRS_CONF.get(vconf, 0)
                frp = float(r["frp"] or 0)
                masked = is_masked(lat, lon)
                keep = t == 0 and not masked and (conf >= 30 if key == "modis" else vconf != "l")
                flags = (1 if masked else 0) | (2 if keep else 0)
                recs.append((lat, lon, frp, di, int(str(r["acq_time"]).replace(":", "")), sensor, t, conf, flags))
                counts[(key, "all")] += 1
                if not keep:
                    continue
                counts[(key, "kept")] += 1
                rc = grid_cell(lat, lon)
                if key == "modis":
                    cd["modis"].add((rc[0], rc[1], di))
                    if sensor == 0:
                        cd["terra"].add((rc[0], rc[1], di))
                elif key == "snpp":
                    cd["viirs"].add((rc[0], rc[1], di))
                    snpp_points.append((lat, lon, di, frp))
        recs.sort(key=lambda x: (x[3], x[4]))
        with open(os.path.join(OUT, "hotspots", f"{y}.bin"), "wb") as f:
            for rec in recs:
                f.write(struct.pack("<fffHHBBBB", *rec))
        year_stats[y] = len(recs)
        print(y, len(recs))

    # monthly cell-day tables for ratios
    def monthly(setname):
        m = defaultdict(int)
        for (_, _, di) in cd[setname]:
            d = EPOCH + dt.timedelta(days=di)
            m[(d.year, d.month)] += 1
        return m

    mm, mv, mt = monthly("modis"), monthly("viirs"), monthly("terra")
    ratio = [sum(mv[(y, m)] for y in OVERLAP) / max(1, sum(mm[(y, m)] for y in OVERLAP)) for m in range(1, 13)]
    terra_factor = [sum(mm[(y, m)] for y in range(2003, 2012)) / max(1, sum(mt[(y, m)] for y in range(2003, 2012)))
                    for m in range(1, 13)]
    loyo = []
    for test in OVERLAP:
        pred = obs = 0
        for m in range(1, 13):
            r = sum(mv[(y, m)] for y in OVERLAP if y != test) / max(1, sum(mm[(y, m)] for y in OVERLAP if y != test))
            pred += mm[(test, m)] * r
            obs += mv[(test, m)]
        loyo.append({"year": test, "predicted": round(pred), "observed": obs, "error_pct": round(100 * (pred - obs) / obs, 1)})
    mape = sum(abs(x["error_pct"]) for x in loyo) / len(loyo)

    # write cell-day binaries
    for name in ("modis", "viirs"):
        with open(os.path.join(OUT, f"cd_{name}.bin"), "wb") as f:
            for rc in sorted(cd[name], key=lambda t: (t[2], t[0], t[1])):
                f.write(struct.pack("<HHH", *rc))

    # counties and cell -> county
    counties = load_counties(a.counties)
    cells = {(r, c) for (r, c, _) in cd["modis"] | cd["viirs"]}
    with open(os.path.join(OUT, "cellcounty.bin"), "wb") as f:
        for (r, c) in sorted(cells):
            lat, lon = LAT0 + (r + 0.5) * GRID, LON0 + (c + 0.5) * GRID
            f.write(struct.pack("<HHH", r, c, county_of(lon, lat, counties)))
    gj = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"id": c["id"], "name": c["name"]},
         "geometry": {"type": "MultiPolygon", "coordinates": [[[[round(x, 4), round(y, 4)] for x, y in ring] for ring in poly] for poly in c["polys"]]}}
        for c in counties]}
    with open(os.path.join(OUT, "counties.geojson"), "w") as f:
        json.dump(gj, f, separators=(",", ":"))

    # fire events from S-NPP: detections within ~750 m on the same or next day are one event
    events = build_events(snpp_points)
    with open(os.path.join(OUT, "events.bin"), "wb") as f:
        for e in events:
            f.write(struct.pack("<fffHHHH", *e))

    meta = {
        "name": "Ember Ledger",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "area": "Romania", "bbox": [20.0, 43.4, 30.0, 48.4],
        "grid": {"lat0": LAT0, "lon0": LON0, "size": GRID},
        "epoch": EPOCH.isoformat(), "years": [2000, max_year], "viirs_start": "2012-01-20",
        "data_start": data_start, "data_end": data_end, "last_full_year": last_full_year,
        "aqua_start": AQUA_START.isoformat(), "overlap": [OVERLAP[0], OVERLAP[-1]],
        "ratio_by_month": [round(r, 4) for r in ratio],
        "terra_factor_by_month": [round(r, 4) for r in terra_factor],
        "loyo": loyo, "loyo_mape_pct": round(mape, 1),
        "counts": {f"{k}_{v}": n for (k, v), n in counts.items()},
        "hotspots_per_year": year_stats,
        "static_mask_cells": len(static),
        "counties": [{"id": c["id"], "name": c["name"]} for c in counties],
        "events": len(events),
        "formats": {
            "cd_*.bin": "little-endian uint16 triples: row, col, day (days since epoch); cell centre = lat0+(row+.5)*size, lon0+(col+.5)*size",
            "cellcounty.bin": "uint16 triples: row, col, county id (255 = outside)",
            "hotspots/<year>.bin": "20-byte records: f32 lat, f32 lon, f32 frp, u16 day, u16 time(HHMM UTC), u8 sensor(0 Terra,1 Aqua,2 S-NPP,3 NOAA-20), u8 type, u8 confidence(0-100), u8 flags(1 masked static, 2 kept)",
            "events.bin": "20-byte records: f32 lat, f32 lon, f32 frp sum, u16 start day, u16 duration days, u16 detections, u16 approx 375 m pixels",
        },
        "sources": {
            "firms": "NASA FIRMS MODIS C6.x and VIIRS 375 m (S-NPP, NOAA-20) per-country archives",
            "counties": "geoBoundaries ROU ADM1 (World Bank), CC BY 4.0",
        },
    }
    with open(os.path.join(OUT, "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("cell-days modis", len(cd["modis"]), "viirs", len(cd["viirs"]), "events", len(events), "LOYO", round(mape, 1))


def build_events(points):
    parent = list(range(len(points)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[rj] = ri

    B = 0.0075  # ~750 m buckets
    buckets = defaultdict(list)
    for idx, (lat, lon, di, _) in enumerate(points):
        buckets[(di, int(lat // B), int(lon // B))].append(idx)
    for (di, bi, bj), idxs in buckets.items():
        for dd in (0, -1):
            for ni in (-1, 0, 1):
                for nj in (-1, 0, 1):
                    other = buckets.get((di + dd, bi + ni, bj + nj))
                    if not other:
                        continue
                    for i in idxs:
                        la, lo = points[i][0], points[i][1]
                        for j in other:
                            if j != i and abs(points[j][0] - la) <= B and abs(points[j][1] - lo) <= B * 1.4:
                                union(i, j)
    groups = defaultdict(list)
    for i in range(len(points)):
        groups[find(i)].append(i)
    events = []
    for idxs in groups.values():
        lats = [points[i][0] for i in idxs]
        lons = [points[i][1] for i in idxs]
        days = [points[i][2] for i in idxs]
        frp = sum(points[i][3] for i in idxs)
        pix = len({(round(points[i][0] / 0.0035), round(points[i][1] / 0.0035)) for i in idxs})
        events.append((sum(lats) / len(lats), sum(lons) / len(lons), frp, min(days),
                       max(days) - min(days) + 1, min(len(idxs), 65535), min(pix, 65535)))
    events.sort(key=lambda e: e[3])
    return events


if __name__ == "__main__":
    main()
