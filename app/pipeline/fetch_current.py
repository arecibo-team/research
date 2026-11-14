#!/usr/bin/env python3
"""Fetch the current year's FIRMS hotspots for Romania through the FIRMS area API.

Drafted with an AI assistant (Claude). Standard library only.
The per-country archives stop at the last complete year, so the current year needs the API and a free
MAP_KEY (https://firms.modaps.eosdis.nasa.gov/api/map_key/).

    FIRMS_MAP_KEY=xxxx python3 app/pipeline/fetch_current.py --raw /tmp/firms-ro --counties /tmp/ro_adm1.geojson
    python3 app/pipeline/build.py --raw /tmp/firms-ro --counties /tmp/ro_adm1.geojson

It writes modis_<year>.csv, snpp_<year>.csv and n20_<year>.csv into --raw in the same layout as the country
files, keeping only points inside Romania. Standard-processing (SP) data is used where available and
near-real-time (NRT) data after that. NRT files have no "type" column; build.py then relies on the
static-source mask built from the archives.

Untested against the live API at the time of writing (no key available); check the printed counts.
"""
import argparse
import csv
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import load_counties, point_in_polys  # noqa: E402

API = "https://firms.modaps.eosdis.nasa.gov/api"
BBOX = "20.2,43.6,29.8,48.3"
PRODUCTS = {"modis": ("MODIS_SP", "MODIS_NRT"), "snpp": ("VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"),
            "n20": ("VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT")}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "firms-calendar-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode()


def availability(key):
    out = {}
    for row in csv.DictReader(io.StringIO(get(f"{API}/data_availability/csv/{key}/ALL"))):
        out[row["data_id"]] = (row["min_date"], row["max_date"])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--counties", required=True)
    ap.add_argument("--year", type=int, default=dt.date.today().year)
    ap.add_argument("--key", default=os.environ.get("FIRMS_MAP_KEY"))
    a = ap.parse_args()
    if not a.key:
        sys.exit("Set FIRMS_MAP_KEY or pass --key")
    counties = load_counties(a.counties)
    avail = availability(a.key)
    print("availability:", {k: v for k, v in avail.items() if any(k in p for p in sum(PRODUCTS.values(), ()))})
    start, today = dt.date(a.year, 1, 1), dt.date.today()

    for name, (sp, nrt) in PRODUCTS.items():
        sp_max = dt.date.fromisoformat(avail[sp][1]) if sp in avail else start - dt.timedelta(days=1)
        rows, header = [], None
        d = start
        while d <= today:
            src = sp if d <= sp_max else nrt
            url = f"{API}/area/csv/{a.key}/{src}/{BBOX}/5/{d.isoformat()}"
            try:
                text = get(url)
            except Exception as e:
                print("failed", src, d, e); d += dt.timedelta(days=5); continue
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                if not r.get("latitude"):
                    continue
                lat, lon = float(r["latitude"]), float(r["longitude"])
                if not any(point_in_polys(lon, lat, c["polys"]) for c in counties
                           if c["bbox"][0] <= lon <= c["bbox"][2] and c["bbox"][1] <= lat <= c["bbox"][3]):
                    continue
                if r["acq_date"][:4] != str(a.year):
                    continue
                rows.append(r)
            header = header or reader.fieldnames
            d += dt.timedelta(days=5)
            time.sleep(0.3)
        if not rows:
            print(name, "no rows"); continue
        path = os.path.join(a.raw, f"{name}_{a.year}.csv")
        with open(path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header)
            w.writeheader(); w.writerows(rows)
        print(name, len(rows), "rows ->", path, "last date", max(r["acq_date"] for r in rows))


if __name__ == "__main__":
    main()
