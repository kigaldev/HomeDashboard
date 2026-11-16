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
type Row = any;
interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

export interface DbStatus {
  mode: "postgres" | "pglite-local" | "pglite-memory" | "stub" | "unknown";
  hasDatabaseUrl: boolean;
  lastError: string | null;
}

const g = globalThis as unknown as {
  __hdDb?: Promise<Db>;
  __hdDbStatus?: DbStatus;
};

function setDbStatus(partial: Partial<DbStatus>) {
  g.__hdDbStatus = {
    mode: g.__hdDbStatus?.mode ?? "unknown",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    lastError: g.__hdDbStatus?.lastError ?? null,
    ...partial,
  };
}

export function getDbStatus(): DbStatus {
  return (
    g.__hdDbStatus ?? {
      mode: "unknown",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      lastError: null,
    }
  );
}

async function connect(): Promise<Db> {
  const rawUrl = process.env.DATABASE_URL;

  // 1. Conexión a Postgres gestionado (Supabase, Neon, Servidor doméstico)
  if (rawUrl) {
    const { Pool } = await import("pg");
    const isLocal = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1");

    // Si es Supabase pooler o soporta pgbouncer, optimizar parámetros de conexión
    let connString = rawUrl;
    try {
      if (rawUrl.includes("pooler.supabase.com")) {
        const u = new URL(rawUrl);
        // Desactivar prepared statements conflictivos con el pooler
        if (!u.searchParams.has("pgbouncer")) {
          u.searchParams.set("pgbouncer", "true");
        }
        connString = u.toString();
      }
    } catch {
      connString = rawUrl;
    }

    const pool = new Pool({
      connectionString: connString,
      // Limitar pool a 2 conexiones para jamás sobrepasar el límite de pool_size (15) de Supabase
      // incluso con múltiples pestañas o peticiones simultáneas
      max: 2,
      idleTimeoutMillis: 5000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.warn("[db] Error en cliente inactivo del pool:", err.message);
      setDbStatus({ lastError: err.message });
    });

    setDbStatus({ mode: "postgres", hasDatabaseUrl: true, lastError: null });

    return {
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const client = await pool.connect();
        try {
          const r = await client.query(sql, params);
          return r.rows as T[];
        } finally {
          client.release();
        }
      },
      async exec(sql: string) {
        const client = await pool.connect();
        try {
          await client.query(sql);
        } finally {
          client.release();
        }
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
      setDbStatus({ mode: "pglite-memory", hasDatabaseUrl: false });
    } else {
      const dir = path.join(process.cwd(), ".data", "pglite");
      fs.mkdirSync(dir, { recursive: true });
      pg = await PGlite.create(dir);
      setDbStatus({ mode: "pglite-local", hasDatabaseUrl: false });
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
    setDbStatus({
      mode: "stub",
      hasDatabaseUrl: false,
      lastError: err instanceof Error ? err.message : String(err),
    });
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
    // Fast-path: en arranques fríos (especialmente serverless/pooler) evitar ejecutar ALTER TABLE si el esquema ya existe
    let needsSchema = true;
    try {
      const [check] = await db.query<{
        has_incomes: string | null;
        has_recurring: string | null;
        stores_count: number;
      }>(
        `select to_regclass('public.monthly_incomes')::text as has_incomes,
                to_regclass('public.recurring_expenses')::text as has_recurring,
                (select count(*)::int from stores) as stores_count`
      );
      if (check?.has_incomes && check?.has_recurring && (check?.stores_count ?? 0) > 0) {
        needsSchema = false;
      }
    } catch {
      needsSchema = true;
    }

    if (needsSchema) {
      await db.exec(SCHEMA_SQL);
      const res = await db.query<{ n: number }>("select count(*)::int as n from stores");
      const n = res[0]?.n ?? 0;
      if (n === 0) {
        await db.exec(SEED_SQL);
      }
    }
  } catch (err) {
    console.warn("[db] Error aplicando esquema o semillas:", err);
    setDbStatus({ lastError: err instanceof Error ? err.message : String(err) });
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

export async function q<T extends Row = Row>(sql: string, params: unknown[] = [], retries = 1): Promise<T[]> {
  try {
    const db = await getDb();
    return await db.query<T>(sql, params);
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 150));
      return q<T>(sql, params, retries - 1);
    }
    console.error(`[db] Error ejecutando consulta SQL: ${sql.slice(0, 80)}`, err);
    setDbStatus({ lastError: err instanceof Error ? err.message : String(err) });
    return [];
  }
}
