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
// CLI Debug Output
// ─────────────────────────────────────────────────────────────────────────────

export interface BwCommandOutput {
  stdout?: string;
  stderr?: string;
  returncode?: number;
  message?: string;
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
// Two-factor Authentication (2FA)
// ─────────────────────────────────────────────────────────────────────────────

export const TWO_FACTOR_METHOD = {
  AUTHENTICATOR: 0,
  EMAIL: 1,
  YUBIKEY: 3,
} as const;

export type TwoFactorMethod = (typeof TWO_FACTOR_METHOD)[keyof typeof TWO_FACTOR_METHOD];

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | "FLATPAK_MISSING"
  | "BITWARDEN_MISSING"
  | "NOT_AUTHENTICATED"
  | "LOCKED"
  | "INVALID_CREDENTIALS"
  | "TWO_FACTOR_REQUIRED"
  | "INVALID_2FA_CODE"
  | "COMMAND_FAILED"
  | "CLIPBOARD_ERROR"
  | "UNKNOWN_ERROR";
