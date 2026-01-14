/**
 * Bitwarden Decky Plugin - Frontend Entry Point
 * 
 * State machine UI for Bitwarden vault access.
 */

import { useState, useEffect, useCallback } from "react";
import { staticClasses } from "@decky/ui";
import { definePlugin, toaster } from "@decky/api";
import { FaKey } from "react-icons/fa";

import type { AppState, VaultItem, StatusData } from "./types";
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
// Error Messages
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  FLATPAK_MISSING: "Flatpak is not installed on this system",
  BITWARDEN_MISSING: "Bitwarden is not installed",
  NOT_AUTHENTICATED: "Not logged in to Bitwarden",
  LOCKED: "Vault is locked",
  INVALID_CREDENTIALS: "Invalid email or password",
  COMMAND_FAILED: "Command failed. Please try again",
  CLIPBOARD_ERROR: "Failed to copy to clipboard",
  UNKNOWN_ERROR: "An unexpected error occurred",
};

function getErrorMessage(code: string | null): string {
  if (!code) return "An error occurred";
  return ERROR_MESSAGES[code] || code;
}

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

  const initializePlugin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check if Flatpak is available
      const flatpakResult = await api.checkFlatpak();
      if (!flatpakResult.ok) {
        setAppState("FLATPAK_MISSING");
        return;
      }

      // Step 2: Check if Bitwarden Flatpak is installed
      const bitwardenResult = await api.checkBitwarden();
      if (!bitwardenResult.ok) {
        setAppState("BITWARDEN_MISSING");
        return;
      }

      // Step 3: Get Bitwarden status
      const statusResult = await api.getStatus();
      if (!statusResult.ok) {
        setError(getErrorMessage(statusResult.error));
        setAppState("UNAUTHENTICATED");
        return;
      }

      const statusData = statusResult.data as StatusData;
      if (statusData.userEmail) {
        setUserEmail(statusData.userEmail);
      }

      // Map status to app state
      switch (statusData.status) {
        case "unauthenticated":
          setAppState("UNAUTHENTICATED");
          break;
        case "locked":
          setAppState("LOCKED");
          break;
        case "unlocked":
          // Auto-load items when unlocked
          await loadVaultItems();
          setAppState("UNLOCKED");
          break;
        default:
          setAppState("UNAUTHENTICATED");
      }
    } catch (err) {
      console.error("Initialization error:", err);
      setError("Failed to initialize plugin");
      setAppState("UNAUTHENTICATED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializePlugin();
  }, [initializePlugin]);

  // ───────────────────────────────────────────────────────────────────────────
  // Vault Loading
  // ───────────────────────────────────────────────────────────────────────────

  const loadVaultItems = async () => {
    try {
      const result = await api.listItems();
      if (result.ok && result.data) {
        // Filter to only show login items (type 1)
        const loginItems = (result.data as VaultItem[]).filter(
          (item) => item.type === 1
        );
        setVaultItems(loginItems);
      } else {
        console.error("Failed to load items:", result.error);
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("Error loading vault items:", err);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Authentication Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.login(email, password);
      
      if (result.ok) {
        setUserEmail(email);
        toaster.toast({
          title: "Success",
          body: "Logged in successfully",
        });
        setAppState("LOCKED");
      } else {
        setError(getErrorMessage(result.error));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (masterPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.unlock(masterPassword);
      
      if (result.ok) {
        toaster.toast({
          title: "Success",
          body: "Vault unlocked",
        });
        
        // Load vault items after unlock
        await loadVaultItems();
        setAppState("UNLOCKED");
      } else {
        setError(getErrorMessage(result.error));
      }
    } catch (err) {
      console.error("Unlock error:", err);
      setError("Unlock failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLock = async () => {
    setIsLoading(true);
    try {
      const result = await api.lock();
      if (result.ok) {
        setVaultItems([]);
        setSelectedItem(null);
        setAppState("LOCKED");
        toaster.toast({
          title: "Locked",
          body: "Vault has been locked",
        });
      } else {
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("Lock error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const result = await api.logout();
      if (result.ok) {
        setVaultItems([]);
        setSelectedItem(null);
        setUserEmail(undefined);
        setAppState("UNAUTHENTICATED");
        toaster.toast({
          title: "Logged Out",
          body: "You have been logged out",
        });
      } else {
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Vault Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleItemSelect = async (item: VaultItem) => {
    // Fetch full item details (includes password)
    setIsLoading(true);
    try {
      const result = await api.getItem(item.id);
      if (result.ok && result.data) {
        setSelectedItem(result.data as VaultItem);
      } else {
        // Fall back to the item we have
        setSelectedItem(item);
        if (result.error) {
          toaster.toast({
            title: "Warning",
            body: "Could not fetch full item details",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching item:", err);
      setSelectedItem(item);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedItem(null);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadVaultItems();
    setIsLoading(false);
    toaster.toast({
      title: "Refreshed",
      body: "Vault items updated",
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Clipboard Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleCopyUsername = async () => {
    if (!selectedItem?.login?.username) return;
    
    setIsCopying(true);
    try {
      const result = await api.copyToClipboard(selectedItem.login.username);
      if (result.ok) {
        toaster.toast({
          title: "Copied",
          body: "Username copied to clipboard",
        });
      } else {
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("Copy error:", err);
      toaster.toast({
        title: "Error",
        body: "Failed to copy username",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!selectedItem?.login?.password) return;
    
    setIsCopying(true);
    try {
      const result = await api.copyToClipboard(selectedItem.login.password);
      if (result.ok) {
        toaster.toast({
          title: "Copied",
          body: "Password copied to clipboard",
        });
      } else {
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("Copy error:", err);
      toaster.toast({
        title: "Error",
        body: "Failed to copy password",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyTotp = async () => {
    if (!selectedItem) return;
    
    setIsCopying(true);
    try {
      // Get fresh TOTP code from backend
      const totpResult = await api.getTotp(selectedItem.id);
      
      if (!totpResult.ok || !totpResult.data) {
        toaster.toast({
          title: "Error",
          body: totpResult.error === "COMMAND_FAILED" 
            ? "No TOTP configured for this item" 
            : getErrorMessage(totpResult.error),
        });
        return;
      }

      const result = await api.copyToClipboard(totpResult.data.totp);
      
      if (result.ok) {
        toaster.toast({
          title: "Copied",
          body: "TOTP code copied to clipboard",
        });
      } else {
        toaster.toast({
          title: "Error",
          body: getErrorMessage(result.error),
        });
      }
    } catch (err) {
      console.error("TOTP copy error:", err);
      toaster.toast({
        title: "Error",
        body: "Failed to copy TOTP",
      });
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
          onLogout={handleLogout}
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
          onLock={handleLock}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
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
