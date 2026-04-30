"use client";

export type WorkMeshDataMode = "mock" | "api";

export function getDataMode(): WorkMeshDataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "mock";
}

export function isApiMode() {
  return getDataMode() === "api";
}

export function isMockMode() {
  return getDataMode() === "mock";
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

export function isMockMapEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_MAP !== "false";
}

export function isTestnetPaymentsEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_TESTNET_PAYMENTS === "true";
}
