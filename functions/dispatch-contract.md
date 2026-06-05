# Contratto eventi `repository_dispatch`

Questo documento definisce il payload minimo per aggiornare in modo asincrono il layer dinamico (`community_data.duckdb`) senza backend always-on.

## Event type

- `community-write-requested`

## Payload consigliato (`client_payload`)

```json
{
  "operation": "upsert_report",
  "module": "participation",
  "record": {
    "id": "2e5ac4d7-23f6-49cb-b8dd-9e8297f4de0f",
    "category": "urban_safety",
    "title": "Illuminazione assente",
    "description": "Lampione non funzionante in via XX",
    "status": "open",
    "lon": 12.664,
    "lat": 46.16,
    "created_by_hash": "sha256:anonymous-user-hash",
    "created_at": "2026-06-01T09:00:00Z",
    "updated_at": "2026-06-01T09:00:00Z"
  },
  "request_id": "req_20260601_0001",
  "requested_at": "2026-06-01T09:00:01Z"
}
```

## Operazioni previste (Fase 0 -> Fase 1)

- `upsert_report`
- `upsert_idea`
- `register_vote`
- `upsert_emergency_asset`

## Regole minime

- `request_id` deve essere univoco per deduplicare richieste ripetute.
- `module` deve appartenere all'elenco moduli roadmap (`outdoor`, `resilience`, `emergency`, `participation`, `green`, `ai`).
- `record.id` usa UUID v4.
- Coordinate in WGS84 (`lon`, `lat`).
- Nessun dato personale in chiaro: usare hash pseudonimi lato client.
