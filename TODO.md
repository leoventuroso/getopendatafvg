# TODO — Montereale Valcellina Open

Questo file traccia le attività in sospeso che richiedono dati esterni, rilevamento sul campo, o integrazioni future.

---

## Modulo Resilienza & Protezione Civile

### Dati rischio idraulico e frana (PAI)
- **Stato:** in attesa di ricezione file ufficiale dalla Regione FVG
- **Flusso atteso:** il file PAI arriverà direttamente (shapefile o GeoJSON) — non sarà scaricato automaticamente
- **Azione:** quando arriva il file, scrivere `pipeline/scripts/process_pai.py` che:
  - Accetta il file PAI come input esplicito (path da argomento o posizione convenzionale in `frontend/src/data/`)
  - Clippa i poligoni al confine comunale (`monterealeBoundary.json`)
  - Separa rischio idraulico da rischio frana in due layer distinti
  - Produce `frontend/public/data/rescue/hydraulic_risk.geojson` e `landslide_risk.geojson`
  - Sostituisce i placeholder attuali

### Asset di emergenza (AED, HEMS, idranti, punti raccolta)
- **Stato:** in attesa di rilevamento sul campo
- **Flusso atteso:**
  1. Censimento fisico sul territorio (DAE, elisuperfici, idranti, punti raccolta)
  2. Inserimento dei dati su OpenStreetMap
  3. Eseguire `pipeline/scripts/build_rescue_geojson.py` — lo script è già implementato e scarica automaticamente da OSM via Overpass API (richiede rete non bloccata da firewall aziendale)

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
