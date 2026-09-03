# Deploy per un nuovo comune

Questa piattaforma è nata per Montereale Valcellina, ma il codice non è
legato a quel comune: tutto ciò che è specifico del territorio vive in un
unico file di configurazione più una manciata di file di dati grezzi. Per
adattarla a un altro comune, procurati i tuoi dati grezzi (vedi sotto) e
compila i file elencati qui - non serve toccare il codice applicativo.

---

## 1. Configurazione - `frontend/src/comune.config.json`

Unica fonte di verità, letta sia dal frontend (`frontend/src/config.ts`) sia
da ogni script della pipeline Python (`pipeline/lib/comune_config.py`).

```jsonc
{
  "name": "Nome del comune",
  "province": "Nome provincia",
  "region": "Nome regione",
  "istatCode": "123456",          // codice ISTAT del comune
  "provinceIstatCode": "ITDxx",   // codice ISTAT NUTS3 della provincia
  "osmAreaId": 3600000000,        // relation OSM + 3600000000, vedi sotto
  "email": "info@comune.example.it",
  "boundaryFile": "frontend/src/data/municipalBoundary.json",
  "map": { "center": [lon, lat], "zoom": 12 },
  "ltsEmbedView": { "lat": 0, "lon": 0, "zoom": 12.86 }
}
```

**Come trovare i valori:**
- `osmAreaId` - cerca il comune su [openstreetmap.org](https://www.openstreetmap.org),
  apri la relation del confine amministrativo, prendi l'ID e sommaci
  `3600000000` (è la convenzione Overpass per le area query: `relation id + 3600000000`).
- `istatCode` / `provinceIstatCode` - [Codici statistici ISTAT delle unità amministrative](https://www.istat.it/it/archivio/6789).
- `ltsEmbedView` - lat/lon/zoom di un punto qualsiasi dentro il comune: l'embed
  di [stressinbici.it](https://stressinbici.it) fa da solo lo swap sul comune giusto,
  non serve uno slug.

---

## 2. Confine comunale - `frontend/src/data/municipalBoundary.json`

Un singolo `Feature` GeoJSON (geometria `Polygon`/`MultiPolygon`, EPSG:4326)
con il confine amministrativo. Usato per ritagliare NDVI, NBR e LST alla
sola area del comune.

**Dove trovarlo:** esporta il confine dalla relation OSM del comune (es. via
Nominatim: `https://nominatim.openstreetmap.org/search?q=<comune>&polygon_geojson=1&format=jsonv2`),
oppure dai confini amministrativi ISTAT.

---

## 3. Frazioni e borgate - `frontend/src/data/localities.json`

Lista a mano di frazioni/borgate con nome, coordinate e raggio approssimato
(in metri) per il pannello Home. Non è derivabile in automatico da OSM in
modo affidabile per ogni comune - è un dato curato, non un dato grezzo
scaricabile. Formato: vedi il file esistente come esempio.

Se il tuo comune non ha frazioni, lascia `"localities": []`.

---

## 4. Zone di esclusione (opzionale) - `frontend/src/data/exclusions.json`

Solo se hai bisogno di escludere manualmente un'area specifica da alcuni
layer (es. una zona che OSM tagga in modo incoerente con la realtà). Se non
ti serve, cancella il file o lascialo con `"features": []` - nessun errore,
la pipeline semplicemente non esclude nulla.

---

## 5. Statistiche comunali - `frontend/public/data/municipality_stats.json`

Questo file è un "seed" che compili a mano una volta (nome, provincia,
regione, codice ISTAT, e i fatti che nessuna API fornisce: cime, farmacia,
scuole, pronto soccorso più vicino, zona sismica). Lo script
`pipeline/scripts/fetch_istat_stats.py` lo legge e aggiorna **solo** i campi
disponibili via SDMX ISTAT (popolazione, famiglie, densità, età media),
lasciando intatti i campi manuali. Copia la struttura del file esistente,
svuota i valori specifici di Montereale Valcellina e compila i tuoi.

---

## 6. Dati satellitari e DEM grezzi (te li procuri tu)

Questi file **non sono nel repo** (sono gitignored, troppo pesanti) e vanno
scaricati per l'area del tuo comune:

| File | Serve a | Dove scaricarlo |
|---|---|---|
| `frontend/src/data/*.SAFE/` (scena Sentinel-2 L2A) | NDVI, NBR (moduli Green) | [Copernicus Browser](https://browser.dataspace.copernicus.eu/) |
| `frontend/src/data/*.tif` (banda lwir11 Landsat) | LST - temperatura suolo | [USGS EarthExplorer](https://earthexplorer.usgs.gov/), Collection 2 L2 |
| `frontend/src/data/dem.tif` (DEM/LiDAR) | Pendenza sentieri/ciclabili | Portale LiDAR/DEM della tua regione, o [Copernicus DEM](https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model) |

Una volta scaricati, esegui la pipeline (`cd pipeline && make all` - vedi
[pipeline/README.md](pipeline/README.md) per i target singoli).

---

## 7. Deploy

GitHub Pages pubblica sempre alla radice del nome della repo
(`<utente>.github.io/<nome-repo>/`). Due opzioni:

**A - il nome del comune non serve nel link** (repo dedicata a un solo
comune, es. `mappa-civica-<comune>`):
1. Fai il fork/rename della repo con quel nome.
2. Aggiorna `frontend/vite.config.ts` → `base: '/<nome-repo>/'`.
3. `.github/workflows/deploy.yml` resta invariato (pubblica direttamente
   `frontend/dist`).

**B - repo con nome generico, comune come segmento extra nell'URL** (es.
repo `mappa-civica`, link `.../mappa-civica/<comune>/` - la configurazione
di questo stesso repo):
1. Aggiorna `frontend/vite.config.ts` → `base: '/<nome-repo>/<comune>/'`.
2. In `.github/workflows/deploy.yml`, lo step "Assemble Pages artifact"
   copia `frontend/dist` dentro `publish/<comune>/` invece di pubblicarlo
   alla radice - cambia `montereale-valcellina` con lo slug del tuo comune
   in quello step (è l'unico punto comune-specifico rimasto nel workflow).

`refresh-data.yml` funziona invariato in entrambi i casi: non ha nulla di
comune-specifico, si limita a eseguire `make <target>`.

A parte questo, non serve toccare nessun componente React o script Python
oltre ai file elencati sopra: leggono tutti da `comune.config.json` o dai
file dati.
