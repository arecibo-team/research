#!/usr/bin/env python3
"""Build the JSON files the showcase site reads.

Drafted with an AI assistant (Claude). Standard library only.

Usage:
    python3 showcase/scripts/build_data.py --raw /path/to/firms-ro   # FIRMS CSVs (see --download)
    python3 showcase/scripts/build_data.py --raw /tmp/firms-ro --download

Inputs: FIRMS per-country yearly CSVs for Romania, named
    modis_<year>.csv (2000-2025), snpp_<year>.csv (2012-2025), n20_<year>.csv (2018-2025)
Outputs (showcase/data/):
    firms_summary.json   monthly counts per sensor, prototype harmonization, distributions
    points_<year>.json   individual hotspots for a few years (map view)
    sample_rows.json     raw rows as they appear in the files
    features.json        parsed from docs/feature-catalog.md

The harmonization here is a PROTOTYPE for discussion (per-month ratio on fire cell-days),
not the final method described in docs/project-idea.md.
"""
import argparse
import csv
import datetime as dt
import json
import math
import os
import re
import statistics
import urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SHOWCASE = os.path.dirname(HERE)
REPO = os.path.dirname(SHOWCASE)
OUT = os.path.join(SHOWCASE, "data")

BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"
SOURCES = {
    "modis": ("modis", range(2000, 2026)),
    "snpp": ("viirs-snpp", range(2012, 2026)),
    "n20": ("viirs-jpss1", range(2018, 2026)),
}
GRID = 0.02          # degrees, about 2 km: the "fire cell-day" unit
MASK_GRID = 0.01     # degrees, for the static-source mask
OVERLAP = range(2013, 2023)  # full overlap years used to fit the prototype ratios
AQUA_START = dt.date(2002, 7, 4)
POINT_YEARS = [2007, 2015, 2019, 2023, 2025]


def download(raw):
    os.makedirs(raw, exist_ok=True)
    for key, (folder, years) in SOURCES.items():
        for y in years:
            path = os.path.join(raw, f"{key}_{y}.csv")
            if os.path.exists(path):
                continue
            url = f"{BASE}/{folder}/{y}/{folder}_{y}_Romania.csv"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
                    f.write(r.read())
                print("downloaded", path)
            except Exception as e:  # missing years are expected (e.g. NOAA-20 2017)
                print("skip", url, e)


def read(raw, key, year):
    path = os.path.join(raw, f"{key}_{year}.csv")
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def cell(lat, lon, size):
    return (math.floor(lat / size), math.floor(lon / size))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--download", action="store_true")
    a = ap.parse_args()
    if a.download:
        download(a.raw)
    os.makedirs(OUT, exist_ok=True)

    data = {k: {y: read(a.raw, k, y) for y in years} for k, (_, years) in SOURCES.items()}

    # Static-source mask from every location VIIRS flags as type 2/3, buffered by one mask cell.
    static = set()
    for key in ("snpp", "n20"):
        for rows in data[key].values():
            for r in rows:
                if r["type"] in ("2", "3"):
                    c = cell(float(r["latitude"]), float(r["longitude"]), MASK_GRID)
                    for di in (-1, 0, 1):
                        for dj in (-1, 0, 1):
                            static.add((c[0] + di, c[1] + dj))

    def masked(r):
        return cell(float(r["latitude"]), float(r["longitude"]), MASK_GRID) in static

    monthly = {}          # series -> year -> [12]
    def add(series, year, month, n=1):
        monthly.setdefault(series, {}).setdefault(str(year), [0] * 12)[month - 1] += n

    cellday = defaultdict(set)   # (series, year, month) -> {(cell, date)}
    removed = Counter()
    types = defaultdict(Counter)
    frp_hist = defaultdict(Counter)
    conf = defaultdict(Counter)
    daynight = defaultdict(Counter)
    weekday = defaultdict(Counter)
    doy = defaultdict(Counter)
    versions = defaultdict(Counter)

    for key, years in data.items():
        for y, rows in years.items():
            for r in rows:
                d = dt.date.fromisoformat(r["acq_date"])
                m = d.month
                t = r["type"]
                types[key][t] += 1
                versions[key][r["version"]] += 1
                sat = r["satellite"]
                series = {"Terra": "modis_terra", "Aqua": "modis_aqua"}.get(sat, key)
                add(series + "_all", y, m)
                if t != "0":
                    continue
                if key == "modis":
                    # drop low confidence; apply our own static mask (early MODIS has no type flags)
                    if int(r["confidence"]) < 30:
                        continue
                    if masked(r):
                        removed[y] += 1
                        continue
                else:
                    if r["confidence"] == "l":
                        continue
                add(series + "_veg", y, m)
                # Reference VIIRS series = S-NPP only, so adding NOAA-20 in 2018 does not
                # create a new break inside the "observed" record.
                group = {"modis": "modis", "snpp": "viirs", "n20": "n20"}[key]
                add(group + "_veg", y, m)
                c = cell(float(r["latitude"]), float(r["longitude"]), GRID)
                cellday[(group, y, m)].add((c, d))
                if key == "modis" and sat == "Terra":
                    cellday[("modis_terra", y, m)].add((c, d))
                frp = float(r["frp"] or 0)
                if frp > 0 and 2013 <= y <= 2022 and key in ("modis", "snpp"):
                    frp_hist[key][round(math.log10(frp) * 4) / 4] += 1
                if 2013 <= y <= 2022:
                    conf[key][r["confidence"] if key != "modis" else (
                        "l" if int(r["confidence"]) < 30 else "n" if int(r["confidence"]) < 80 else "h")] += 1
                    daynight[key][r["daynight"]] += 1
                if key == "snpp":
                    weekday["viirs"][d.weekday()] += 1
                if key == "modis":
                    era = "2001-2007" if 2001 <= y <= 2007 else "2019-2025" if 2019 <= y <= 2025 else None
                    if era:
                        doy[era][(d.timetuple().tm_yday - 1) // 7] += 1

    def cd(group, y, m):
        return len(cellday.get((group, y, m), ()))

    # Prototype harmonization on fire cell-days (VIIRS-equivalent units).
    ratio = []
    for m in range(1, 13):
        v = sum(cd("viirs", y, m) for y in OVERLAP)
        mo = sum(cd("modis", y, m) for y in OVERLAP)
        ratio.append(v / mo if mo else None)
    # Terra-only correction for 2000 to mid-2002: (Terra+Aqua) / Terra cell-days, 2003-2011
    terra_factor = []
    for m in range(1, 13):
        both = sum(cd("modis", y, m) for y in range(2003, 2012))
        terra = sum(cd("modis_terra", y, m) for y in range(2003, 2012))
        terra_factor.append(both / terra if terra else 1.0)

    harmonized, observed, modelled = {}, {}, {}
    cells_modis, cells_viirs, cells_n20 = {}, {}, {}
    for y in range(2000, 2026):
        hm, flags = [], []
        cells_modis[str(y)] = [cd("modis", y, m) for m in range(1, 13)]
        cells_viirs[str(y)] = [cd("viirs", y, m) for m in range(1, 13)] if y >= 2012 else None
        cells_n20[str(y)] = [cd("n20", y, m) for m in range(1, 13)] if y >= 2018 else None
        for m in range(1, 13):
            if y >= 2012:
                hm.append(cd("viirs", y, m)); flags.append("observed")
            else:
                base = cd("modis", y, m)
                if dt.date(y, m, 1) < AQUA_START.replace(day=1):
                    base *= terra_factor[m - 1]
                hm.append(round(base * (ratio[m - 1] or 0), 1)); flags.append("modelled")
        harmonized[str(y)] = hm
        observed[str(y)] = flags

    # Leave-one-year-out check of the per-month ratio on the overlap.
    loyo = []
    for test in OVERLAP:
        errs = []
        pred_total = true_total = 0
        for m in range(1, 13):
            v = sum(cd("viirs", y, m) for y in OVERLAP if y != test)
            mo = sum(cd("modis", y, m) for y in OVERLAP if y != test)
            r = v / mo if mo else 0
            pred = cd("modis", test, m) * r
            true = cd("viirs", test, m)
            pred_total += pred
            true_total += true
        loyo.append({"year": test, "predicted": round(pred_total), "observed": true_total,
                     "error_pct": round(100 * (pred_total - true_total) / true_total, 1) if true_total else None})
    mape = statistics.mean(abs(x["error_pct"]) for x in loyo if x["error_pct"] is not None)

    summary = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "area": "Romania (FIRMS country files)",
        "grid_deg": GRID,
        "overlap_years": [OVERLAP.start, OVERLAP.stop - 1],
        "monthly_detections": monthly,
        "cells_modis": cells_modis,
        "cells_viirs": cells_viirs,
        "cells_n20": cells_n20,
        "harmonized": harmonized,
        "harmonized_flag": observed,
        "ratio_by_month": [round(r, 2) if r else None for r in ratio],
        "terra_factor_by_month": [round(r, 2) for r in terra_factor],
        "loyo": loyo,
        "loyo_mape_pct": round(mape, 1),
        "static_mask_cells": len(static),
        "modis_removed_by_mask": {str(k): v for k, v in sorted(removed.items())},
        "types": {k: dict(v) for k, v in types.items()},
        "versions": {k: dict(v) for k, v in versions.items()},
        "frp_log10_hist": {k: sorted(v.items()) for k, v in frp_hist.items()},
        "confidence": {k: dict(v) for k, v in conf.items()},
        "daynight": {k: dict(v) for k, v in daynight.items()},
        "weekday_viirs": [weekday["viirs"][i] for i in range(7)],
        "week_of_year_modis": {k: [v[i] for i in range(53)] for k, v in doy.items()},
    }
    with open(os.path.join(OUT, "firms_summary.json"), "w") as f:
        json.dump(summary, f, separators=(",", ":"))

    # Points for the map: [lat, lon, day_of_year, frp, type, sensor]
    for y in POINT_YEARS:
        pts = []
        for key in ("modis", "snpp"):
            for r in data[key].get(y, []):
                d = dt.date.fromisoformat(r["acq_date"])
                pts.append([round(float(r["latitude"]), 3), round(float(r["longitude"]), 3),
                            d.timetuple().tm_yday, round(float(r["frp"] or 0), 1), int(r["type"]),
                            "M" if key == "modis" else "V"])
        with open(os.path.join(OUT, f"points_{y}.json"), "w") as f:
            json.dump(pts, f, separators=(",", ":"))

    sample = {k: data[k][2023][:6] for k in ("modis", "snpp")}
    with open(os.path.join(OUT, "sample_rows.json"), "w") as f:
        json.dump(sample, f, indent=1)

    build_features()
    print("ok; LOYO mean abs error %.1f%%" % mape)


def build_features():
    """Parse docs/feature-catalog.md into features.json."""
    text = open(os.path.join(REPO, "docs", "feature-catalog.md")).read()
    tier = None
    feats = []
    cur = None
    for line in text.splitlines():
        h2 = re.match(r"^## (.+)", line)
        if h2:
            t = h2.group(1)
            tier = ("1" if t.startswith("Tier 1") else "2" if t.startswith("Tier 2") else
                    "3" if t.startswith("Tier 3") else "4" if t.startswith("Tier 4") else
                    "L" if t.startswith("Additions") else None)
            continue
        h3 = re.match(r"^### (\d+)\. (.+)", line)
        if h3 and tier:
            cur = {"id": int(h3.group(1)), "name": h3.group(2), "tier": tier}
            feats.append(cur)
            continue
        f = re.match(r"^- \*\*(What|Data|Effort|Scores on|Promote):\*\* ?(.*)", line)
        if f and cur is not None:
            cur[f.group(1).lower().replace(" ", "_")] = f.group(2)
        elif cur is not None and line.startswith("  ") and line.strip():
            last = list(cur.keys())[-1]
            if isinstance(cur[last], str):
                cur[last] += " " + line.strip()
    for x in feats:
        e = x.get("effort", "")
        x["effort_code"] = re.match(r"([SML](?:-[SML])?)", e).group(1) if re.match(r"[SML]", e) else ""
        so = x.get("scores_on", "")
        x["criteria"] = [c for c in ("Impact", "Creativity", "Validity", "Relevance", "Presentation") if c in so]
        x["award"] = re.findall(r"Awards?: ([^.]+)", so)
    with open(os.path.join(OUT, "features.json"), "w") as f:
        json.dump(feats, f, indent=1)
    print(len(feats), "features")


if __name__ == "__main__":
    main()
