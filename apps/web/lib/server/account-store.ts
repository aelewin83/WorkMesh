import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type RelaiAccountRole = "contractor" | "employer";

type StoredAccount = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  role: RelaiAccountRole;
  walletAddress: string;
  createdAt: string;
};

const accountFile = path.join(process.cwd(), ".relai-dev", "accounts.json");
const validInvites = new Set(["RELAI-BETA", "RELAI-PRIVATE", "RELai-BETA"]);

export function normalizeUsername(username: unknown) {
  const value = String(username ?? "").trim().toLowerCase();
  if (!isValidAccountIdentifier(value)) {
    throw new Error("Use a valid email address or 3-24 characters using letters, numbers, dots, hyphens, or underscores.");
  }
  return value;
}

export function validateInvite(inviteCode: unknown) {
  if (!validInvites.has(String(inviteCode ?? "").trim())) throw new Error("Invite code is not valid for this beta.");
}

export async function checkUsername(username: unknown) {
  const normalized = normalizeUsername(username);
  const accounts = await readAccounts();
  const available = !accounts.some((account) => account.username === normalized);
  const isEmail = normalized.includes("@");
  return {
    username: normalized,
    available,
    suggestions: available || isEmail ? [] : [normalized + "7", normalized.replace(/[._-]/g, "") + ".ops", normalized + ".relai"]
  };
}

export async function registerAccount(input: Record<string, unknown>) {
  validateInvite(input.inviteCode);
  const username = normalizeUsername(input.username);
  const password = String(input.password ?? "");
  const confirmPassword = String(input.confirmPassword ?? "");
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");
  const accounts = await readAccounts();
  if (accounts.some((account) => account.username === username)) throw new Error("That username is already taken.");
  const salt = randomBytes(16).toString("hex");
  const role: RelaiAccountRole = input.role === "employer" ? "employer" : "contractor";
  const account: StoredAccount = {
    id: "acct_" + randomBytes(8).toString("hex"),
    username,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    role,
    walletAddress: "0x" + Buffer.from("relai:" + username).toString("hex").padEnd(40, "0").slice(0, 40),
    createdAt: new Date().toISOString()
  };
  accounts.push(account);
  await writeAccounts(accounts);
  return publicAccount(account);
}

export async function loginAccount(input: Record<string, unknown>) {
  const username = normalizeUsername(input.username);
  const password = String(input.password ?? "");
  const account = (await readAccounts()).find((item) => item.username === username);
  if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) throw new Error("Username or password is incorrect.");
  return publicAccount(account);
}

function publicAccount(account: StoredAccount) {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    walletAddress: account.walletAddress,
    createdAt: account.createdAt
  };
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string) {
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isValidAccountIdentifier(value: string) {
  const usernamePattern = /^[a-z0-9._-]{3,24}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return usernamePattern.test(value) || emailPattern.test(value);
}

async function readAccounts() {
  try {
    return JSON.parse(await readFile(accountFile, "utf8")) as StoredAccount[];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: StoredAccount[]) {
  await mkdir(path.dirname(accountFile), { recursive: true });
  await writeFile(accountFile, JSON.stringify(accounts, null, 2));
}
