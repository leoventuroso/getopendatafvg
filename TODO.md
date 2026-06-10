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

## Modulo Base (Home)

### Pannello introduttivo
- **Stato:** ✅ implementato
- Card cliccabili per ciascun modulo con icone Bootstrap Icons, navigazione via `navigateToModule()`
- Mappa OSM con confine comunale evidenziato

### Lista frazioni
- **Stato:** ✅ implementato
- Frazioni ufficiali (Montereale Valcellina, Grizzo, Malnisio, San Leonardo) — borgate escluse
- Click → `flyTo()` sulla frazione selezionata, evidenziazione nella lista
- Dati: Nominatim/OSM + script `pipeline/scripts/build_frazioni_geojson.py`

### Metadati comunali
- **Stato:** ✅ parzialmente implementato — dati in `frontend/public/data/municipality_stats.json`
- Script ISTAT: `pipeline/scripts/fetch_istat_stats.py` (endpoint `esploradati.istat.it`)

**Dati demografici** ✅ — fonte: ISTAT SDMX (22_289, 164_164, 22_315, 22_293)
- Popolazione 2001–2026 (serie storica), famiglie, densità, età media (PN), indice vecchiaia (PN), pop. ≥65 anni (PN)

**Economia e mobilità** — rimosso (dati non accessibili via API SDMX per MV o PN dalla rete corrente; da aggiornare se accessibili: dataset DCCV_TAXOCCU1 per tasso occupazione PN)

**Turismo** — rimosso (dati comunali non disponibili via SDMX per comuni piccoli; fonte alternativa: open data Regione FVG)

**Rischio territorio** — fonte: normativa nazionale + PAI/ISPRA
- ✅ Zona sismica: 1 — Alta pericolosità (da Wikipedia/DPC)
- ⏳ Rischio idrogeologico: in attesa del file PAI FVG (vedi sezione Soccorso)

**Servizi e accessibilità** ✅ — fonte: OpenStreetMap (query Nominatim bounding-box)
- Farmacia: Farmacia Tre Effe (OSM node 3840697392)
- Scuole: 4 strutture mappate (Scuola Primaria P.D.M. Turoldo, Sec. I Grado Giovanni XXXIII, Scuola dell'Infanzia capoluogo, Scuola dell'Infanzia San Leonardo)
- Sportelli bancari: 2 — Banca 360 FVG + Unicredit (OSM, confermano dato ISTAT 117_1035)
- Pronto soccorso: Ospedale 'Immacolata Concezione', Maniago/Manià — 6 km, ~13 min
- Medico di base: rimosso (non mappato in OSM per MV)

**Territorio e geografia** ✅ — fonte: OpenStreetMap (Nominatim)
- Corsi d'acqua: Torrente Cellina
- Cime: Monte I Cameroni (1471 m), Monte Fortel (1436 m), Monte Fara (1345 m), Monte Spia (548 m), Monte Gloriassis (468 m)

**Dati derivati dal pipeline** ✅ — calcolati da file GeoJSON esistenti
- % vegetazione densa (da `greenery.geojson`, NDVI Sentinel-2)
- Km sentieri CAI e MTB (da `trails.geojson`, OSM)
- Km piste ciclabili (da `bike_cyclepaths.geojson`, `highway=cycleway`)


## Modulo Segnala (Community Participation)

### MVP ✅ implementato
- ✅ 6 categorie con icone Bootstrap Icons (strade, natura, rifiuti, illuminazione, segnaletica, proposta)
- ✅ Posizionamento segnalazione tramite click sulla mappa (pin rosso temporaneo)
- ✅ Form con categoria, titolo, descrizione e foto opzionale
- ✅ Resize foto client-side (canvas, max 1024 px, JPEG 75%) — preview thumbnail nel form
- ✅ Invio via `mailto:` pre-compilata al Comune (soggetto + corpo con coordinate e descrizione)
- ✅ Persistenza locale via `localStorage` — segnalazioni visibili sulla mappa subito e dopo il refresh
- ✅ Marker sulla mappa: cerchio bianco con icona della categoria
- ✅ Popup hover con titolo, categoria e thumbnail foto
- ✅ Filtro per categoria con chip bar
- ✅ Click su marker → espansione item in sidebar + scroll automatico
- ✅ Upvoting: bottone pollice su con contatore per ogni segnalazione; un voto per segnalazione per browser (localStorage); click di nuovo rimuove il voto

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

