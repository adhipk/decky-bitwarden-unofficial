/**
 * Bitwarden Decky Plugin - Frontend Entry Point
 * 
 * State machine UI for Bitwarden vault access.
 */

import { useState, useEffect } from "react";
import { staticClasses } from "@decky/ui";
import { definePlugin, toaster } from "@decky/api";
import { FaKey } from "react-icons/fa";

import type { AppState, VaultItem } from "./types";
import {
  Loading,
  FlatpakMissing,
  BitwardenMissing,
  LoginForm,
  UnlockForm,
  VaultList,
  ItemDetail,
} from "./components";
import * as api from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// Main Content Component
// ─────────────────────────────────────────────────────────────────────────────

function Content() {
  const [appState, setAppState] = useState<AppState>("LOADING");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    initializePlugin();
  }, []);

  const initializePlugin = async () => {
    // TODO: Implement initialization flow
    // 1. Check flatpak
    // 2. Check bitwarden
    // 3. Get status
    setAppState("LOADING");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Authentication Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleLogin = async (email: string, password: string) => {
    // TODO: Implement login
    setIsLoading(true);
    setError(null);
    try {
      // await api.login(email, password);
    } catch (err) {
      setError("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (masterPassword: string) => {
    // TODO: Implement unlock
    setIsLoading(true);
    setError(null);
    try {
      // await api.unlock(masterPassword);
    } catch (err) {
      setError("Unlock failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // TODO: Implement logout
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Vault Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleItemSelect = (item: VaultItem) => {
    setSelectedItem(item);
  };

  const handleBack = () => {
    setSelectedItem(null);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Clipboard Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleCopyUsername = async () => {
    if (!selectedItem?.login?.username) return;
    // TODO: Implement copy
    setIsCopying(true);
    try {
      // await api.copyToClipboard(selectedItem.login.username);
      toaster.toast({ title: "Copied", body: "Username copied to clipboard" });
    } catch {
      toaster.toast({ title: "Error", body: "Failed to copy" });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!selectedItem?.login?.password) return;
    // TODO: Implement copy
    setIsCopying(true);
    try {
      // await api.copyToClipboard(selectedItem.login.password);
      toaster.toast({ title: "Copied", body: "Password copied to clipboard" });
    } catch {
      toaster.toast({ title: "Error", body: "Failed to copy" });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyTotp = async () => {
    if (!selectedItem) return;
    // TODO: Implement TOTP copy
    setIsCopying(true);
    try {
      // const result = await api.getTotp(selectedItem.id);
      toaster.toast({ title: "Copied", body: "TOTP copied to clipboard" });
    } catch {
      toaster.toast({ title: "Error", body: "Failed to copy TOTP" });
    } finally {
      setIsCopying(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render State Machine
  // ───────────────────────────────────────────────────────────────────────────

  // Item detail view (sub-state of UNLOCKED)
  if (selectedItem) {
    return (
      <ItemDetail
        item={selectedItem}
        onCopyUsername={handleCopyUsername}
        onCopyPassword={handleCopyPassword}
        onCopyTotp={handleCopyTotp}
        onBack={handleBack}
        isCopying={isCopying}
      />
    );
  }

  // Main state machine
  switch (appState) {
    case "LOADING":
      return <Loading />;

    case "FLATPAK_MISSING":
      return <FlatpakMissing />;

    case "BITWARDEN_MISSING":
      return <BitwardenMissing />;

    case "UNAUTHENTICATED":
      return (
        <LoginForm
          onLogin={handleLogin}
          isLoading={isLoading}
          error={error}
        />
      );

    case "LOCKED":
      return (
        <UnlockForm
          onUnlock={handleUnlock}
          isLoading={isLoading}
          error={error}
          userEmail={userEmail}
        />
      );

    case "UNLOCKED":
      return (
        <VaultList
          items={vaultItems}
          onItemSelect={handleItemSelect}
          onLogout={handleLogout}
          isLoading={isLoading}
        />
      );

    default:
      return <Loading />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Definition
// ─────────────────────────────────────────────────────────────────────────────

export default definePlugin(() => {
  console.log("Bitwarden plugin initializing");

  return {
    name: "Bitwarden",
    titleView: (
      <div className={staticClasses.Title}>Bitwarden</div>
    ),
    content: <Content />,
    icon: <FaKey />,
    onDismount() {
      console.log("Bitwarden plugin unloading");
    },
  };
});
