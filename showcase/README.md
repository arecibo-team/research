# Research showcase

A static website that presents everything in this repo and lets the team make decisions.
No build step: plain HTML, CSS and JavaScript, with libraries from CDNs.

## Run it

From the **repo root** (the library tab reads `../docs/*.md`):

```sh
python3 -m http.server 8000
# open http://localhost:8000/showcase/
```

Opening `index.html` as a file does not work, because browsers block `fetch` from `file://`.
On GitHub Pages, publish the repo root and the site lives at `/showcase/`.

## Sections

| Tab | What it shows |
|---|---|
| Overview | Key numbers, the 2012 "cliff" chart, findings, decision progress, judging criteria |
| FIRMS data | Real FIRMS records for Romania: raw rows, map of every hotspot, burning calendar, prototype harmonization and its error, FRP, season shift, weekday pattern, record types |
| Data sources | 22 sources with status, data shape and real previews over Romania (NASA GIBS snapshots on a map with opacity control) |
| Features | The 37 features from `docs/feature-catalog.md`: mark Build / Maybe / Skip, assign owners, capacity planner, judging coverage |
| Decisions | Open questions with options; export as `decisions.json`, Markdown or a prefilled GitHub issue |
| Library | Every Markdown document in the repo, rendered |

## How decisions flow (human in the loop)

1. `showcase/decisions.json` in the repo is the shared record. The site loads it as the baseline.
2. Anyone can click through choices; edits are kept in that browser only (localStorage) and the page
   says how many differ from the repo copy.
3. To share: **Download decisions.json** and commit it over `showcase/decisions.json`, or
   **Open as GitHub issue** to discuss first. Feature triage is included in both.

## Data

`scripts/build_data.py` (standard library only) turns the FIRMS per-country CSVs into the JSON in `data/`:

```sh
python3 showcase/scripts/build_data.py --raw /tmp/firms-ro --download
```

It also regenerates `data/features.json` from `docs/feature-catalog.md`, so run it after editing the catalog.
`data/sources.json` is maintained by hand. Previews in `assets/previews/` are snapshots from NASA GIBS WMS
(EPSG:4326, bbox 43.4-48.4 N, 20-30 E).

The harmonization in the site is a **prototype**: per-month VIIRS/MODIS ratio on 0.02 deg fire cell-days,
fitted on 2013-2022, with a Terra-only correction before Aqua (July 2002). It is there to make the
decisions concrete, not the final method.

Built with an AI assistant (Claude) for the team to review.
