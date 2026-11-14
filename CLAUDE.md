# Project memory for AI assistants

This repo holds the research for the team's NASA Space Apps 2026 entry, challenge
**Harmonization of MODIS and VIIRS Hot Spots** (Bucharest local event).

## Read first

- `docs/hackathon-brief.md`: challenge objectives, FIRMS data access, submission rules, judging.
- `docs/project-idea.md`: the current project proposal, harmonization method, features, open questions.
- `docs/data-findings-romania.md`: first numbers from real FIRMS data.
- `Wildfire Data Sources.md`: broad catalog of fire-related datasets (written with prediction in mind).
- `docs/source/`: raw text of the challenge page, submission guide and judging criteria.

## Hard constraints

- **Deadline: Sunday 2026-11-15 23:59 local (Bucharest).** "Submit for Judging" must be clicked.
- Deliverable is a **web application** with a harmonized MODIS + VIIRS burning activity calendar for a
  user-selected area, plus CSV export. A predictor alone does not answer the challenge.
- NASA FIRMS data must be a core component.
- Everything submitted is in English; all links public with no login.
- Demo: video of 30 s or less, or a deck of at most 7 slides.
- AI-generated code and data must be acknowledged in descriptive text and metadata (README, file headers).
- No NASA logos or branding in generated content; no likeness of anyone under 18.
- Judged on Impact, Creativity, Validity, Relevance, Presentation.

## Working notes

- The challenge page is a JS-rendered Next.js site: plain HTML fetchers see an empty page. `curl` the page
  and decode the `self.__next_f.push` payload to read it.
- FIRMS per-country yearly CSVs download without a key (URL pattern in the brief). The FIRMS area API needs
  a MAP_KEY and returns at most 5 days per call.
- Facts marked "to verify" in the brief are from general knowledge, not checked against a source.
- Record decisions in `docs/` as they are made, and update `docs/project-idea.md` when the team settles
  an open question.
