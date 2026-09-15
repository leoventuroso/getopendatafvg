"""A curated, hand-picked catalog of datasets worth knowing exist across
this library's two generic data sources: the region's WFS GeoServer
(wfs.py - about 1150 layers across 52 workspaces) and its Socrata open
data portal (open_data_fvg.py - about 300 datasets). Both are usable
without this catalog, but only if you already know the exact WFS
type_name or Socrata resource id - which in practice means having
already done the same GetCapabilities/portal-search discovery this
catalog exists to skip.

Not exhaustive: most of both source catalogs is either a near-duplicate
of an entry already listed here, split across many per-tile or
per-comune files, or too narrow a technical code to be usable without
its own legend. Every entry here was confirmed to actually resolve
before being added, not copied from a layer/dataset listing alone.
"""

from __future__ import annotations

from dataclasses import dataclass

WFS_BASE_URL = 'https://serviziogc.regione.fvg.it/geoserver/ows'
OPEN_DATA_FVG_BASE_URL = 'https://www.dati.friuliveneziagiulia.it'


@dataclass(frozen=True)
class KnownDataset:
    """One catalog entry. `identifier` is what the matching fetch
    function needs: a `WORKSPACE:LAYER` type_name (pass with
    `WFS_BASE_URL`) for `fetch_wfs_features`/`fetch_and_clip_wfs_features`
    when `source` is `'wfs'`, or a resource id for `fetch_open_data_fvg`
    when `source` is `'open_data_fvg'`.
    """

    name: str
    source: str
    identifier: str
    category: str
    description: str


CATALOG: tuple[KnownDataset, ...] = (
    # rischio naturale
    KnownDataset(
        'Incendi boschivi (storico)',
        'wfs',
        'ZONE_RISC:V_INCENDI_CT',
        'rischio naturale',
        'Perimetri degli incendi boschivi storici.',
    ),
    KnownDataset(
        'Pericolosita incendi',
        'wfs',
        'ZONE_RISC:SITFOR_PERICOLO_INCENDI',
        'rischio naturale',
        'Carta della pericolosita di incendio boschivo.',
    ),
    KnownDataset(
        'Valanghe rilevate',
        'wfs',
        'ZONE_RISC:CV_VALANGHE_RILEVATE',
        'rischio naturale',
        'Aree valanghive rilevate sul terreno.',
    ),
    KnownDataset(
        'Valanghe da fotointerpretazione',
        'wfs',
        'ZONE_RISC:CV_VALANGHE_FOTOINT',
        'rischio naturale',
        'Aree valanghive individuate da fotointerpretazione.',
    ),
    KnownDataset(
        'Classificazione sismica',
        'wfs',
        'ZONE_VINC:CLASSI_SISM_OPCM3274',
        'rischio naturale',
        'Zonazione sismica comunale (OPCM 3274/2003).',
    ),
    KnownDataset(
        'Vincolo idrogeologico',
        'wfs',
        'ZONE_VINC:VINCOLO_IDROGEOLOGICO',
        'rischio naturale',
        'Aree soggette a vincolo idrogeologico (RDL 3267/1923).',
    ),
    KnownDataset(
        'Frane (perimetri)',
        'wfs',
        'IRDAT:CATFRANE_PERIMFRANE',
        'rischio naturale',
        'Catasto regionale frane: perimetri, piu dettagliato del solo IFFI/ISPRA.',
    ),
    # acqua
    KnownDataset(
        "Corsi d'acqua",
        'wfs',
        'IDROGRAF:CORSI_ACQUA',
        'acqua',
        'Reticolo idrografico regionale.',
    ),
    KnownDataset(
        'Stazioni idrometriche',
        'wfs',
        'IDROGRAF:STAZIONI_IDROMETRICHE',
        'acqua',
        "Stazioni di misura del livello dei corsi d'acqua.",
    ),
    KnownDataset(
        'Stazioni freatimetriche',
        'wfs',
        'IDROGRAF:STAZIONI_FREATIMETRICHE',
        'acqua',
        'Stazioni di misura del livello della falda.',
    ),
    KnownDataset(
        'Acque di balneazione',
        'wfs',
        'IDROGRAF:AP_BALNEAZIONE',
        'acqua',
        'Zone classificate per la balneazione.',
    ),
    # monitoraggio ambientale
    KnownDataset(
        'Stazioni meteorologiche',
        'wfs',
        'MONIT_AMB:STAZIONI_METEOROLOGICHE',
        'monitoraggio ambientale',
        'Rete di stazioni meteo regionali.',
    ),
    KnownDataset(
        'Stazioni nivometriche',
        'wfs',
        'MONIT_AMB:STAZIONI_MISURA_NIVIS',
        'monitoraggio ambientale',
        'Stazioni di misura della neve.',
    ),
    # natura
    KnownDataset(
        'Siti di Importanza Comunitaria (SIC)',
        'wfs',
        'SITI_PROT:SIC',
        'natura',
        'Rete Natura 2000 - SIC.',
    ),
    KnownDataset(
        'Zone di Protezione Speciale (ZPS)',
        'wfs',
        'SITI_PROT:ZPS',
        'natura',
        'Rete Natura 2000 - ZPS.',
    ),
    KnownDataset(
        'Parchi naturali regionali',
        'wfs',
        'SITI_PROT:PARCHI_NATURALI_REG',
        'natura',
        'Perimetri dei parchi naturali regionali.',
    ),
    KnownDataset(
        'Riserve naturali regionali',
        'wfs',
        'SITI_PROT:RISERVE_NATURALI_REG',
        'natura',
        'Perimetri delle riserve naturali regionali.',
    ),
    KnownDataset(
        'Biotopi',
        'wfs',
        'SITI_PROT:BIOTOPI',
        'natura',
        'Biotopi naturali tutelati.',
    ),
    # uso del suolo
    KnownDataset(
        'Corine Land Cover 2012',
        'wfs',
        'USO_SUOLO:CORINELANDCOVER_FVG2012',
        'uso del suolo',
        'Copertura del suolo, edizione 2012 (anche 1990/2000 disponibili con lo stesso schema).',
    ),
    KnownDataset(
        'Carta dei suoli (Pordenone)',
        'wfs',
        'ERSA:CARTA_SUOLI_PN',
        'uso del suolo',
        'Carta pedologica, provincia di Pordenone (ERSA FVG).',
    ),
    # rifiuti
    KnownDataset(
        'Centri di raccolta rifiuti',
        'wfs',
        'RIFIUTI:CENTRI_DI_RACCOLTA',
        'rifiuti',
        'Centri comunali di raccolta rifiuti.',
    ),
    KnownDataset(
        'Discariche',
        'wfs',
        'RIFIUTI:DISCARICHE_2025',
        'rifiuti',
        'Discariche attive e cessate.',
    ),
    # servizi pubblici
    KnownDataset(
        'Scuole',
        'wfs',
        'PUB_UTIL:SCUOLE_GEO',
        'servizi pubblici',
        'Sedi scolastiche regionali.',
    ),
    KnownDataset(
        "Centri per l'impiego",
        'wfs',
        'PUB_UTIL:CPI_RAFVG',
        'servizi pubblici',
        "Sedi dei centri per l'impiego.",
    ),
    KnownDataset(
        'Indicatore ISEE per comune',
        'wfs',
        'CER:ISEE_COMUNI_FVG',
        'servizi pubblici',
        'ISEE medio per comune.',
    ),
    # energia
    KnownDataset(
        'Impianti fotovoltaici',
        'wfs',
        'CER:FOTOVOLTAICO_FVG',
        'energia',
        'Impianti fotovoltaici censiti.',
    ),
    KnownDataset(
        'Impianti idroelettrici',
        'wfs',
        'CER:IDROELETTRICO_FVG',
        'energia',
        'Impianti idroelettrici censiti.',
    ),
    # trasporti
    KnownDataset(
        'Grafo stradale regionale',
        'wfs',
        'RETI_TRASP:GRAFO_STRADALE_FVG',
        'trasporti',
        'Rete stradale ufficiale regionale, in forma di grafo.',
    ),
    KnownDataset(
        'Distributori di carburante',
        'wfs',
        'RETI_TRASP:DISTRIBUTORI_FVG',
        'trasporti',
        'Impianti di distribuzione carburante.',
    ),
    KnownDataset(
        'Sentieri CAI',
        'wfs',
        'RETI_TRASP:SENTIERI_CAI_CTRN_ED1',
        'trasporti',
        'Sentieri catalogati dal Club Alpino Italiano.',
    ),
    # amministrativo
    KnownDataset(
        'Confini comunali',
        'wfs',
        'UNIT_AMM:COMUNI_FVG',
        'amministrativo',
        'Confini amministrativi dei comuni.',
    ),
    KnownDataset(
        'Confini provinciali',
        'wfs',
        'UNIT_AMM:PROVINCE_FVG',
        'amministrativo',
        'Confini amministrativi delle province.',
    ),
    KnownDataset(
        'Sezioni di censimento 2021',
        'wfs',
        'UNITA_STAT:SEZ_CENS_2021',
        'amministrativo',
        'Sezioni di censimento ISTAT 2021, per dati sub-comunali.',
    ),
    # geologia e turismo
    KnownDataset(
        'Geositi',
        'wfs',
        'GEOLOGIA:GEOSITI',
        'geologia e turismo',
        'Siti di interesse geologico.',
    ),
    KnownDataset(
        'Acque minerali e termali',
        'wfs',
        'GEOLOGIA:ACQUE_MINER_TERM',
        'geologia e turismo',
        'Sorgenti di acque minerali e termali.',
    ),
    KnownDataset(
        'Catasto grotte',
        'wfs',
        'CAT_SPELEO:GROTTEFVG',
        'geologia e turismo',
        'Grotte censite in regione.',
    ),
    # portale open data (Socrata) - non presenti sul GeoServer
    KnownDataset(
        'Piste ciclabili',
        'open_data_fvg',
        '7eat-pecq',
        'trasporti',
        'Ciclovie di interesse locale (integra lo strato regionale del PPR).',
    ),
    KnownDataset(
        'Parafarmacie',
        'open_data_fvg',
        'b3xh-hm8p',
        'servizi pubblici',
        'Elenco delle parafarmacie regionali, con indirizzo e coordinate.',
    ),
    KnownDataset(
        'Elezioni comunali 2025 - Voti Sindaco',
        'open_data_fvg',
        'a3td-mpdh',
        'amministrativo',
        'Risultati elettorali comunali 2025, per candidato sindaco.',
    ),
    KnownDataset(
        'Elezioni comunali 2025 - Affluenza',
        'open_data_fvg',
        '9it4-6tfu',
        'amministrativo',
        'Affluenza alle elezioni comunali 2025.',
    ),
    KnownDataset(
        'Indici dei prezzi al consumo - Udine',
        'open_data_fvg',
        'fz2e-423g',
        'economia',
        'Indici NIC per il Comune di Udine, 2015-2025.',
    ),
    KnownDataset(
        'Movimento demografico - Udine',
        'open_data_fvg',
        'gmgi-xrsg',
        'popolazione',
        'Nascite, decessi, iscrizioni e cancellazioni anagrafiche, dal 1983.',
    ),
    KnownDataset(
        "Popolazione per classi d'eta - Udine",
        'open_data_fvg',
        'f4b7-xu9x',
        'popolazione',
        "Popolazione residente per classi d'eta, dal 1983.",
    ),
)


def list_known_datasets(source: str | None = None, category: str | None = None) -> list[KnownDataset]:
    """Every catalog entry, optionally filtered by `source`
    (`'wfs'`/`'open_data_fvg'`) and/or `category`.
    """
    results = CATALOG
    if source is not None:
        results = tuple(d for d in results if d.source == source)
    if category is not None:
        results = tuple(d for d in results if d.category == category)
    return list(results)


def search_known_datasets(query: str) -> list[KnownDataset]:
    """Case-insensitive substring match against name, category and
    description - a starting point when you don't know the exact
    dataset name to look for.
    """
    q = query.lower()
    return [d for d in CATALOG if q in d.name.lower() or q in d.category.lower() or q in d.description.lower()]
