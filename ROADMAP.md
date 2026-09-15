# Roadmap

Working backlog for getopendatafvg - what's next, in rough priority
order. Check this at the start of each work session; pick one item, do
it properly (real code, real tests, live-verified against the actual
source), commit, check it off.

## Catalog

- [ ] `fetch_known_dataset(entry, boundary=None, **kwargs)` - dispatch a
      `KnownDataset` to `fetch_wfs_features`/`fetch_and_clip_wfs_features`
      or `fetch_open_data_fvg` automatically, instead of the caller
      branching on `entry.source` themselves.
- [ ] Expand `CATALOG` beyond the initial 43 entries. Candidates already
      identified but not yet added (all confirmed to exist in the WFS
      GetCapabilities dump or the Socrata portal listing, not yet
      individually re-verified live):
  - WFS: `IRDAT:AWC_CAPACITA_ACQUA_DISP` (capacita d'acqua disponibile
    del suolo), `GEST_FOR:TIPOLOGIE_FORESTALI`/`PIANI_GEST_FORESTALE`,
    `PPR:v_beni_culturali`, `PPR:v_centuriazioni`,
    `PPR:v_zone_interesse_archeologico`, `USO_SUOLO:VIGNETI_CTRN_ED1`,
    `USO_SUOLO:FRUTTETI_CTRN_ED1`, `CER:ATER_FVG` (edilizia popolare),
    `SITI_PROT:MAB_UNESCO_FVG`, `RETI_TRASP:ASSI_STRADALI_CAT_STR_REG`
  - Socrata: municipal budget datasets ("Rendiconto Entrate/Spese" -
    one per comune, ~130 datasets, same schema - worth a documented
    pattern rather than individual catalog entries), "Borse di studio
    universitarie FVG", "Bonus psicologo studenti FVG"

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

## Process

- Small, genuine, working commits - not batched dumps, not padding for
  the sake of a daily commit. See the note this file itself doesn't
  need repeating: every change here should be real.
