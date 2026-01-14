/**
 * Bitwarden Decky Plugin - Type Definitions
 */

// ─────────────────────────────────────────────────────────────────────────────
// App State
// ─────────────────────────────────────────────────────────────────────────────

export type AppState =
  | "LOADING"
  | "FLATPAK_MISSING"
  | "BITWARDEN_MISSING"
  | "UNAUTHENTICATED"
  | "LOCKED"
  | "UNLOCKED";

// ─────────────────────────────────────────────────────────────────────────────
// Backend Response
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendResponse<T = unknown> {
  ok: boolean;
  error: string | null;
  data: T | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitwarden Status
// ─────────────────────────────────────────────────────────────────────────────

export type BitwardenStatus = "unauthenticated" | "locked" | "unlocked";

export interface StatusData {
  status: BitwardenStatus;
  userEmail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vault Items
// ─────────────────────────────────────────────────────────────────────────────

export interface VaultItemLogin {
  username?: string;
  password?: string;
  totp?: string;
  uris?: Array<{ uri: string }>;
}

export interface VaultItem {
  id: string;
  name: string;
  type: number; // 1 = login, 2 = note, 3 = card, 4 = identity
  login?: VaultItemLogin;
  notes?: string;
  folderId?: string;
  favorite?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | "FLATPAK_MISSING"
  | "BITWARDEN_MISSING"
  | "NOT_AUTHENTICATED"
  | "LOCKED"
  | "INVALID_CREDENTIALS"
  | "COMMAND_FAILED"
  | "CLIPBOARD_ERROR"
  | "UNKNOWN_ERROR";
