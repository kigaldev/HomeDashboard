import "server-only";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL, SEED_SQL } from "./schema";

/**
 * Capa mínima de acceso a Postgres.
 * - Producción (PC servidor): Postgres + pgvector vía DATABASE_URL.
 * - Desarrollo (Mac): si no hay DATABASE_URL se usa PGlite (Postgres embebido) en ./.data
 * Ambos aceptan SQL idéntico con parámetros $1, $2…
 */
type Row = Record<string, unknown>;
interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

const g = globalThis as unknown as { __hdDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    return {
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const r = await pool.query(sql, params);
        return r.rows as T[];
      },
      async exec(sql: string) {
        await pool.query(sql);
      },
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const isVercel = Boolean(process.env.VERCEL);
  const baseDir = isVercel ? "/tmp" : process.cwd();
  const dir = path.join(baseDir, ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  return {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const r = await pg.query<T>(sql, params);
      return r.rows;
    },
    async exec(sql: string) {
      await pg.exec(sql);
    },
  };
}

async function init(): Promise<Db> {
  const db = await connect();
  await db.exec(SCHEMA_SQL);
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from members");
  if (n === 0) await db.exec(SEED_SQL);
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__hdDb) {
    g.__hdDb = init().catch((e) => {
      g.__hdDb = undefined;
      throw e;
    });
  }
  return g.__hdDb;
}

export async function q<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql, params);
}
