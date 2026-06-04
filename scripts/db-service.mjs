import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const command = process.argv[2] ?? "status";
const dockerCompose = existsOnPath("docker");

if (dockerCompose) {
  const args = command === "start" ? ["compose", "up", "-d", "postgres"]
    : command === "stop" ? ["compose", "stop", "postgres"]
    : command === "logs" ? ["compose", "logs", "-f", "postgres"]
    : ["compose", "ps", "postgres"];
  run("docker", args);
} else {
  const brew = "/opt/homebrew/bin/brew";
  const logPath = "/opt/homebrew/var/log/postgresql@15.log";
  const pgIsReady = findExisting([
    "/opt/homebrew/opt/postgresql@15/bin/pg_isready",
    "/usr/local/opt/postgresql@15/bin/pg_isready",
    "pg_isready"
  ]);

  if (command === "logs") run("tail", ["-f", logPath]);
  else if (command === "status" && pgIsReady) run(pgIsReady, ["-h", "127.0.0.1", "-p", "5432"]);
  else if (existsSync(brew)) run(brew, ["services", command === "stop" ? "stop" : command === "start" ? "start" : "list", "postgresql@15"]);
  else {
    console.error("Docker is unavailable and Homebrew PostgreSQL was not found. Install Docker Desktop or PostgreSQL 15.");
    process.exit(1);
  }
}

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}

function existsOnPath(cmd) {
  const paths = (process.env.PATH ?? "").split(":");
  return paths.some((dir) => existsSync(dir + "/" + cmd));
}

function findExisting(candidates) {
  return candidates.find((candidate) => candidate.includes("/") ? existsSync(candidate) : existsOnPath(candidate));
}
