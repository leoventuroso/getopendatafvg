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
- [ ] Expand `CATALOG` beyond the initial 43 entries. The 32 WFS
      candidates below were live-verified 2026-09-24 (GetCapabilities
      cross-check, then a `resultType=hits` GetFeature each): all 32
      resolve, none is empty, and none duplicates an existing entry -
      they would take the catalog from 43 to 75. Counts are the feature
      counts returned that day; they are what the entries' descriptions
      should be written against. What is left is writing the entries
      themselves, then `GETOPENDATAFVG_LIVE=1 pytest
      tests/test_catalog_live.py`.

      The worry that these prefixes came from the same survey that got
      five original entries wrong turned out to be mostly unfounded -
      exactly one was wrong (see the forestry note below).

  - Rischio naturale: `ZONE_VINC:CLASSI_SISM_DM1982` (219; classificazione
    sismica, versione precedente a OPCM3274, gia' in catalogo),
    `IRDAT:CATFRANE_CORONAMENTO` (166)/`CATFRANE_FESSURE` (45)/
    `CATFRANE_FRANE_FOTO` (2214)/`CATFRANE_ELEM_RISCHIO` (1564)
    (dettaglio del catasto frane oltre ai soli perimetri gia' in catalogo)
  - Monitoraggio ambientale: `MONIT_AMB:RETE_MONSOTT_CHIMICO` (167)/
    `RETE_MONSUP_ECOLOGICO` (398) (qualita' acque sotterranee/superficiali),
    `SITI_PROT:ARIA_BUR` (15)/`ARIA_PRGC` (27) (zonizzazione qualita' aria)
  - Natura: `SITI_PROT:MAB_UNESCO_FVG` (11),
    `PPR:v_alberi_monumentali_e_notevoli` (620), `PPR:v_siti_unesco` (14),
    `PPR:v_beni_culturali` (3279), `PPR:v_centuriazioni` (463),
    `PPR:v_zone_interesse_archeologico` (1534)
  - Uso del suolo/agricoltura: `USO_SUOLO:VIGNETI_CTRN_ED1` (38275),
    `USO_SUOLO:FRUTTETI_CTRN_ED1` (7661), `ERSA:SUOLO_CAP_USO_PRINC` (32)/
    `SUOLO_CAP_USO_SEC` (32)/`RISCHIO_COMPATT_SUOLO` (4),
    `IRDAT:TIPOLOGIE_FORESTALI` (19388)/`GEST_FOR:PIANI_GEST_FORESTALE`
    (5225), `IRDAT:AWC_CAPACITA_ACQUA_DISP` (6) (capacita' d'acqua
    disponibile del suolo)
  - Rifiuti: `RIFIUTI:GESTORI_RSU` (215)
  - Servizi pubblici: `PUB_UTIL:ImpiantiSportiviFVG` (1546),
    `CER:PARROCCHIE_FVG` (622), `CER:ATER_FVG` (5336) (edilizia popolare)
  - Energia: `CER:BIOENERGIE_FVG` (215), `CER:GRANDI_DIGHE_FVG` (12)
  - Amministrativo: `UNITA_AMM:REGIONE_FVG` (1) (confine regionale)
  - Trasporti: `RETI_TRASP:ASSI_STRADALI_CAT_STR_REG` (407)
  - Geologia/turismo: `CAT_SPELEO:AREE_CARSICHE` (87)

      Forestry prefix, the one candidate that was wrong:
      `GEST_FOR:TIPOLOGIE_FORESTALI` does not exist. The layer is served
      from two workspaces at once, `IRDAT:` and `UTIL_TER:`, with
      identical schemas and an identical 19388 features. Took `IRDAT:`,
      which the catalog already uses three times; `UTIL_TER:` it has
      never used. `GEST_FOR:PIANI_GEST_FORESTALE` is unaffected and real.

      Regional boundary, same situation: `UNIT_AMM:REGIONE_FVG` and
      `UNITA_AMM:REGIONE_FVG` both resolve, same 6 fields, 1 feature
      each. Took `UNITA_AMM:`, which is where COMUNI_FVG and PROVINCE_FVG
      already live after 834b039, and whose abstract says "limiti
      aggiornati" against the other's plain "limiti".

      Two entries need their description written carefully, because the
      layer name promises something the data is not - both are the 215
      comune polygons, not the features the name suggests:

      - `RIFIUTI:GESTORI_RSU` is not a register of waste companies. It is
        which of 8 operators collects in each comune (A&T 2000 78, Net
        56, Isontina Ambiente 28, Ambiente Servizi 26, Gea 24, three
        singletons), plus the contract expiry and the act awarding it.
        Describe it as affidamento areas.
      - `CER:BIOENERGIE_FVG` is not plant locations. It is installed
        bioenergy capacity aggregated per comune: only 70 of the 215 have
        any plant at all, the other 145 are zero rows; 129 plants and
        134.8 MW in total, mostly biogas. Anyone expecting points will
        find comune polygons.

  - [ ] Socrata candidates, NOT verified on 2026-09-24 - that pass covered
        the WFS layers only. Verify these the same way before adding:
        "Elezioni comunali 2025 - Voti Liste" (accanto a Voti Sindaco e
        Affluenza, gia' in catalogo), le altre serie storiche demografiche
        del Comune di Udine oltre a movimento demografico e popolazione
        per classi d'eta' (popolazione straniera, famiglie anagrafiche,
        matrimoni, ecc. - stesso portale, non ancora individuate una per
        una), municipal budget datasets ("Rendiconto Entrate/Spese" - uno
        per comune, ~130 dataset, stesso schema - merita un pattern
        documentato piuttosto che voci individuali), "Borse di studio
        universitarie FVG", "Bonus psicologo studenti FVG". Check each for
        a geometry column while you are there and record it, per the
        entry above this one.

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
      concrete numbers (51 exports, 18 modules, 100+ tests, 43-entry
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
