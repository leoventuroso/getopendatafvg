# Roadmap

Working backlog for getopendatafvg - what's next, in rough priority
order. Check this at the start of each work session; pick one item, do
it properly (real code, real tests, live-verified against the actual
source), commit, check it off.

## Catalog

- [x] `fetch_known_dataset(entry, boundary=None, **kwargs)` - dispatch a
      `KnownDataset` to `fetch_wfs_features`/`fetch_and_clip_wfs_features`
      or `fetch_open_data_fvg` automatically, instead of the caller
      branching on `entry.source` themselves. Done 2026-09-16, 8 tests,
      live-verified against both sources.
- [x] Record each Socrata entry's geometry column name in `KnownDataset`,
      so `fetch_known_dataset` can boundary-filter portal datasets too
      instead of raising. Done 2026-09-23, 5 tests plus a live one.
      Checked all 7 portal entries against their schemas: only Piste
      ciclabili has a geometry column (`the_geom`, MultiLineString;
      within_box narrows 486 rows to 75 around Udine). Parafarmacie looks
      like it should have one but stores `latitudine`/`longitudine` as
      *text* with a comma decimal separator, so SODA can't filter on it
      at all - it stays unfilterable, and a boundary on it still raises.
      The other five are plain tables. Re-check when portal entries are
      added: the live test only covers entries that record a column, so
      a new geometry dataset added without one fails silently.
- [x] Expand `CATALOG` beyond the initial 43 entries. Done 2026-09-29:
      the 32 WFS candidates live-verified on 2026-09-24 are now written
      as entries, taking the catalog from 43 to 75. All 75 pass
      `GETOPENDATAFVG_LIVE=1 pytest tests/test_catalog_live.py`.
      Descriptions were written against each layer's upstream abstract,
      and against sample features for the three whose abstract is empty
      (`SITI_PROT:ARIA_BUR`, `PPR:v_beni_culturali`,
      `GEST_FOR:PIANI_GEST_FORESTALE`).

      One thing the candidate list had wrong, caught only by reading the
      data: `SITI_PROT:ARIA_BUR`/`ARIA_PRGC` were filed under
      "zonizzazione qualita' aria". They are nothing to do with air
      quality - ARIA is *Aree di Rilevante Interesse Ambientale*, which
      is why they sit in the SITI_PROT workspace. Filed under `natura`,
      and the entry for ARIA_BUR says so explicitly so the next reader
      does not repeat the guess. ARIA_BUR is the 15 founding perimeters
      (DGR/DPGR); ARIA_PRGC is the same areas as taken up into comune
      master plans, one row per comune, hence 27 rows for 15 areas.

      New category `paesaggio e beni culturali` for the four cultural
      PPR layers (siti UNESCO, beni culturali, centuriazioni, zone di
      interesse archeologico), which fit neither `natura` nor
      `geologia e turismo`.

      The two misleading layers found on 2026-09-24 got descriptions
      that contradict their own names on purpose: `RIFIUTI:GESTORI_RSU`
      says "poligoni comunali, non sedi dei gestori", and
      `CER:BIOENERGIE_FVG` says the same about plant locations and notes
      that only 70 of 215 comuni have one.

  - [x] Socrata candidates. Verified and added 2026-09-29, taking the
        catalog from 75 to 84. All 84 pass the live suite. None of the
        nine has a geometry column, so none gained one - they are all
        plain time series or tallies.

        Added: "Elezioni comunali 2025 - Voti Liste" (`fxix-6uwx`, which
        completes the trio), "Borse di studio universitarie FVG"
        (`9hfe-iy3n`) and "Bonus psicologo studenti FVG" (`ich8-2ddc`)
        under a new `istruzione` category, plus six Comune di Udine
        series under `popolazione`: movimento naturale, movimento
        migratorio, matrimoni, famiglie anagrafiche, popolazione
        straniera per cittadinanza, indicatori della struttura
        demografica.

        Deliberately left out: popolazione anziana, incidenza residenti
        anziani, indicatori della dinamica naturale/migratoria, and
        popolazione straniera by genere and by classi d'eta'. Each is a
        slice or a derived indicator of a series now in the catalog, and
        the catalog's own rule is to skip near-duplicates. 34 assets
        carry the "Comune di Udine" name; 8 are now listed.

        Trap worth remembering: the portal's discovery API
        (`/api/catalog/v1`) defaults to every asset type, and passing
        `only=dataset` hides most of it. Of 854 published assets only 266
        are type `dataset` - 551 are type `filter`, a saved view, fetched
        by resource id exactly like a dataset. Several catalog entries,
        including ones added long before this pass, are filters. A search
        narrowed to `only=dataset` returns zero for them, which reads as
        "does not exist". Noted in open_data_fvg.py's docstring too.

- [x] Decide how to expose the municipal budget datasets. Done
      2026-09-29: a search helper, not 359 entries. `search_open_data_fvg`
      in open_data_fvg.py queries the portal's own `/api/catalog/v1` and
      returns `PortalAsset` rows, and CATALOG carries one example entry
      per family (`ekfv-fyxt`, `uvzu-xq2j`, `ddna-ayyy`) so the shape of
      the data is discoverable without listing every comune. Catalog is
      87 entries; individual entries would have made it 443 and still
      gone stale each time a comune published a new year.

      It lives in open_data_fvg.py rather than next to
      search_known_datasets, because it is a portal client call, and
      splitting the portal client across two modules would have cost
      more than co-locating the two searches would have gained.

      The helper never passes `only=`, and there is a unit test asserting
      that specifically: narrowing to `only=dataset` hides 551 of the
      portal's ~850 assets and is what made these budget assets look
      nonexistent in the first place. A live test also checks the search
      still returns filter-type hits, so the weekly job catches the
      discovery API changing shape.

      While verifying, a full live sweep failed once and passed on every
      repeat (174 consecutive requests clean). The cause was not a
      retired layer but the sweep aborting on a single dropped
      connection, which left every later entry unchecked. `resolve` now
      retries once and `_ask` reports a network error instead of raising,
      so a blip is distinguished from a wrong identifier. Both behaviours
      have mocked tests that run in normal CI, since the thing deciding
      whether the weekly job cries wolf should not itself be checked only
      by hand.

## ISTAT

- [ ] Employment rate (was dataflow `150_915` in the `eda` reference
      repo, via the legacy `istatapi`/`sdmx.istat.it`). Confirmed live
      that on the modern `esploradati.istat.it` endpoint this dataflow
      now needs 7 key dimensions and returns only `REF_AREA=IT` rows in
      a first wildcard probe - comune/province granularity may no
      longer exist under this id, or may need a different key entirely.
      Needs a proper investigation pass (throttled, 5 req/min) before
      it can be ported.
- [ ] Tourism (was dataflow `122_54`, `FREQ.ITTER107.TIPO_ESERCIZIO.INDS.ADJUSTMENT`
      via istatapi). Confirmed live the modern endpoint needs 11 key
      dimensions, not 5 - same situation as employment, needs its own
      investigation pass.
- [ ] Consumer price index at comune level: the ISTAT dataflow (`167_744`
      in eda) wasn't chased down after the above two turned out to need
      real investigation. Note: the Open Data FVG portal already has a
      ready-made alternative for (only) Comune di Udine - resource id
      `fz2e-423g`, already in the catalog - which may make a generic
      ISTAT version lower priority.

## Natural hazard modules

- [ ] Decide whether avalanche risk (`ZONE_RISC:CV_VALANGHE_RILEVATE`/
      `CV_VALANGHE_FOTOINT`, already in the catalog) deserves a
      dedicated module with its own classification logic, the way fire
      and landslide do in mappa-civica's pipeline - or whether raw WFS
      access via the catalog is enough.
- [ ] Same question for seismic classification
      (`ZONE_VINC:CLASSI_SISM_OPCM3274`, already in the catalog).

## JOSS readiness

Read straight from joss.readthedocs.io (submitting, review_criteria,
paper, policies) on 2026-09-15 - not assumed from memory. What's done,
what's fixable by editing the repo, and what genuinely just needs time
or a decision only the maintainer can make.

Done:
- [x] OSI-approved license (MIT), a real LICENSE file
- [x] Public repo, cloneable/browsable without registration
- [x] Automated test suite + CI (`ci.yml`, runs on every push/PR)
- [x] Statement of need in the README
- [x] Installation instructions, example usage per data source
- [x] CONTRIBUTING.md: how to contribute, report issues, get support
- [x] AI-usage disclosure (in CONTRIBUTING.md) - tools, what for, human
      review/verification asserted

Fixable, not yet done:
- [x] Tagged release - v0.1.0, 2026-09-15
      (github.com/leoventuroso/getopendatafvg/releases/tag/v0.1.0)
- [ ] Formal API documentation beyond docstrings + README examples
      (JOSS accepts the latter for many accepted papers - not urgent,
      but a Sphinx/mkdocs site would strengthen this checkbox if there's
      ever spare time for it)
- [x] `paper.md` + `paper.bib` drafted (`paper/`) - author: Leonardo
      Venturoso, affiliation: Fraunhofer Italia, all 8 required sections
      present, 1219 body words (in range), every citation key checked
      against paper.bib. Benchmarked against a real accepted JOSS paper
      (aloth/RogueGPT) on 2026-09-15 and revised for comparable depth:
      concrete numbers (54 exports, 18 modules, 120+ tests, 87-entry
      catalog), a State of the field naming and citing specific
      alternative tools (sentinelsat, landsatxplore, OWSLib - two of
      which turned out to be archived/unmaintained against the current
      APIs, verified live rather than assumed), module names in Software
      design. Still needs a real pass before actual submission: re-read
      once more code/README has moved since 2026-09-15, and the
      "Research impact statement" rewritten if real evidence exists by
      then instead of the current "credible near-term significance"
      framing.

Needs time, not code:
- [ ] 6-month continuous public development history. Repo created
      2026-06-01 - eligible from about 2026-12-01 at the earliest, and
      only if development stays genuinely continuous until then (see
      "Process" below).
- [ ] Evidence of research impact (citations, documented adoption by
      other groups, or use in a published workflow) - can't be
      fabricated, has to accrue for real. JOSS accepts "credible
      near-term significance" as well as realized impact - the current
      `paper.md` draft leans on that: the ISTAT module fixing two
      documented endpoint defects, and consolidating access to real
      institutional hazard/environmental/demographic data sources. No
      specific external-adoption plan is being pursued right now.

## Process

- Small, genuine, working commits - not batched dumps, not padding for
  the sake of a daily commit. See the note this file itself doesn't
  need repeating: every change here should be real.
