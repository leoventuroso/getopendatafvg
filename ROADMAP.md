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

- [x] Employment rate (dataflow `150_915`). Done 2026-10-06 as
      `fetch_employment_rate(area_code, since_year=2019, age='Y15-64')`,
      6 unit tests, verified live (FVG 66.6% in 2019 rising to 69.4% in
      2025; the four provinces for 2023 are Pordenone 67.0, Udine 69.5,
      Gorizia 65.5, Trieste 71.5).

      The investigation the item asked for, and the recipe for the two
      below. Walk the structure rather than guessing the key:
      `/dataflow/IT1/<flow>` gives the DSD ref (here `DCCV_TAXOCCU1`),
      `/datastructure/IT1/<dsd>` gives the dimensions *in position
      order*, and
      `/availableconstraint/IT1,<flow>,1.0/all/all/<DIM>` gives the
      values that actually carry data - which is the only way to answer
      "does comune granularity exist" without a blind probe. Note its
      XML uses the `common:` namespace prefix, not `com:`.

      Two findings, both of which would silently mislead:

      - **No comune granularity.** Of the 133 `REF_AREA` values with
        data, the finest is NUTS3. The earlier "returns only
        REF_AREA=IT" probe was reading an arity failure, not the truth:
        the key needs 7 positions (`FREQ.REF_AREA.DATA_TYPE.SEX.AGE.
        EDU_LEV_HIGHEST.CITIZENSHIP`), and a short key 404s.
      - **Pre-2013 NUTS vintage.** FVG is `ITD4`, not `ITH4`; provinces
        are `ITD41`/`ITD42`/`ITD43`/`ITD44`. No `ITH*` code appears at
        all. A modern code answers 404, so it fails loudly but without
        saying why - hence `FVG_NUTS_AREAS`, with a test pinning it to
        the ITD4 vintage so nobody "modernises" it.

- [x] Tourism (dataflow `122_54`). Done 2026-10-06 as
      `fetch_tourism_capacity` and `fetch_tourism_flows`, 7 unit tests,
      verified live. Two functions, not one, because ISTAT publishes the
      dataflow's two halves at different granularity: capacity
      (establishments, beds, rooms) goes down to comune - 225 FVG comuni
      carry data - while the flow indicators `AR` and `NI` stop at
      province. A comune code given to `fetch_tourism_flows` returns an
      empty series rather than an error, and that is documented.

      Key takes 11 positions. Same pre-2013 NUTS vintage as 150_915: no
      `ITH*` code appears at all.

      One trap cost a wrong number before a test caught it, and it is the
      reason `TOURISM_TOTAL_KEYS` exists. 122_54 slices the same figure
      along six dimensions simultaneously, and each has to be pinned to
      its own total. For FVG in 2023 the `LOCALITY_TYPE` dimension alone
      returns 11 rows for one year: `ALL` is 2,910,023 arrivals while
      `TOUR_THRM` (thermal localities) is 21,334. Filtering only the
      obvious dimensions let the last row win and produced 21,334 -
      a plausible-looking figure two orders of magnitude out, sitting
      between 2.6M in 2022 and 3.0M in 2024. There is now a regression
      test built from those exact rows.

- [x] Consumer price index at comune level: answered 2026-10-06, and the
      answer is that it does not exist. Of the 132 `REF_AREA` values in
      dataflow `167_744` that carry data, not one is a comune; province
      is the floor. The portal's `fz2e-423g` is Comune di Udine's own
      publication, not ISTAT's, which is why it exists where this cannot.

      Ported at the granularity that does exist, as
      `fetch_consumer_price_index(area_code, since_year=2019,
      coicop='00')`, 5 unit tests, verified live (provincia di Udine,
      NIC base 2015=100: 120.3 in 2024-01 through 123.1 in 2025-12, with
      year-on-year change alongside). Monthly, 5-position key, same
      pre-2013 NUTS vintage. `coicop` reaches the spending divisions.

## Natural hazard modules

- [x] Avalanche risk: decided 2026-10-06. A thin merging helper, not a
      hazard module. `avalanche.py` /
      `fetch_avalanche_sites(boundary=None, photo_interpreted=None)`,
      9 unit tests, 100% covered, verified live.

      The real problem turned out not to be classification but the
      two-layer split. `CV_VALANGHE_RILEVATE` (3875 features,
      ground-surveyed) and `CV_VALANGHE_FOTOINT` (3255,
      photo-interpreted) are divided by survey method, not by area, and
      neither layer hints the other exists - so anyone asking "avalanche
      sites here" through one catalog entry silently misses about half
      the catasto. Merged, flagged by provenance, 7128 sites.

      They do *not* overlap: checked live, the two share not one
      `ID_SITO`, and `DA_FOTOINTERPRETAZIONE` is 0 throughout one and 1
      throughout the other. The planning assumption that they needed
      deduplicating against each other was wrong.

      Two sites (`ID_SITO` 1060 and 3668) are stored as two polygon rows
      each in the surveyed layer - same attributes, different OBJECTID,
      i.e. one site with a multi-part footprint. Rows are grouped by
      `ID_SITO` and `geometries` is a tuple, because keeping one row
      would have silently shrunk those sites.

      Also worth knowing: `fetch_wfs_features` defaults to `count=1000`,
      which would have truncated both layers to a quarter with no error.
      The module sets its own higher count and a test asserts it.

      No danger rating is derived. The region publishes perimeters and
      site attributes, not a hazard class, so a rating would be ours
      rather than sourced.

- [x] Seismic classification: decided 2026-10-06, and the decision is
      that no module is warranted. `ZONE_VINC:CLASSI_SISM_OPCM3274`
      already carries `ZONA` per comune - verified live, 219 comuni split
      59/87/51/22 across zones 1-4. The classification is legislative,
      not computed, so a module would wrap a lookup over data
      `fetch_known_dataset` already returns. The catalog entry is the
      right level of support for it.

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
      concrete numbers (61 exports, 19 modules, 150+ tests, 87-entry
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
- [ ] 6-month continuous public development history. The 2026-12-01 date
      this item used to give was measured from the wrong starting point,
      corrected 2026-10-06 against the actual git history.

      The repository does date from 2026-06-01, but not this software.
      Until 2026-09-15 it held a different project - a frontend plus GIS
      pipeline, rebranded "Mappa Civica" on 2026-08-24. This library
      begins at `f301ad1`, "Repurpose this repository as the
      getopendatafvg Python library", on 2026-09-15. Counting from repo
      creation credits this software with three months of history
      belonging to something else, so the defensible earliest date is
      about 2027-03-15, not 2026-12-01.

      Continuity is the weaker half of the claim anyway. Of 73 commits,
      July has zero, June has 8 and August 5 - all three before the
      repurpose - while 58 fall in September alone and 45 of the total
      come after `f301ad1`. "Continuous" needs the gaps not to reappear
      from here on; the bursty pattern noted under "Process" is the
      thing to watch, not the calendar.

      Worth confirming against JOSS's own wording before planning a
      submission date: this reading assumes the history that counts is
      the submitted software's, which is the conservative assumption but
      not one taken from the guidelines verbatim.
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
