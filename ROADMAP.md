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
      individually re-verified live - do that before adding, the way
      every existing entry was verified):
  - Rischio naturale: `ZONE_VINC:CLASSI_SISM_DM1982` (classificazione
    sismica, versione precedente a OPCM3274, gia' in catalogo),
    `IRDAT:CATFRANE_CORONAMENTO`/`CATFRANE_FESSURE`/`CATFRANE_FRANE_FOTO`/
    `CATFRANE_ELEM_RISCHIO` (dettaglio del catasto frane oltre ai soli
    perimetri gia' in catalogo)
  - Monitoraggio ambientale: `MONIT_AMB:RETE_MONSOTT_CHIMICO`/
    `RETE_MONSUP_ECOLOGICO` (qualita' acque sotterranee/superficiali),
    `SITI_PROT:ARIA_BUR`/`ARIA_PRGC` (zonizzazione qualita' aria)
  - Natura: `SITI_PROT:MAB_UNESCO_FVG`, `PPR:v_alberi_monumentali_e_notevoli`,
    `PPR:v_siti_unesco`, `PPR:v_beni_culturali`, `PPR:v_centuriazioni`,
    `PPR:v_zone_interesse_archeologico`
  - Uso del suolo/agricoltura: `USO_SUOLO:VIGNETI_CTRN_ED1`,
    `USO_SUOLO:FRUTTETI_CTRN_ED1`, `ERSA:SUOLO_CAP_USO_PRINC`/
    `SUOLO_CAP_USO_SEC`/`RISCHIO_COMPATT_SUOLO`,
    `GEST_FOR:TIPOLOGIE_FORESTALI`/`PIANI_GEST_FORESTALE`,
    `IRDAT:AWC_CAPACITA_ACQUA_DISP` (capacita' d'acqua disponibile del
    suolo)
  - Rifiuti: `RIFIUTI:GESTORI_RSU`
  - Servizi pubblici: `PUB_UTIL:ImpiantiSportiviFVG`, `CER:PARROCCHIE_FVG`,
    `CER:ATER_FVG` (edilizia popolare)
  - Energia: `CER:BIOENERGIE_FVG`, `CER:GRANDI_DIGHE_FVG`
  - Amministrativo: `UNIT_AMM:REGIONE_FVG` (confine regionale)
  - Trasporti: `RETI_TRASP:ASSI_STRADALI_CAT_STR_REG`
  - Geologia/turismo: `CAT_SPELEO:AREE_CARSICHE`
  - Socrata: "Elezioni comunali 2025 - Voti Liste" (accanto a Voti
    Sindaco e Affluenza, gia' in catalogo), le altre serie storiche
    demografiche del Comune di Udine oltre a movimento demografico e
    popolazione per classi d'eta' (popolazione straniera, famiglie
    anagrafiche, matrimoni, ecc. - stesso portale, non ancora
    individuate una per una), municipal budget datasets ("Rendiconto
    Entrate/Spese" - uno per comune, ~130 dataset, stesso schema -
    merita un pattern documentato piuttosto che voci individuali),
    "Borse di studio universitarie FVG", "Bonus psicologo studenti FVG"

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
