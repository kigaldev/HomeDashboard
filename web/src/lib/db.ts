import "server-only";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL, SEED_SQL } from "./schema";

/**
 * Capa de acceso a Postgres resiliente para local y producción (Vercel / Servidor).
 * - Si DATABASE_URL está definida (Supabase, Neon, Postgres local): usa pg.Pool con SSL automático.
 * - Si no hay DATABASE_URL en local: usa PGlite embebido en ./.data/pglite.
 * - Si está en Vercel sin DATABASE_URL: usa PGlite en memoria para evitar errores de sistema de ficheros.
 */
type Row = Record<string, unknown>;
interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

const g = globalThis as unknown as { __hdDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  // 1. Conexión a Postgres gestionado (Supabase, Neon, Servidor doméstico)
  if (url) {
    const { Pool } = await import("pg");
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 5000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

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

  // 2. Fallback a PGlite (local o memoria)
  try {
    const { PGlite } = await import("@electric-sql/pglite");
    const isVercel = Boolean(process.env.VERCEL);

    let pg: any;
    if (isVercel) {
      // En serverless de Vercel, iniciar en memoria
      pg = await PGlite.create();
    } else {
      const dir = path.join(process.cwd(), ".data", "pglite");
      fs.mkdirSync(dir, { recursive: true });
      pg = await PGlite.create(dir);
    }

    return {
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const r = await pg.query(sql, params);
        return (r?.rows ?? []) as T[];
      },
      async exec(sql: string) {
        await pg.exec(sql);
      },
    };
  } catch (err) {
    console.warn("[db] PGlite no disponible o falló en serverless:", err);
    // Retornar un stub básico para evitar que la aplicación caiga en 500
    return {
      async query<T extends Row>(_sql: string, _params: unknown[] = []) {
        return [] as T[];
      },
      async exec(_sql: string) {},
    };
  }
}

async function init(): Promise<Db> {
  const db = await connect();
  try {
    await db.exec(SCHEMA_SQL);
    const res = await db.query<{ n: number }>("select count(*)::int as n from members");
    const n = res[0]?.n ?? 0;
    if (n === 0) {
      await db.exec(SEED_SQL);
    }
  } catch (err) {
    console.warn("[db] Error aplicando esquema o semillas:", err);
  }
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__hdDb) {
    g.__hdDb = init().catch((e) => {
      console.error("[db] Error fatal en getDb():", e);
      g.__hdDb = undefined;
      throw e;
    });
  }
  return g.__hdDb;
}

export async function q<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const db = await getDb();
    return await db.query<T>(sql, params);
  } catch (err) {
    console.error(`[db] Error ejecutando consulta SQL: ${sql.slice(0, 80)}`, err);
    return [];
  }
}
