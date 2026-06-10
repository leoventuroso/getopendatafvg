import * as duckdb from '@duckdb/duckdb-wasm';
import { APP_CONFIG } from '../config';

const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

export type CommunityReport = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  lon: number;
  lat: number;
  created_at: string;
  pending?: boolean;
  photo_data_url?: string;
};

async function makeDuckDb(): Promise<{ db: duckdb.AsyncDuckDB; worker: Worker; workerUrl: string }> {
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const absoluteDbUrl = new URL(APP_CONFIG.duckdb.databaseUrl, window.location.href).toString();
  await db.registerFileURL('community_data.duckdb', absoluteDbUrl, duckdb.DuckDBDataProtocol.HTTP, false);
  return { db, worker, workerUrl };
}

export async function loadCommunityReports(): Promise<CommunityReport[]> {
  const { db, worker, workerUrl } = await makeDuckDb();
  const conn = await db.connect();
  try {
    await conn.query("ATTACH 'community_data.duckdb' AS community (READ_ONLY);");
    const result = await conn.query(`
      SELECT
        id::VARCHAR         AS id,
        category            AS category,
        title               AS title,
        description         AS description,
        status              AS status,
        lon                 AS lon,
        lat                 AS lat,
        created_at::VARCHAR AS created_at
      FROM community.reports;
    `);
    return result.toArray().map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        category: String(r.category ?? ''),
        title: String(r.title ?? ''),
        description: String(r.description ?? ''),
        status: String(r.status ?? ''),
        lon: Number(r.lon ?? 0),
        lat: Number(r.lat ?? 0),
        created_at: String(r.created_at ?? ''),
      };
    });
  } catch {
    return [];
  } finally {
    await conn.close();
    await db.terminate();
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
}

export async function runDuckDbSmokeQuery(): Promise<string> {
  // Selezioniamo in automatico il bundle WASM migliore per il browser corrente.
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  // DuckDB-Wasm gira in un worker: serve un URL assoluto, non relativo.
  const absoluteDbUrl = new URL(APP_CONFIG.duckdb.databaseUrl, window.location.href).toString();

  // Registriamo il file statico remoto come risorsa virtuale nel filesystem DuckDB.
  await db.registerFileURL('community_data.duckdb', absoluteDbUrl, duckdb.DuckDBDataProtocol.HTTP, false);

  const conn = await db.connect();

  try {
    await conn.query("ATTACH 'community_data.duckdb' AS community (READ_ONLY);");

    // Query PoC su tabella applicativa minima creata dalla pipeline (reports).
    const result = await conn.query(`
      SELECT COUNT(*)::INTEGER AS reports_count
      FROM community.reports;
    `);

    const row = result.toArray()[0] as { reports_count: number } | undefined;
    const reportsCount = row?.reports_count ?? 0;
    return `DuckDB online: tabella reports accessibile, record correnti = ${reportsCount}.`;
  } finally {
    await conn.close();
    await db.terminate();
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
}
