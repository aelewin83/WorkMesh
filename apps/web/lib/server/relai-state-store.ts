import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import type { ContractorCommandApiStateDto } from "@/lib/contractor-dtos";

export type RelaiStateStoreMode = "file-dev" | "postgres";
export type RelaiStateFactory = () => ContractorCommandApiStateDto;

export interface RelaiStateStore {
  readonly mode: RelaiStateStoreMode;
  read(): Promise<ContractorCommandApiStateDto>;
  write(state: ContractorCommandApiStateDto): Promise<ContractorCommandApiStateDto>;
  transaction(mutator: (state: ContractorCommandApiStateDto) => ContractorCommandApiStateDto | Promise<ContractorCommandApiStateDto>): Promise<ContractorCommandApiStateDto>;
}

const snapshotId = "contractor-command";
let postgresPool: Pool | undefined;

export function getStateStoreMode(): RelaiStateStoreMode {
  const configured = process.env.RELAI_STORAGE_MODE ?? process.env.RELAI_STATE_STORE;
  return configured === "postgres" ? "postgres" : "file-dev";
}

export function createRelaiStateStore(seed: RelaiStateFactory): RelaiStateStore {
  return getStateStoreMode() === "postgres" ? new PostgresStateStore(seed) : new FileDevStateStore(seed);
}

class FileDevStateStore implements RelaiStateStore {
  readonly mode = "file-dev" as const;
  private readonly dbPath = path.join(process.cwd(), ".relai-dev", "contractor-db.json");
  private pending = Promise.resolve();

  constructor(private readonly seed: RelaiStateFactory) {}

  async read() {
    try {
      return JSON.parse(await readFile(this.dbPath, "utf8")) as ContractorCommandApiStateDto;
    } catch {
      const seeded = this.seed();
      await this.write(seeded);
      return seeded;
    }
  }

  async write(state: ContractorCommandApiStateDto) {
    await mkdir(path.dirname(this.dbPath), { recursive: true });
    await writeFile(this.dbPath, JSON.stringify(state, null, 2));
    return state;
  }

  async transaction(mutator: (state: ContractorCommandApiStateDto) => ContractorCommandApiStateDto | Promise<ContractorCommandApiStateDto>) {
    const run = async () => {
      const current = await this.read();
      const next = await mutator(current);
      return this.write(next);
    };
    const next = this.pending.then(run, run);
    this.pending = next.then(() => undefined, () => undefined);
    return next;
  }
}

class PostgresStateStore implements RelaiStateStore {
  readonly mode = "postgres" as const;

  constructor(private readonly seed: RelaiStateFactory) {}

  async read(): Promise<ContractorCommandApiStateDto> {
    await ensureSnapshotTable();
    const result = await getPool().query<{ state: ContractorCommandApiStateDto }>("SELECT state FROM relai_state_snapshots WHERE id = $1", [snapshotId]);
    if (result.rowCount && result.rows[0]?.state) return result.rows[0].state;
    const seeded = this.seed();
    await this.write(seeded);
    return seeded;
  }

  async write(state: ContractorCommandApiStateDto): Promise<ContractorCommandApiStateDto> {
    await ensureSnapshotTable();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await writeSnapshot(client, state);
      await client.query("COMMIT");
      return state;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction(mutator: (state: ContractorCommandApiStateDto) => ContractorCommandApiStateDto | Promise<ContractorCommandApiStateDto>): Promise<ContractorCommandApiStateDto> {
    await ensureSnapshotTable();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(917014)");
      const result = await client.query<{ state: ContractorCommandApiStateDto }>("SELECT state FROM relai_state_snapshots WHERE id = $1 FOR UPDATE", [snapshotId]);
      const current = result.rowCount && result.rows[0]?.state ? result.rows[0].state : this.seed();
      const next = await mutator(current);
      await writeSnapshot(client, next);
      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when RELAI_STORAGE_MODE=postgres");
  }
  postgresPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return postgresPool;
}

async function ensureSnapshotTable() {
  await getPool().query("CREATE TABLE IF NOT EXISTS relai_state_snapshots (id TEXT PRIMARY KEY, state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
}

async function writeSnapshot(client: PoolClient, state: ContractorCommandApiStateDto) {
  await client.query(
    "INSERT INTO relai_state_snapshots (id, state, created_at, updated_at) VALUES ($1, $2::jsonb, now(), now()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()",
    [snapshotId, JSON.stringify(state)]
  );
}
