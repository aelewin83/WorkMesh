import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const migrationsDir = path.join(root, "apps/web/db/migrations");
const databaseUrl = process.env.DATABASE_URL;
const command = process.argv[2] ?? "migrate";
const psqlBin = process.env.PSQL_BIN || findPsql();

if (!databaseUrl) {
  console.error("DATABASE_URL is required for database scripts.");
  process.exit(1);
}

async function main() {
  if (command === "migrate") return migrate();
  if (command === "reset" || command === "test:reset") return reset(command === "test:reset");
  if (command === "seed") return seed();
  console.error("Unknown db command:", command);
  process.exit(1);
}

async function migrate() {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    console.log("Applying", file);
    await psql(["-v", "ON_ERROR_STOP=1", "-f", path.join(migrationsDir, file)]);
  }
}

async function reset(isTest) {
  const sql = [
    "DROP TABLE IF EXISTS relai_state_snapshots CASCADE;",
    "DROP TABLE IF EXISTS indexer_checkpoints CASCADE;",
    "DROP TABLE IF EXISTS chain_events CASCADE;",
    "DROP TABLE IF EXISTS disclosure_audits CASCADE;",
    "DROP TABLE IF EXISTS notifications CASCADE;",
    "DROP TABLE IF EXISTS payment_history CASCADE;",
    "DROP TABLE IF EXISTS escrow_states CASCADE;",
    "DROP TABLE IF EXISTS encrypted_messages CASCADE;",
    "DROP TABLE IF EXISTS message_threads CASCADE;",
    "DROP TABLE IF EXISTS completion_proofs CASCADE;",
    "DROP TABLE IF EXISTS agreement_events CASCADE;",
    "DROP TABLE IF EXISTS agreements CASCADE;",
    "DROP TABLE IF EXISTS gigs CASCADE;",
    "DROP TABLE IF EXISTS contractor_profiles CASCADE;"
  ].join("\n");
  await psql(["-v", "ON_ERROR_STOP=1", "-c", sql]);
  await migrate();
  if (!isTest) await seed();
}

async function seed() {
  const statePaths = [
    path.join(root, "apps/web/.relai-dev/contractor-db.json"),
    path.join(root, "apps/web/db/fixtures/contractor-state.json")
  ];
  let state;
  let sourcePath;
  for (const statePath of statePaths) {
    try {
      state = await readFile(statePath, "utf8");
      sourcePath = statePath;
      break;
    } catch {
      // Try the next deterministic seed source.
    }
  }
  if (!state) {
    console.log("No seed state found. Expected apps/web/.relai-dev/contractor-db.json or apps/web/db/fixtures/contractor-state.json.");
    return;
  }
  const escaped = state.replaceAll("'", "''");
  await psql(["-v", "ON_ERROR_STOP=1", "-c", "INSERT INTO relai_state_snapshots (id, state, created_at, updated_at) VALUES ('contractor-command', '" + escaped + "'::jsonb, now(), now()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now();"]);
  console.log("Seeded relai_state_snapshots from " + path.relative(root, sourcePath) + ".");
}

function psql(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(psqlBin, [databaseUrl, ...args], { stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("psql exited with " + code)));
    child.on("error", reject);
  });
}

function findPsql() {
  const candidates = [
    "psql",
    "/opt/homebrew/opt/postgresql@15/bin/psql",
    "/opt/homebrew/opt/postgresql@16/bin/psql",
    "/usr/local/opt/postgresql@15/bin/psql",
    "/usr/local/opt/postgresql@16/bin/psql"
  ];
  return candidates.find((candidate) => {
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }) ?? "psql";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
