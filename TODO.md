# TODO - Montereale Valcellina Open

Attività in sospeso: dati esterni da ricevere, rilievi sul campo, integrazioni future.

---

## Modulo Soccorso ed Emergenza

### Rii a rischio - da validare con il Gruppo Comunale di Protezione Civile
- Posizione esatta del sistema Cian/Cjasarile/Bennata (ora su un punto di zona, marcatore sbiadito).
- Se "Rio Cao Malnisio" / "Rio Bala Busa" siano lo stesso sopralluogo del Cjasarile.
- Il rio "06" (senza nome né coordinate, foto 2007), oggi escluso dalla mappa.

### Presidi di soccorso - dati mancanti
- **Idranti** e **punti di raccolta**: nessun dato (placeholder svuotati). Servono un elenco del gestore/Comune o un rilievo, poi inserimento su OpenStreetMap e `make rescue`.
- **DAE**: i punti `geocoded: true` in `aed_comune.geojson` hanno posizione dall'indirizzo - verificarli sul posto o rimpiazzarli con i nodi OSM man mano che si rifiniscono (la dedup a ~60 m li assorbe). Aggiungere dove noti `access`, `opening_hours`, `defibrillator:location`, `operator`.

### Incendi boschivi - estensioni possibili (stesso WFS IRDAT FVG)
- `ZONE_RISC:SUPERFICIE_BOSCATA_BRUCIATA` / `_PASCOLO` / `_NON_BOSCATA_BRUCIATA` - superficie bruciata per copertura del suolo (più granulare dei perimetri; ora non usata).

### Widget meteo/idrometrico ARPA FVG - serve un feed lato server
- Obiettivo: pannello con precipitazioni ultime 24h, livello idrometrico del Torrente Cellina, stato allerta.
- Blocco: OSMER (`dev.meteo.fvg.it/xml/stazioni/<COD>.xml`) **non manda header CORS**, quindi un `fetch` dal sito statico è bloccato dal browser; inoltre OSMER ha solo dati meteo (niente livello idrometrico) e la stazione più vicina è Piancavallo (montagna, ~10 km), non rappresentativa dell'abitato.
- Opzioni: (a) workflow GitHub Actions schedulato (es. ogni 1-2h) che interroga ARPA/OSMER lato CI e committa un piccolo `arpa.json` che il widget legge; (b) micro-proxy serverless (Cloudflare Worker) che aggiunge CORS. Il dato idrometrico va cercato nella rete idro della Protezione Civile FVG (non OSMER).

---

## Modulo Segnala (Community Participation)

### Segnalazioni condivise fra utenti - serve un backend
- Oggi ogni segnalazione vive solo nel `localStorage` di chi la crea (+ email `mailto:`); nessuno vede quelle degli altri, ed è attivo solo l'"Elimina" locale.
- Opzioni: (a) backend gestito tipo Supabase (Postgres + API + RLS, chiave anon nel frontend) - CRUD e cancellazione veri, ma rompe il "no backend / zero costi"; (b) `repository_dispatch` → GitHub Actions che ricostruisce un file condiviso nel repo (abbozzato in `functions/`) - latenza di minuti, serve un proxy per il token.
- La cancellazione "vera" e i voti condivisi dipendono da questa scelta.

### Export report per l'amministrazione
- Download CSV/PDF delle segnalazioni ordinate per voti e zona, per prioritizzare gli interventi.

### Classificazione automatica foto
- Modello leggero lato browser (YOLO/MobileNet) per suggerire la categoria dalla foto allegata (es. buca → "Viabilità e strade").

### Integrazione dati catastali
- Selezione della particella catastale sulla mappa per georeferenziare la segnalazione; il form si pre-compila con foglio e numero particella.
- Fonte: [ondata/dati_catastali](https://github.com/ondata/dati_catastali) - particelle vettoriali per l'Italia in Parquet, CC BY 4.0 (citare OnData). Interrogabile via DuckDB-Wasm su Parquet HTTP, già in uso nel progetto.
