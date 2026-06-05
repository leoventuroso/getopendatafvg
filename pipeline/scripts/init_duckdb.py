"""Initialize placeholder DuckDB for community overlays.

Questo script prepara uno schema minimo che verra' poi aggiornato
in modo asincrono da function/workflow serverless.
"""

from pathlib import Path

import duckdb


def main() -> None:
    db_path = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "public"
        / "data"
        / "community_data.duckdb"
    )
    db_path.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(str(db_path))
    con.execute(
        """
        DROP TABLE IF EXISTS urban_trees;

        CREATE OR REPLACE TABLE reports (
            id UUID,
            module VARCHAR,
            category VARCHAR,
            title VARCHAR,
            description VARCHAR,
            status VARCHAR,
            lon DOUBLE,
            lat DOUBLE,
            created_by_hash VARCHAR,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE OR REPLACE TABLE ideas (
            id UUID,
            module VARCHAR,
            title VARCHAR,
            description VARCHAR,
            area_name VARCHAR,
            created_by_hash VARCHAR,
            created_at TIMESTAMP
        );

        CREATE OR REPLACE TABLE idea_votes (
            idea_id UUID,
            voter_hash VARCHAR,
            value SMALLINT,
            created_at TIMESTAMP
        );

        CREATE OR REPLACE TABLE emergency_assets (
            id UUID,
            asset_type VARCHAR,
            name VARCHAR,
            accessibility VARCHAR,
            lon DOUBLE,
            lat DOUBLE,
            source VARCHAR,
            last_verified_at TIMESTAMP
        );
        """
    )
    con.close()
    print(f"[Fase 0] Database inizializzato: {db_path}")


if __name__ == "__main__":
    main()
