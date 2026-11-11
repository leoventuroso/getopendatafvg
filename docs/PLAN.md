# getopendatafvg: from source wrappers to a verifiable FVG data layer

*Revision 4, 2026-11-09. Approved 2026-11-09. It holds the strategy. ROADMAP.md stays the item-by-item backlog: when a phase starts, its items are copied there and opened as GitHub issues.*

*Marking used throughout: **[verified]** = checked on the cited public page on 2026-11-09. **[assumption]** = not yet checked. **[review]** = taken from your prior-art review and not re-checked by me.*

## Changes in revision 4

These come from the author's answers on 2026-11-09. Where they conflict with the revision 3 changes listed below, these win.

1. **The crosswalk is built, not consumed.**
   - italian-territories is not used as a dependency, because it is a public repo, not an official package. Its approach may inspire the design, and that needs no justification in the paper.
   - Phase 2 goes back to the build path: 2a shrinks to a 2 h check of sources and terms, and 2b is 26 h.
   - The package licence stays MIT only.
2. **Mappa Civica does not use the library yet [verified].**
   - github.com/BeneComune/mappa-civica is public (MIT, last push 2026-11-01). None of its `pipeline/requirements*.txt` files lists getopendatafvg.
   - The pipeline still carries its own `dem_slope.py` and `scene_date.py`, and calls ISTAT through `istatapi`.
   - New core item **M**: migrate Mappa Civica's pipeline to a pinned PyPI release of getopendatafvg. This is what turns it into the research-use evidence JOSS asks for, and it also removes duplicated code.
3. **Single author** for now (was Q3).
4. **`elevation` and `wikipedia` will be deprecated.**
   - The deprecation warning comes in a 0.x release, and removal at 1.0.
   - This is consistent with the check above: Mappa Civica does not call them.
5. **Fraunhofer Italia projects are industrial and cannot be named (was Q1).**
   - They are described only generically, as "industrial projects at Fraunhofer Italia".
   - Mappa Civica, once migrated (item M), is the primary public research-use evidence.
6. **Commits are made only together with you (was Q5).** For each commit, you approve the content in the session before it is created. Claude never pushes.
7. **The case study keeps all four research questions (was Q6).**
   - B is primary; A, C and D are sections.
   - C and D are the first cuts if the schedule slips.
8. **Target August 2027, reviewed as the work proceeds (was Q8).**
9. **Budget.**
   - Core grows to 103 h. This is driven by the build path and item M, not by new scope. The four research questions add 4 h, which brings core to 107 h.
   - To keep the growth down, the `catasto` adapter moves to Optional E and the case study is cut to 4–6 comuni.
   - See the table in §7.

## Changes in revision 3

1. **Phase 2 gains a build-vs-consume evaluation (2a, ~4 h)** before any crosswalk is built. It weighs italian-territories, opensituas and SITUAS. Its output is a decision note in `docs/decisions/`, which also feeds the paper's State of the field.
2. **Preliminary finding from the facts verified for 2a.**
   - italian-territories already covers most of the planned `Comune` record: CC BY 4.0, day-accurate, with Belfiore codes and typed links.
   - Phase 2 is therefore budgeted on the **consume path**, which is the likely outcome. This is an assumption until 2a decides.
   - The project's own contribution narrows to the parts that dataset lacks: harmonising statistical series, NUTS vintages, the link to geometry, and (optionally) partial transfers.
3. **The crosswalk's typed links gain `split` and `partial_transfer`.**
   - `harmonise_series` raises on either one unless the caller supplies explicit weights.
   - A feasibility check asks whether open weights or historical geometries exist.
   - The whole item (2c) is optional and droppable.
4. **New licence rule.** The aggregation method of Bideau & Ysebaert (2022) is reimplemented from the article's description. None of their code or data is copied.
5. **The coverage and interoperability audit becomes core (new Phase 3)**, with a research question.
   - The first pass works at capabilities and schema level.
   - Per-layer probing stays optional and comes after submission.
6. **The case study (Phase 5) is tied to a research question**, following the data paper model (data, method, question). It also evaluates publishing the crosswalk additions on Zenodo with their own DOI.
7. **State of the field is extended (Phase 6)** with the alternatives and references from your review. The CEPR paper is cited only as an unreviewed working paper, and there is a task to look for a published version.
8. **Q1 resolved in part.** You state that the intellectual property is yours. Funding, acknowledgement and conflict-of-interest statements stay as items for you to complete; their content is not assumed.
9. **Budget.**
   - The additions are offset in two ways. Phase 4 builds adapters only for the sources the audit and the case study need; the rest move to Optional E. And 2a's likely consume outcome shrinks Phase 2.
   - Core rises from 93 h to 96 h, and submission moves from June–July to **July 2027**. The full table is in §7.
10. **Phases renumbered.**
    - The audit is the new Phase 3. Area/extract moves to 4, the case study to 5 and the paper to 6.
    - Old Optional A becomes Phase 3, and old Optional B is now B: per-layer probing.

*Unchanged by request:* testing strategy, drift alerts, provenance design, the AI-usage log, the versioning and deprecation policy, the operational rules, the 2–4 h/week budget, and the earliest JOSS date of 2027-03-16. Only the new items' tests have been added to §8.

## Context

getopendatafvg today is a set of well-tested clients, one per upstream source. JOSS's guidelines (read 2026-11-09) exclude "minor utility" packages and "thin" API clients, and require evidence of research use before review.

The plan adds a contribution that goes beyond access:

- **Harmonisation**: identifying a comune consistently across sources and years, and reconstructing its statistical series across mergers.
- **An audit** that measures how far FVG's open data can actually be resolved to a comune.
- **Unified, provenance-tracked extraction**.

Two goals carry equal weight:

- **(a) Lasting utility** in your own projects: the Fraunhofer Italia projects and Mappa Civica.
- **(b) A defensible JOSS paper**, with JORS as the fallback.

Rule: nothing goes in only for reviewers unless it is cheap and also serves (a).

Decisions on record:

- Records plus a GeoParquet export.
- The crosswalk is populated for FVG but its model is ready for all of Italy.
- The v0.1 API stays, with the new API layered on top and a deprecation policy for changes.
- The time budget is 2–4 hours a week.
- All module groups are in real use.
- The intellectual property is the author's, per the author's own statement.
- The crosswalk is built from ISTAT/SITUAS, with no italian-territories dependency, and the licence stays MIT.
- There is a single author.
- Mappa Civica, public at github.com/BeneComune/mappa-civica, will be migrated onto the library.

## 1. Current state

Verified 2026-11-09 unless marked.

**Architecture**
- 20 modules, about 3,100 lines.
- Everything is re-exported flat and eagerly from `__init__.py`, so every dependency (boto3, rasterio, duckdb) is needed just to import the package.

**Return shapes are heterogeneous**
- `list[dict]` from the portal and ISTAT functions.
- GeoJSON dicts from WFS and catasto.
- `(properties, geometry)` tuples.
- Dataclasses.
- Scalars.
- Files on disk.

**Inputs are heterogeneous too**
- ISTAT functions take codes; catasto takes a cadastral code; weather and elevation take a point; Wikipedia takes a title.
- The README's claim that "every function takes a boundary" is therefore not true.
- No function turns a comune into a geometry.

**Identifiers**
- ISTAT SDMX uses the pre-2013 NUTS vintage (`istat.FVG_NUTS_AREAS`, ITD4).
- `UNITA_AMM:COMUNI_FVG` has 215 features with `COD_ISTAT`, `COD_CATASTALE` and `NOME`.
- Dataflow 122_54 has data for 225 FVG comuni, 10 more than exist today.

**Catalog**
- 94 hand-curated entries, re-verified weekly by `live.yml`. That job does not open issues.
- The upstream pool is about 1,150 WFS layers and about 850 portal assets, with no machine-readable index.

**Tests**
- 155 offline tests built on hand-made mocks, not recorded fixtures.
- Opt-in live tests.
- 97% branch coverage, with a `fail_under = 95` ratchet.
- CI on Python 3.11–3.13.
- `istat._throttle` enforces ISTAT's rate limit per process.

**Release state**
- v0.1.0 is the only tag. The package is not on PyPI, and the name is free.
- There is no CITATION.cff, CHANGELOG, CoC or docs site.
- 0 GitHub issues have ever been filed.
- Commits come from 3 author identities.
- The library starts at `f301ad1` (2026-09-15). Since then: 44 commits in September, 4 in October and 1 in November.

## 2. External constraints (read 2026-11-09)

**JOSS submission and review criteria**
- More than 6 months public, with active development across that period. Counting conservatively, the earliest date is **2027-03-16**. JOSS runs automated checks on commit distribution.
- Evidence of research use must be shown to editors before review. "Aspirational statements about future use are not sufficient."
- Single-author projects need several signals together: releases or a changelog, CONTRIBUTING, tests and CI, docs, and support expectations.
- The API must be documented.
- The paper runs 750–1,750 words. Required sections: Summary, Statement of need, State of the field (including **build-vs-contribute**), Software design, Research impact, AI disclosure, funding and conflict of interest.

**JOSS AI policy** (joss.theoj.org/about, and the blog post of 2026-01-05)
- AI is allowed for code, docs and paper text.
- The disclosure must state:
  - the tools, models and versions used, and where each was used;
  - the nature and scope of the use;
  - that the human authors "reviewed, edited, validated all AI-assisted outputs and made the core design decisions".
- No AI in conversations with editors or reviewers, except for translation.
- Incomplete disclosure "may be considered an ethical breach".
- Recent histories built by "rapid AI-assisted code generation" get extra scrutiny.

## 3. What this means for you on AI disclosure (unchanged)

1. The paper's AI section needs model versions. Commits carry no AI trailer, so keep a dated log in CONTRIBUTING.md (period, tool, model ID, use), and reconstruct the past honestly.
2. Name where AI was used and how, for each of: code, tests, docs, ROADMAP notes and paper text.
3. The "core design decisions" confirmation must be true. Check which of the decisions recorded in ROADMAP were yours.
4. Write the JOSS review-thread replies yourself. AI may only translate them.
5. The defence against the September burst is a steady cadence from now on. Rewrite nothing in history.

## 4. Project identity: core, extras, frozen

All modules are in real use, so nothing is dropped. The paper's claims cover only the core.

| Tier | Modules | Why |
|---|---|---|
| **Core**: the FVG data layer | `territory` (new), `audit` (new), `model`/`extract` (new), `catalog`, `wfs`, `open_data_fvg`, `istat`, `catasto`, `avalanche`, `overpass` | Area-based, harmonised, auditable access to FVG sources |
| **Extra `[eo]`**: maintained | `sentinel2`, `landsat`, `scene_date`, `indices`, `vectorize` | Used in your projects, but generic and dependency-heavy |
| **Extra `[utils]`**: frozen | `dem`, `coverage`, `pmtiles`, `viz`, `weather`, `elevation`, `wikipedia` | Used by Mappa Civica, but not FVG-specific |

The README is reordered: core first, utilities after.

**`elevation` and `wikipedia` are deprecated.** They get `DeprecationWarning` in the next 0.x release and are removed at 1.0, following §5. Mappa Civica does not call either one **[verified via its requirements and code search]**.

## 5. Versioning and deprecation (unchanged)

- **SemVer:** 0.x until submission, then 1.0.
- **Public API:** exactly `__all__`, guarded by an API-snapshot test.
- **Deprecation:** a deprecated name keeps working for at least one minor release and at least two months. It emits `DeprecationWarning`, appears under "Deprecated" in CHANGELOG, and has a test asserting the warning.
- **Optional dependency split:**
  - 0.x: add extras and lazy imports, while core still installs everything.
  - 1.0: drop boto3 and rasterio from core. A missing extra raises an `ImportError` naming the extra to install.
- **Bundled third-party data**, if any, keeps its own licence. See 2a.

## 6. Operational rules (unchanged)

- **No live or network calls to data sources without your go-ahead**, and each request states its expected request count.
  - ISTAT: at most 4 requests per minute, with a stated budget per session.
  - Reading public documentation pages is allowed.
- **No credentials in files.** Cassettes are scrubbed, and a test greps them for credential patterns.
- **Commits are made only together with you.** For each commit, you approve the content in the session before Claude creates it. Claude never pushes.

## 7. Phases and budget

At 2–4 hours per week, about 13 hours per month. Each phase ends with a tag and a CHANGELOG entry.

| Phase | Rev 2 | Rev 3 | **Rev 4** | Window | Status / reason |
|---|---|---|---|---|---|
| 0 Release hygiene | 8 h | 8 h | **8 h** | Nov–Dec 2026 | core, unchanged |
| 1 Drift alerts and recorded fixtures | 8 h | 8 h | **8 h** | Dec 2026 | core, unchanged |
| M Migrate Mappa Civica onto the library | — | — | **6 h** | Jan 2027, after the first PyPI release | **core, new**: the research-use evidence for JOSS gate 2; removes duplicated code from Mappa Civica |
| 2 Territorial crosswalk | 30 h | 22 h | **28 h** | Jan–Mar 2027 | core. 2a sources and terms check 2 h + 2b build 26 h (no italian-territories) |
| 2c Splits and partial transfers with weights | — | 8 h | **8 h** | after 2b | optional, droppable |
| 3 Coverage and interoperability audit | 8 h (opt.) | 14 h | **14 h** | Apr 2027 | core |
| 4 Area, records, provenance, `extract` | 25 h | 18 h | **15 h** | Apr–May 2027 | core. Adapters for `wfs`, `open_data_fvg`, `istat` only; `catasto` moves to E |
| 5 Case study, research questions A–D | 12 h | 14 h | **16 h** | Jun–Jul 2027 | core. 4–6 comuni; C and D (+2 h each) are cut first if the schedule slips |
| 6 Paper and submission | 10 h | 12 h | **12 h** | Jul–Aug 2027 | core |
| B Per-layer probing | 15 h | 15 h | **15 h** | after submission | optional |
| C `[eo]`/`[utils]` extras and lazy imports | 5 h | 5 h | **5 h** | slack | optional |
| D Docs beyond the API reference | 6 h | 6 h | **6 h** | slack | optional |
| E Remaining adapters (`catasto`, `overpass`, `avalanche`, `[eo]`, `[utils]`) | — | 7 h | **9 h** | slack | optional |
| F Publish the crosswalk on Zenodo | — | 2 h | **2 h** | after Phase 5 | optional |

**Totals:** core is 93 h in rev 2, 96 h in rev 3 and **107 h** in rev 4. Without the C and D sections it would be 103 h.

- The +7 h over rev 3 comes from two decisions, not from new features: building the crosswalk yourself (+6 h after the 2a saving) and migrating Mappa Civica (+6 h). The cuts in Phase 4 (−3 h) and Phase 5 (−2 h) offset part of it.
- At about 13 h a month, submission is realistically **August 2027**, accepted and to be reviewed as the work proceeds. The earliest permitted date is still 2027-03-16.
- If that is too late, the next item to demote is Phase 4 as a whole: −15 h, back to about July. The paper's contribution would then rest on harmonisation and the audit alone.

### Phase 0: release hygiene → v0.1.1 (unchanged)
- **Work:**
  - PyPI via trusted publishing.
  - `CITATION.cff`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, issue templates.
  - `.mailmap`.
  - Zenodo integration.
  - A minimal mkdocs plus mkdocstrings API reference.
  - The AI-usage log.
  - `docs/upstream-defects.md` with a `quirk` pytest marker.
  - The API-snapshot test.
- **Done when:** the CI matrix, coverage ratchet, API snapshot and docs build all pass. *Manual:* a fresh-environment PyPI install works, and the DOI resolves.
- **Also, you complete before PyPI and Zenodo:** the funding and acknowledgement statements, and the conflict-of-interest statement. Their content is not assumed here.

### Phase 1: drift alerts and recorded fixtures → v0.1.2 (unchanged)
- **Work:**
  - `live.yml` opens or updates one issue per failing entry.
  - Per-entry fingerprints in `tests/snapshots/`: schema hash, row-count threshold, maximum date, geometry-column fill ratio.
  - pytest-recording with cassette scrubbing and the credential-grep test.
- **Done when:** the fingerprint-diff tests and the credential grep pass. A dry run against a tampered snapshot opens exactly one issue; this needs your go-ahead.

### Item M: migrate Mappa Civica onto the library (core, new, 6 h)

The work happens in `BeneComune/mappa-civica`, after getopendatafvg's first PyPI release.

- Pin `getopendatafvg==0.1.x` in `pipeline/requirements*.txt`.
- Replace `pipeline/lib/dem_slope.py` and `pipeline/lib/scene_date.py` with the library's `dem` and `scene_date`.
- Replace the scripts' own WFS, catasto and Sentinel-2 code with library calls where they are equivalent. **[assumption]** The scripts duplicate library functions; verify script by script.
- Keep `istatapi` where the library has no equivalent dataflow.
- Mappa Civica's own tests and CI must still pass.
- **Not automatable:** that the outputs are equivalent. Diff the generated GeoJSON before and after for one comune.
- **This is the research-use evidence:** a public project, pinned to a released version, in production. You do the commits there.

### Phase 2: territorial crosswalk → v0.2.0

**Decision (2026-11-09):** the crosswalk is built from ISTAT/SITUAS. italian-territories is not a dependency (it is a public repo, not an official package). How it structures its links (`merged_into`/`split_into`/`detached_into`, day-accurate validity) may inspire this design; the paper does not need to justify that.

**2a. Sources and terms check (2 h)**

Record which ISTAT/SITUAS files are used (official comune list and the territorial-changes archive), their format and their terms of use **[assumption: CC BY; verify]**, in `docs/decisions/0001-crosswalk-sources.md`.

*The material below is kept from revision 3 for reference. Its "likely outcome: consume" is superseded by the decision above.*

The deliverable is `docs/decisions/0001-crosswalk-build-vs-consume.md`. It covers:
- licences and attribution;
- schema fit with the `Comune` record;
- update cadence;
- runtime model: pinned and bundled, or downloaded and cached;
- what to contribute upstream and what to keep.

Facts gathered so far:

| Candidate | What was verified on 2026-11-09 | Fit |
|---|---|---|
| **italian-territories** (andreacolzani) **[verified]** | Data **CC BY 4.0**, generator **MIT**. Required attribution: "italian-territories, elaboration of ISTAT – SITUAS data". Day-accurate from 1861-03-17 to today. JSON files with JSON Schemas, also on npm. `predecessors`/`successors` with kinds `merged_into`, `split_into`, `detached_into`. Includes `cadastral_code` (Belfiore). States "Partial cessions are not represented". No geometries, no statistical series, no NUTS. Checks ISTAT weekly and releases on change. Data last changed 2026-10-07. | Covers the identity and history part of `Comune`. Missing: NUTS vintages, geometry link, partial transfers, any harmonisation of series. |
| **opensituas** (ondata) **[verified]** | **MIT**. A Python CLI over the live SITUAS endpoints, installed with `uv tool install opensituas`. Report 129 lists administrative and territorial changes since 1991; report 99 maps codes between two dates; report 298 compares two dates; `storia comune` gives one comune's history. | A live client, not a pinned dataset. Best used as **independent ground truth** for known-answer tests, run once with your go-ahead. |
| **SITUAS** (ISTAT) | The upstream source of both. Its terms of use are an **[assumption]**; record them in the note. | Build-path source only. |

- **Likely outcome [assumption until 2a]:** consume italian-territories, pinned to a release and checked against a checksum.
  - Its licence is CC BY 4.0, not MIT. If the data is bundled in the wheel, it carries its own licence notice and the package licence metadata says so (e.g. `MIT AND CC-BY-4.0`). Otherwise it is downloaded on first use and cached. The note decides which.
- **Upstream contributions to consider:** NUTS vintages and partial cessions, if they belong there and not here.

**2b. Crosswalk and harmonisation (26 h, build path)**
- `scripts/build_territory.py` produces a versioned `data/territory_fvg.csv` (MIT, with ISTAT attribution) from the 2a sources.
- `territory.py` builds the `Comune` record from that table plus:
  - `COMUNI_FVG` for current codes and geometry;
  - `nuts_code(area, vintage=...)`, generalising `FVG_NUTS_AREAS`.
- `resolve_comune(identifier, at=date)` accepts an ISTAT code, cadastral code or name.
- `harmonise_series(rows, code_field, to=date, how=...)` implements the aggregation rules of **Bideau & Ysebaert (2022)**, reimplemented from the article's text **[verified on the article page]**:
  - stock variables are summed;
  - ratio variables are weighted by the declared denominator (population, households, etc.), or recomputed from their stocks;
  - text values are concatenated when they differ.
- **Licence rule:** their code and data are **CC BY-NC-SA 4.0** **[assumption: from a page summary, not the verbatim licence text]**. Whatever the exact licence, no code or data is copied into the MIT library. The docstrings cite the article as the source of the method.
- Typed links: `merger`, `incorporation`, `inter_region_transfer`, `rename`, `split`, `partial_transfer`. **`harmonise_series` raises on `split` and `partial_transfer` unless explicit weights are passed.**
- Existing ISTAT functions gain an optional `harmonise_to=`.
- **Scope:** every comune code in the ISTAT dataflows the library wraps must resolve. This is checked with about 9 `availableconstraint` requests, with your go-ahead.

**2c. Splits and partial transfers with weights (8 h, optional, droppable)**
- **Feasibility check first [assumption]:** are there open sources of transfer weights (population or area of the transferred part) or historical boundaries?
  - italian-territories explicitly lacks partial cessions **[verified]**.
- If no open source exists, the item is dropped. 2b still raises without weights, so the rest of Phase 2 is unaffected.

### Phase 3: coverage and interoperability audit → v0.2.1 (core, new)

**Research question.** Of the open datasets published for FVG, how many can actually be resolved to a comune, through which identifiers, and at what minimum granularity?

Granularity classes:
- point or sub-comunal geometry;
- comune polygon;
- comune code only;
- province or NUTS3;
- region;
- none or unknown.

**First pass: capabilities and schema level.** Every step needs your go-ahead, and each states its request count.

| Step | Requests (estimate) | Note |
|---|---|---|
| Regional GeoServer GetCapabilities | 1 | One service. A per-workspace fallback would be about 52 requests. **[assumption]** No other FVG WFS services are in scope; to be listed in the note. |
| WFS DescribeFeatureType for attribute names | 1 global, or about 52 per workspace | **[assumption]** GeoServer answers a DescribeFeatureType without `typeName` with every schema. |
| Portal discovery `/api/catalog/v1`, paginated | about 9 (limit 100, about 850 assets) | **[assumption]** The results carry column names and types, update time and licence. If they do not, the per-asset `/api/views` calls (about 850) move to Optional B. |

- **Method:**
  - Detect identifier columns (ISTAT code, cadastral code, comune name, NUTS) by name and type patterns.
  - Check candidate code formats against the Phase 2 crosswalk.
  - Assign the minimum granularity, by geometry type or by identifier.
- **Validation (external ground truth):**
  - A hand-labelled random sample of 50 datasets.
  - Precision and recall of the classifier are reported alongside the results.
- **Deliverables:**
  - `audit.py` plus `scripts/run_audit.py`.
  - A dated index file.
  - `docs/coverage.md` with the tiers (reachable, boundary-filterable, curated and verified, harmonised to comune) and the granularity distribution.
  - The headline numbers go into the paper.
- **Optional B (after submission):** per-layer probing, i.e. sample features to check value formats and geometry fill.

### Phase 4: Area, records, provenance, extract → v0.3.0
- **Model:** `Area.from_comune`/`from_geometry`/`from_bbox`, `Records` and `Provenance`. Same design as the previous draft: source, endpoint, identifier, parameters, `retrieved_at`, upstream last-modified time, licence, SHA-256 and library version.
- **Output:** `extract(area, sources=..., out_dir=...)` writes Parquet or GeoParquet (the `[io]` extra) plus `manifest.json`.
- **Adapters in core:** `wfs`, `open_data_fvg`, `istat`, `catasto`, which are the ones the audit and the case study use. The rest are Optional E.
- `KnownDataset` gains a `licence` field. **[assumption]** The GeoServer licence must be confirmed with the region.

### Phase 5: case study with a research question → v0.4.0
- **Research questions** (decided 2026-11-09; B is primary, the others are sections):
  - **B (primary):** how much of FVG's open data can actually be assembled for a single comune, and how does that vary across comune types (city, mountain, merged, small)? Uses the Phase 3 audit plus `extract`.
  - **A:** how much do municipal series change when reconstructed across mergers? For each merged comune and for the region: how far do naive series (codes taken as published) diverge from series harmonised to today's boundaries? Uses the 2b crosswalk.
  - **C (cut first if behind):** how current and how stable are FVG open data over the observation period? Covers stalled series, schema changes, and columns that empty out. Uses the drift fingerprints that Phase 1 accumulates from December 2026 onwards.
  - **D (cut first if behind):** how many silently wrong results does naive direct access produce? Examples: the NUTS vintage, the tourism row (21,334 against 2.9M), filter versus dataset assets, the empty ozone `geocoded_column`. Uses the upstream-defects registry from Phase 0.
- **Structure:** follows the data paper model of data, method and question:
  - data: the audit plus ISTAT series;
  - method: the 2b harmonisation;
  - question: as above.
- **Variables:** ISTAT population (22_289) and tourism capacity (122_54). **[assumption]** Their year coverage reaches back before the FVG mergers in scope; check with `availableconstraint`, with your go-ahead.
- `examples/case_study.py` runs over 6–8 contrasting comuni, including merged ones and Sappada.
  - It writes its figures to a JSON file.
  - Its offline mode runs in CI as a regression test.
- **Research-use statements:**
  - Mappa Civica is the primary statement: public, and pinned to a release after item M.
  - The Fraunhofer Italia projects get a generic statement only ("industrial projects"). They cannot be named.
- **Zenodo evaluation (in core, about 1 h):** is a separate crosswalk dataset worth its own DOI?
  - On the consume path, only the project's additions would be original: NUTS vintages, the geometry link, and partial transfers if 2c succeeds.
  - Publishing them is Optional F.

### Phase 6: paper and submission → v1.0.0
- **Rewrite paper.md** around harmonisation, the audit and provenance (750–1,750 words). It includes:
  - the completed AI disclosure;
  - the funding, acknowledgement and conflict-of-interest statements you supply;
  - a build-vs-contribute paragraph drawn from decision note 0001.
- **State of the field.** Each item is verified before it is cited:
  - Already listed: OWSLib, sodapy, istatapi. **[assumption]** Their current status.
  - **opensituas [verified, MIT]** and **italian-territories [verified, CC BY 4.0 / MIT]**.
  - **opensdmx [review]**, **pynsee (INSEE) [review]**, **geobr (Brazil) [review]**.
  - **COGugaison [verified: R package, code GPL-3, data ODbL/DbCL]**. Cited as the closest analogue for French official geographic codes; no code reuse.
  - **GeoWeb Crawler** (Huang & Chang, 2016, *ISPRS IJGI* 5(8):136) for discovery based on GetCapabilities. **[assumption]** The MDPI page refused automated access (403), so the citation details are unconfirmed. Verify through the DOI or an index.
  - **Bideau & Ysebaert (2022)**, *Cybergeo*, data paper 1027, doi:10.4000/cybergeo.39387. **[verified]** Cited as the source of the aggregation method.
  - **Buonanno et al., CEPR Discussion Paper 20714 (2025)** **[review]**. Cited only as a non-peer-reviewed working paper whose full text was not read.
    - **Task:** check whether a published version or an open-source companion tool exists.
    - Nothing in the method or the claims relies on it.
- **Before submitting:** confirm there is no commit gap longer than about 3 weeks since September 2026.

## 8. Testing strategy

Unchanged; the new items' tests are added below.

**Principle:** external ground truth first, internal consistency second.

**Two kinds of test**
- Offline tests use VCR cassettes, are deterministic, and run on every push across 3.11–3.13 with the coverage ratchet.
- Live tests are opt-in through `GETOPENDATAFVG_LIVE`, scheduled and throttled. ISTAT live tests run monthly with a fixed request budget.

**Crosswalk (Phase 2)**
- **Known-answer tests:** every FVG event in scope is checked by hand against ISTAT's official list of changes. New: they are cross-checked against opensituas report 129, run once with your go-ahead, with the output stored as a dated fixture.
- **Invariants:**
  - validity intervals do not overlap;
  - no cycles and no orphans;
  - the current set is exactly 215;
  - the regional total is unchanged by harmonisation;
  - a merger equals the sum of its predecessors for stock variables.
- **New, aggregation rules:**
  - a ratio weighted by its declared denominator equals the ratio recomputed from summed stocks;
  - differing text values are concatenated, identical ones are kept once;
  - **`split` and `partial_transfer` raise without weights**;
  - calling a non-additive variable without a rule raises.
- **Property tests:** hypothesis on synthetic merger graphs.
- **Round-trips:** ISTAT code ↔ cadastral code, name ↔ code (including bilingual names). No duplicates in any vintage.
- **New, build path:** `scripts/build_territory.py` is deterministic: the same input files give a byte-identical CSV, checked by a golden-file test. A test asserts the ISTAT attribution is present wherever the table ships.
- **Live tests:**
  - `COMUNI_FVG` matches the current set;
  - every ISTAT dataflow code resolves (about 9 requests);
  - harmonising 122_54 gives the FVG total.
- Sources without comune granularity are listed explicitly, and tests check they stay at their stated level.
- **Not automatable:**
  - the first hand-verification of each event;
  - aggregation-rule choices per indicator;
  - **that no third-party CC BY-NC-SA or GPL code was copied**, which is a reviewer judgement backed by the docstring citations.

**Audit (Phase 3, new)**
- Classifier unit tests on fixture schemas, covering each granularity class and each identifier pattern.
- Golden-file test of `docs/coverage.md` built from a recorded index.
- Consistency checks:
  - the tier and granularity counts add up to the indexed total;
  - curated entries are a subset of the reachable ones;
  - every catalog entry appears in the index.
- **Validation against ground truth:** precision and recall on the hand-labelled sample of 50, with a floor that fails the build if it is breached.
- **Not automatable:** the hand labels themselves.

**Unified interface (Phase 4)**
- Adapter contract tests: valid `Records`; a provenance that passes schema validation; a licence that is non-empty or `unknown`.
- Determinism: replaying a cassette gives the same SHA-256, the manifest survives a round-trip, and two runs on cached data give identical manifests apart from `retrieved_at`.
- Live test: two runs on Udine match or flag the upstream change (with your go-ahead).

**Drift (Phase 1)**
- Fingerprint diff tests: a schema change, a fall in fill ratio or a stalled maximum date each alert; small row growth does not.
- One issue per failing entry.
- Credential grep over the cassettes.

**Case study (Phase 5)**
- Runs offline in CI from cassettes.
- Asserts its reconciliation figures: harmonised regional total equals the naive regional total, and per-merger divergences are reported.
- Live on demand.

**Always:** CI on 3.11–3.13, `fail_under = 95`, ruff, and the API snapshot.

### Done criteria by phase

| Phase | Must pass | Not automatable |
|---|---|---|
| 0 | CI matrix, ratchet, API snapshot, docs build | PyPI install in a fresh environment; DOI; your funding and COI statements |
| 1 | Fingerprint-diff tests, cassette credential grep | Dry-run issue creation (go-ahead) |
| M | Mappa Civica's own CI green on the pinned release | Output equivalence (GeoJSON diff, by hand) |
| 2a | — (sources note reviewed by you) | Terms of use of the ISTAT files |
| 2b | Known-answer, invariant, aggregation-rule, property and round-trip tests; golden-file build; attribution; the 3 live tests | Event verification by hand; rule choices; no copied NC-SA or GPL code |
| 2c | Weighted split and transfer tests, if kept | The feasibility verdict |
| 3 | Classifier tests, golden file, consistency checks, precision/recall floor | Hand labels for the sample of 50 |
| 4 | Contract and determinism tests; v0.1 suite green | GeoServer licence confirmation |
| 5 | Case study offline in CI; live run reproduces the figures | Use statements; permission to name the projects |
| 6 | JOSS paper build; word count in range | Paper quality; truth of the AI confirmation; CEPR status check |

## 9. Publication readiness

| Item | Phase | Today |
|---|---|---|
| PyPI | 0 | missing (name free) |
| CITATION.cff, CHANGELOG, CoC | 0 | missing |
| Zenodo DOI (software) | 0 | missing |
| Zenodo DOI (crosswalk additions) | 5 evaluation; F optional | — |
| API docs | 0 | README only |
| Public issues | 0–1 | 0 ever |
| `.mailmap` | 0 | 3 identities |
| AI usage log with versions | 0 | no versions |
| Funding, acknowledgement, COI statements | 0, by you | not written |
| Build-vs-contribute note | 2a | — |
| paper.md rewrite | 6 | "wrapper" framing |
| Research-use statements | 5 | not written |
| External users | ongoing | none |

**Finding external users:**
- Fraunhofer colleagues.
- The University of Udine and the University of Trieste.
- OGS, ARPA FVG and the regional open-data office.
- The onData community. opensituas is theirs, so a cross-reference or upstream contribution is a natural contact.
- The italian-territories maintainer, if the NUTS or partial-cession additions belong upstream.
- PyCon Italia or FOSS4G-IT.

## 10. What not to do

- No new upstream sources until Phase 4 ships, beyond ROADMAP's ARPA items.
- No all-Italy crosswalk population.
- **No dependency on italian-territories**, and no copying of its data. Taking inspiration from its design is fine.
- **No copying of code or data from CC BY-NC-SA or GPL sources**: Bideau & Ysebaert, COGugaison.
- **Nothing in the paper that rests on the CEPR working paper.**
- No per-layer probing before submission.
- No derived ratings, no web UI, no breaking changes outside the policy, no vendored upstream data beyond what is licensed and attributed, and no chasing a coverage percentage.
- No commit bursts or padding commits, no unshowable impact claims, and no AI-written review-thread replies.

## 11. Open questions

- **Q1 (updated).** The intellectual property is the author's, per your statement.
  - Still to be completed by you before PyPI, Zenodo and the paper: the funding and acknowledgement statements, and the conflict-of-interest statement.
  - Can the Fraunhofer Italia projects be named or described to editors?
No questions are open right now.

*Resolved on 2026-11-09:*
- **Q1:** the Fraunhofer projects are industrial and cannot be named; they get a generic statement only. Funding, acknowledgement and conflict-of-interest statements are still yours to write.
- **Q5:** commits are made only together with you, after you approve the content. Claude never pushes.
- **Q6:** all four research questions are kept, with B primary.
- **Q8:** August 2027 is accepted and will be reviewed as the work proceeds.
- **Q2:** Mappa Civica is public. Migrating it onto the library is item M.
- **Q3:** single author.
- **Q4:** deprecate `elevation` and `wikipedia`.
- **Q7:** no italian-territories dependency, and the licence stays MIT.
