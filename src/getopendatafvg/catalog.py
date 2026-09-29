"""A curated, hand-picked catalog of datasets worth knowing exist across
this library's two generic data sources: the region's WFS GeoServer
(wfs.py - about 1150 layers across 52 workspaces) and its Socrata open
data portal (open_data_fvg.py - about 850 published assets). Both are usable
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
from typing import Any

from shapely.geometry.base import BaseGeometry

from .open_data_fvg import fetch_open_data_fvg, within_box_clause
from .wfs import fetch_and_clip_wfs_features, fetch_wfs_features

WFS_BASE_URL = 'https://serviziogc.regione.fvg.it/geoserver/ows'
OPEN_DATA_FVG_BASE_URL = 'https://www.dati.friuliveneziagiulia.it'


@dataclass(frozen=True)
class KnownDataset:
    """One catalog entry. `identifier` is what the matching fetch
    function needs: a `WORKSPACE:LAYER` type_name (pass with
    `WFS_BASE_URL`) for `fetch_wfs_features`/`fetch_and_clip_wfs_features`
    when `source` is `'wfs'`, or a resource id for `fetch_open_data_fvg`
    when `source` is `'open_data_fvg'`.

    `geometry_column` is the name of the dataset's geometry column, for
    `'open_data_fvg'` entries that have one - it differs per dataset, and
    most of the portal's datasets are plain tables with none at all, so it
    stays `None` unless checked live against the dataset's schema. WFS
    entries leave it `None`: the WFS client gets its geometry from the
    layer itself.
    """

    name: str
    source: str
    identifier: str
    category: str
    description: str
    geometry_column: str | None = None


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
    KnownDataset(
        'Classificazione sismica (DM 1982)',
        'wfs',
        'ZONE_VINC:CLASSI_SISM_DM1982',
        'rischio naturale',
        'Zonizzazione sismica su base comunale, 219 comuni. Versione precedente a OPCM 3274, utile per confronti storici.',
    ),
    KnownDataset(
        'Frane (coronamenti)',
        'wfs',
        'IRDAT:CATFRANE_CORONAMENTO',
        'rischio naturale',
        'Zona sommitale da cui ha inizio il movimento franoso. Dettaglio del catasto frane oltre ai perimetri.',
    ),
    KnownDataset(
        'Frane (fessure)',
        'wfs',
        'IRDAT:CATFRANE_FESSURE',
        'rischio naturale',
        'Fessure di trazione, trasversali, radiali e longitudinali: servono a definire l attivita dei fenomeni di scivolamento.',
    ),
    KnownDataset(
        'Frane (punti di ripresa fotografica)',
        'wfs',
        'IRDAT:CATFRANE_FRANE_FOTO',
        'rischio naturale',
        'Punti di visuale delle foto del catasto frane, con collegamento ipertestuale allo scatto.',
    ),
    KnownDataset(
        'Frane (elementi a rischio)',
        'wfs',
        'IRDAT:CATFRANE_ELEM_RISCHIO',
        'rischio naturale',
        'Elementi vulnerabili perimetrati nelle aree pericolose: edifici, viabilita, aree di potenziale espansione urbanistica.',
    ),
    # acqua
    KnownDataset(
        "Corsi d'acqua",
        'wfs',
        'IRDAT:CORSI_ACQUA',
        'acqua',
        'Reticolo idrografico regionale.',
    ),
    KnownDataset(
        'Stazioni idrometriche',
        'wfs',
        'MONIT_AMB:STAZIONI_IDROMETRICHE',
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
    KnownDataset(
        'Rete monitoraggio acque sotterranee (stato chimico)',
        'wfs',
        'MONIT_AMB:RETE_MONSOTT_CHIMICO',
        'monitoraggio ambientale',
        'Punti della rete di monitoraggio dello stato chimico delle acque sotterranee.',
    ),
    KnownDataset(
        'Rete monitoraggio acque superficiali (stato ecologico)',
        'wfs',
        'MONIT_AMB:RETE_MONSUP_ECOLOGICO',
        'monitoraggio ambientale',
        'Punti della rete di monitoraggio dello stato ecologico dei corpi idrici superficiali.',
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
    KnownDataset(
        'ARIA - Aree di Rilevante Interesse Ambientale',
        'wfs',
        'SITI_PROT:ARIA_BUR',
        'natura',
        'Perimetri istitutivi delle 15 ARIA, con gli estremi di DGR e DPGR. Non ha nulla a che vedere con la qualita dell aria.',
    ),
    KnownDataset(
        'ARIA - recepimento nei PRGC',
        'wfs',
        'SITI_PROT:ARIA_PRGC',
        'natura',
        'Le stesse ARIA come recepite nei piani regolatori comunali: una riga per comune, quindi piu righe per area.',
    ),
    KnownDataset(
        'Riserve della biosfera MAB UNESCO',
        'wfs',
        'SITI_PROT:MAB_UNESCO_FVG',
        'natura',
        'Territori del programma Man and the Biosphere UNESCO.',
    ),
    KnownDataset(
        'Alberi monumentali e notevoli',
        'wfs',
        'PPR:v_alberi_monumentali_e_notevoli',
        'natura',
        'Alberi tutelati dalla LR 24/2016.',
    ),
    # paesaggio e beni culturali
    KnownDataset(
        'Siti UNESCO',
        'wfs',
        'PPR:v_siti_unesco',
        'paesaggio e beni culturali',
        'Perimetrazioni certificate dei siti UNESCO, core zone e buffer zone.',
    ),
    KnownDataset(
        'Beni culturali',
        'wfs',
        'PPR:v_beni_culturali',
        'paesaggio e beni culturali',
        'Beni culturali puntuali censiti dal PPR, con denominazione e tipologia (chiese, cappelle, ville, ...).',
    ),
    KnownDataset(
        'Centuriazioni',
        'wfs',
        'PPR:v_centuriazioni',
        'paesaggio e beni culturali',
        'Tracce della centuriazione romana, fra gli "ulteriori contesti" del PPR.',
    ),
    KnownDataset(
        'Zone di interesse archeologico',
        'wfs',
        'PPR:v_zone_interesse_archeologico',
        'paesaggio e beni culturali',
        'Ambiti vincolati ai sensi dell art. 142 c.1 lett. m del DLgs 42/2004.',
    ),
    # uso del suolo
    KnownDataset(
        'Corine Land Cover 2012',
        'wfs',
        'IRDAT:CORINELANDCOVER_FVG2012',
        'uso del suolo',
        'Copertura del suolo, edizione 2012 (1990/2000 in USO_SUOLO, stesso schema).',
    ),
    KnownDataset(
        'Carta dei suoli (Pordenone)',
        'wfs',
        'ERSA:CARTA_SUOLI_PN',
        'uso del suolo',
        'Carta pedologica, provincia di Pordenone (ERSA FVG).',
    ),
    KnownDataset(
        'Vigneti (CTRN)',
        'wfs',
        'USO_SUOLO:VIGNETI_CTRN_ED1',
        'uso del suolo',
        'Aree classificate come vigneto, estratte dalla CTRN 1:5000 regionale.',
    ),
    KnownDataset(
        'Frutteti (CTRN)',
        'wfs',
        'USO_SUOLO:FRUTTETI_CTRN_ED1',
        'uso del suolo',
        'Aree a frutteto o altra coltivazione arborea, estratte dalla CTRN 1:5000.',
    ),
    KnownDataset(
        'Capacita d uso dei suoli (principale)',
        'wfs',
        'ERSA:SUOLO_CAP_USO_PRINC',
        'uso del suolo',
        'Capacita d uso secondo il metodo USDA in 8 classi, valutata sul suolo naturale senza interventi antropici.',
    ),
    KnownDataset(
        'Capacita d uso dei suoli (secondario)',
        'wfs',
        'ERSA:SUOLO_CAP_USO_SEC',
        'uso del suolo',
        'Come la voce precedente, ma per il suolo secondario per frequenza.',
    ),
    KnownDataset(
        'Rischio di compattamento dei suoli',
        'wfs',
        'ERSA:RISCHIO_COMPATT_SUOLO',
        'uso del suolo',
        'Rischio di compattamento dei suoli della pianura friulana, 4 classi.',
    ),
    KnownDataset(
        'Tipologie forestali',
        'wfs',
        'IRDAT:TIPOLOGIE_FORESTALI',
        'uso del suolo',
        'Tipi di bosco su oltre 255 mila ettari. Pubblicato identico anche come UTIL_TER:TIPOLOGIE_FORESTALI.',
    ),
    KnownDataset(
        'Piani di gestione forestale',
        'wfs',
        'GEST_FOR:PIANI_GEST_FORESTALE',
        'uso del suolo',
        'Particelle dei piani di gestione, con superficie boscata, piante per ettaro, diametro medio e provvigione.',
    ),
    KnownDataset(
        'Capacita d acqua disponibile del suolo (AWC)',
        'wfs',
        'IRDAT:AWC_CAPACITA_ACQUA_DISP',
        'uso del suolo',
        'Acqua estraibile dalle radici, fra capacita di campo e punto di appassimento, in classi.',
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
    KnownDataset(
        'Gestori raccolta rifiuti urbani',
        'wfs',
        'RIFIUTI:GESTORI_RSU',
        'rifiuti',
        'Ambiti di affidamento: per ciascuno dei 215 comuni la societa che raccoglie, la scadenza e l atto. Poligoni comunali, non sedi dei gestori.',
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
    KnownDataset(
        'Impianti sportivi',
        'wfs',
        'PUB_UTIL:ImpiantiSportiviFVG',
        'servizi pubblici',
        'Impianti sportivi pubblici e privati, localizzati e descritti.',
    ),
    KnownDataset(
        'Parrocchie ed edifici di culto',
        'wfs',
        'CER:PARROCCHIE_FVG',
        'servizi pubblici',
        'Chiese ed edifici della Santa Sede.',
    ),
    KnownDataset(
        'Alloggi ATER',
        'wfs',
        'CER:ATER_FVG',
        'servizi pubblici',
        'Localizzazione degli alloggi di edilizia residenziale pubblica.',
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
    KnownDataset(
        'Bioenergie per comune',
        'wfs',
        'CER:BIOENERGIE_FVG',
        'energia',
        'Potenza installata e numero di centrali a biomasse aggregati per comune: poligoni comunali, non posizioni degli impianti. Solo 70 comuni su 215 hanno un impianto.',
    ),
    KnownDataset(
        'Grandi dighe',
        'wfs',
        'CER:GRANDI_DIGHE_FVG',
        'energia',
        'Grandi dighe esistenti in regione.',
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
    KnownDataset(
        'Assi stradali (catasto strade regionale)',
        'wfs',
        'RETI_TRASP:ASSI_STRADALI_CAT_STR_REG',
        'trasporti',
        'Assi stradali del catasto strade regionale.',
    ),
    # amministrativo
    KnownDataset(
        'Confini comunali',
        'wfs',
        'UNITA_AMM:COMUNI_FVG',
        'amministrativo',
        'Confini amministrativi dei comuni.',
    ),
    KnownDataset(
        'Confini provinciali',
        'wfs',
        'UNITA_AMM:PROVINCE_FVG',
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
    KnownDataset(
        'Confine regionale',
        'wfs',
        'UNITA_AMM:REGIONE_FVG',
        'amministrativo',
        'Limite amministrativo della regione, una sola feature. Utile come boundary per le altre fetch.',
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
    KnownDataset(
        'Aree carsiche',
        'wfs',
        'CAT_SPELEO:AREE_CARSICHE',
        'geologia e turismo',
        'Perimetrazione delle aree carsiche regionali.',
    ),
    # portale open data (Socrata) - non presenti sul GeoServer
    KnownDataset(
        'Piste ciclabili',
        'open_data_fvg',
        '7eat-pecq',
        'trasporti',
        'Ciclovie di interesse locale (integra lo strato regionale del PPR).',
        geometry_column='the_geom',
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
    KnownDataset(
        'Elezioni comunali 2025 - Voti Liste',
        'open_data_fvg',
        'fxix-6uwx',
        'amministrativo',
        'Voti per lista, con schede bianche, nulle e contestate. Completa Voti Sindaco e Affluenza.',
    ),
    KnownDataset(
        'Borse di studio universitarie FVG',
        'open_data_fvg',
        '9hfe-iy3n',
        'istruzione',
        'Domande e beneficiari per anno accademico, dal 2016/17.',
    ),
    KnownDataset(
        'Bonus psicologo studenti FVG',
        'open_data_fvg',
        'ich8-2ddc',
        'istruzione',
        'Domande pervenute, accolte, bonus emessi e interventi conclusi, per anno.',
    ),
    # serie storiche del Comune di Udine (solo Udine, non regionali)
    KnownDataset(
        'Movimento naturale - Udine',
        'open_data_fvg',
        'mjd4-9dv9',
        'popolazione',
        'Nati vivi, decessi e saldo naturale per anno, dal 1983.',
    ),
    KnownDataset(
        'Movimento migratorio - Udine',
        'open_data_fvg',
        '7dpm-xa78',
        'popolazione',
        'Iscritti e cancellati per anno dal 1983, distinti fra altri comuni, estero e altri motivi.',
    ),
    KnownDataset(
        'Matrimoni celebrati - Udine',
        'open_data_fvg',
        'by5h-wnv3',
        'popolazione',
        'Matrimoni religiosi e civili e tasso di nuzialita per anno, dal 1983.',
    ),
    KnownDataset(
        'Famiglie anagrafiche - Udine',
        'open_data_fvg',
        'c63m-b2a6',
        'popolazione',
        'Famiglie per numero di componenti, da 1 a 5 o piu, per anno dal 2003.',
    ),
    KnownDataset(
        'Popolazione straniera per cittadinanza - Udine',
        'open_data_fvg',
        'nqd7-ynmx',
        'popolazione',
        'Residenti stranieri per stato estero, area e continente, per anno dal 2004.',
    ),
    KnownDataset(
        'Indicatori della struttura demografica - Udine',
        'open_data_fvg',
        'upe3-bvvc',
        'popolazione',
        'Indici di vecchiaia, dipendenza, ricambio ed eta media per anno, dal 1983.',
    ),
    # bilanci comunali: una voce d'esempio per famiglia. Le altre (359
    # asset, uno per comune e periodo) si trovano con search_open_data_fvg.
    KnownDataset(
        'Rendiconto Entrate - Udine 2024',
        'open_data_fvg',
        'ekfv-fyxt',
        'economia',
        "Esempio della famiglia 'Rendiconto Entrate' (114 asset): per gli altri comuni usa search_open_data_fvg.",
    ),
    KnownDataset(
        'Rendiconto Spese - Udine 2024',
        'open_data_fvg',
        'uvzu-xq2j',
        'economia',
        "Esempio della famiglia 'Rendiconto Spese' (113 asset): per gli altri comuni usa search_open_data_fvg.",
    ),
    KnownDataset(
        'Bilancio - Udine 2010/2015 - Entrate',
        'open_data_fvg',
        'ddna-ayyy',
        'economia',
        "Esempio della famiglia 'Bilancio - Comune ...' (132 asset), serie storica 2010/2015.",
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


def fetch_known_dataset(
    entry: KnownDataset,
    boundary: BaseGeometry | None = None,
    **kwargs: Any,
) -> list[Any]:
    """Fetch a catalog entry without branching on `entry.source` yourself:
    picks the right client and passes `entry.identifier` (plus, for WFS
    entries, `WFS_BASE_URL`) in the form that client expects. Extra
    keyword arguments go straight through to it.

    The return shape is the underlying function's, because the two
    sources genuinely don't return the same thing (see open_data_fvg.py):

    - `'wfs'` with a `boundary` -> `fetch_and_clip_wfs_features`, i.e.
      `(properties, clipped_geometry)` pairs
    - `'wfs'` without one -> `fetch_wfs_features`, i.e. GeoJSON feature
      dicts, unclipped
    - `'open_data_fvg'` -> `fetch_open_data_fvg`, i.e. one plain dict per
      row, boundary-filtered with a `within_box(...)` SoQL clause when the
      entry records a `geometry_column`

    Unlike the WFS branch, an `'open_data_fvg'` `boundary` is a bounding-box
    filter only, never an exact cut - `within_box` is what SODA offers, so
    rows are a superset of what really intersects `boundary`. Clip
    client-side afterward if you need the exact shape.

    A `boundary` on an entry whose `geometry_column` is `None` raises:
    most of the portal is plain tables, and some datasets that do carry
    coordinates keep them in a form SODA cannot filter on (Parafarmacie,
    for one, stores `latitudine`/`longitudine` as text with a comma
    decimal separator). Filter those client-side.

    A caller-supplied `where=` is preserved: it is ANDed with the
    generated clause rather than replaced.
    """
    if entry.source == 'wfs':
        if boundary is not None:
            return fetch_and_clip_wfs_features(WFS_BASE_URL, entry.identifier, boundary, **kwargs)
        return fetch_wfs_features(WFS_BASE_URL, entry.identifier, **kwargs)

    if entry.source == 'open_data_fvg':
        if boundary is not None:
            if entry.geometry_column is None:
                raise ValueError(
                    f'{entry.name!r} has no geometry column recorded, so it cannot be '
                    'filtered by boundary server-side: fetch it unfiltered and filter '
                    'the rows yourself'
                )
            clause = within_box_clause(entry.geometry_column, boundary)
            caller_where = kwargs.pop('where', None)
            kwargs['where'] = f'({caller_where}) AND {clause}' if caller_where else clause
        return fetch_open_data_fvg(entry.identifier, **kwargs)

    raise ValueError(f'unknown source {entry.source!r} on catalog entry {entry.name!r}')
