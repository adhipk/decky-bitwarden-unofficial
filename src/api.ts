/**
 * Bitwarden Decky Plugin - Backend API Calls
 * 
 * Typed RPC functions for communicating with the Python backend.
 */

import { callable } from "@decky/api";
import type { BackendResponse, StatusData, VaultItem } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Environment Checks
// ─────────────────────────────────────────────────────────────────────────────

export const checkFlatpak = callable<[], BackendResponse<boolean>>("check_flatpak");
export const checkBitwarden = callable<[], BackendResponse<boolean>>("check_bitwarden");

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

export const getStatus = callable<[], BackendResponse<StatusData>>("status");
export const login = callable<[email: string, password: string], BackendResponse<void>>("login");
export const unlock = callable<[masterPassword: string], BackendResponse<string>>("unlock");
export const logout = callable<[], BackendResponse<void>>("logout");

// ─────────────────────────────────────────────────────────────────────────────
// Vault Operations
// ─────────────────────────────────────────────────────────────────────────────

export const listItems = callable<[], BackendResponse<VaultItem[]>>("list_items");
export const getItem = callable<[itemId: string], BackendResponse<VaultItem>>("get_item");
export const getTotp = callable<[itemId: string], BackendResponse<string>>("get_totp");

// ─────────────────────────────────────────────────────────────────────────────
// Clipboard
// ─────────────────────────────────────────────────────────────────────────────

export const copyToClipboard = callable<[text: string], BackendResponse<void>>("copy_to_clipboard");
