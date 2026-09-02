# TODO — Montereale Valcellina Open

Questo file traccia le attività in sospeso che richiedono dati esterni, rilevamento sul campo, o integrazioni future.

---

## Modulo Resilienza & Protezione Civile

### Rii a rischio esondazione (Censimento RII)
- **Stato:** FATTO (dati reali dal Gruppo Comunale di Protezione Civile)
- **Sorgente:** `data/sources/output_rii_protezione_civile.zip` → `pipeline/scripts/build_rii_geojson.py` → `frontend/public/data/rescue/rii.geojson` + foto in `frontend/public/data/rescue/rii/`
- **Da confermare col Gruppo PC:** posizione esatta del sistema Cian/Cjasarile/Bennata (ora su punto di zona); se "Rio Cao Malnisio"/"Rio Bala Busa" siano lo stesso sopralluogo del Cjasarile; il rio "06" senza nome né coordinate (foto 2007), oggi escluso dalla mappa

### Incendi boschivi (Perimetro incendi IRDAT FVG)
- **Stato:** FATTO (dati aperti Regione FVG)
- **Sorgente:** IRDAT FVG dataset 1232, WFS `https://serviziogc.regione.fvg.it/geoserver/ZONE_RISC/wfs` layer `ZONE_RISC:V_INCENDI_CT` → `pipeline/scripts/build_fire_geojson.py` (filtro `COMUNE=...`) → `frontend/public/data/rescue/fire_perimeters.geojson`. Target `make fire`, CI-safe.
- **Estensioni possibili (stesso WFS):**
  - `ZONE_RISC:SITFOR_PERICOLO_INCENDI` — zonazione regionale di pericolosità (`GRADOPERICOLOSITA` MEDIO/ALTA), poligoni grossi non comunali: possibile overlay di sfondo "classe di pericolo"
  - `ZONE_RISC:V_INCENDI_PUNTOINIZIO` — punti di innesco (senza attributo COMUNE, serve filtro bbox)
  - `ZONE_RISC:SUPERFICIE_BOSCATA_BRUCIATA` / `_PASCOLO` / `_NON_BOSCATA_BRUCIATA` — superficie bruciata per copertura

### Dati rischio idraulico e frana (PAI) — layer ufficiale, futuro
- **Stato:** in attesa di ricezione file ufficiale dalla Regione FVG (indipendente dal censimento rii volontario)
- **Flusso atteso:** il file PAI arriverà direttamente (shapefile o GeoJSON) — non sarà scaricato automaticamente
- **Azione:** quando arriva il file, scrivere `pipeline/scripts/process_pai.py` che:
  - Accetta il file PAI come input esplicito (path da argomento o posizione convenzionale in `frontend/src/data/`)
  - Clippa i poligoni al confine comunale (`municipalBoundary.json`)
  - Separa rischio idraulico da rischio frana in due layer distinti
  - Produce nuovi geojson in `frontend/public/data/rescue/` e li aggiunge come layer poligonali nel tab "Rii a rischio"

### Asset di emergenza (AED, HEMS, idranti, punti raccolta)
- **DAE:** FATTO in prima battuta — elenco del Comune (12 indirizzi) geocodificato in `frontend/public/data/rescue/aed_comune.geojson`; `build_rescue_geojson.py` lo unisce ai nodi OSM (`emergency`/`amenity=defibrillator`) e scrive `aed.geojson`.
  - **Da rifinire:** i punti `geocoded: true` hanno posizione dall'indirizzo — verificare sul posto e/o rimpiazzare con i nodi OSM man mano che vengono mappati (la dedup a ~60 m li assorbe senza duplicati). Aggiungere dove noti: `access`, `opening_hours`, `defibrillator:location`, `operator`.
- **HEMS / idranti / punti raccolta:** ancora placeholder, in attesa di rilevamento sul campo + inserimento su OpenStreetMap, poi `pipeline/scripts/build_rescue_geojson.py` (Overpass).

### Widget meteo/idrometrico ARPA FVG
- **Stato:** TODO — da implementare in una sessione futura
- **Descrizione:** pannello nel modulo Resilienza con dati real-time da API pubblica ARPA FVG:
  - Livello idrometrico del Torrente Cellina (stazione di Montereale)
  - Precipitazioni ultime 24h
  - Stato allerta (normale / attenzione / allarme)
- **Note tecniche:** fetch client-side, nessun pipeline Python necessario. Verificare endpoint ARPA FVG prima di implementare.

---

## Modulo Segnala (Community Participation)

### Da implementare — future sessioni

#### Export report per l'amministrazione
- **Stato:** idea futura
- **Descrizione:** l'amministrazione può scaricare un CSV/PDF con le segnalazioni ordinate per numero di voti e zona, per prioritizzare gli interventi

#### Classificazione automatica foto (YOLO)
- **Stato:** idea futura
- **Descrizione:** modello leggero lato browser (YOLO o MobileNet) per suggerire automaticamente la categoria in base alla foto allegata (es. riconosce buca → suggerisce "Viabilità e strade")

#### Integrazione dati catastali (ondata/dati_catastali)
- **Stato:** idea futura
- **Descrizione:** permettere al cittadino di selezionare la propria particella catastale sulla mappa per georeferenziare la segnalazione in modo preciso; il form si pre-compila automaticamente con foglio e numero particella
- **Fonte:** [ondata/dati_catastali](https://github.com/ondata/dati_catastali) — particelle vettoriali per tutta l'Italia in formato Parquet, licenza CC BY 4.0 (citare OnData)
- **Note tecniche:** dataset interrogabile via DuckDB su file Parquet via HTTP — compatibile con DuckDB-Wasm già in uso nel progetto, nessuna infrastruttura aggiuntiva necessaria
