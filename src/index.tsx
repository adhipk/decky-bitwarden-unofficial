/**
 * Bitwarden Decky Plugin - Frontend Entry Point
 *
 * State machine UI for Bitwarden vault access.
 */

import { useState, useEffect, useCallback } from "react";
import {
  staticClasses,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  DialogBody,
  DialogControlsSection,
  ModalRoot,
  showModal,
} from "@decky/ui";
import { definePlugin, toaster } from "@decky/api";
import { FaKey } from "react-icons/fa";

import {
  TWO_FACTOR_METHOD,
  type AppState,
  type VaultItem,
  type StatusData,
  type TwoFactorMethod,
  type BwCommandOutput,
} from "./types";
import { Loading, VaultList, ItemDetail } from "./components";
import * as api from "./api";

// Optional build-time dev prefill (injected by rollup.config.js via @rollup/plugin-replace)
declare const __DECKY_BW_DEV_EMAIL__: string;
declare const __DECKY_BW_DEV_PASSWORD__: string;

const DEV_PREFILL_EMAIL = (__DECKY_BW_DEV_EMAIL__ || "").trim();
const DEV_PREFILL_PASSWORD = __DECKY_BW_DEV_PASSWORD__ || "";

// ─────────────────────────────────────────────────────────────────────────────
// Error Messages
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  FLATPAK_MISSING: "Flatpak is not installed on this system",
  BITWARDEN_MISSING: "Bitwarden is not installed",
  NOT_AUTHENTICATED: "Not logged in to Bitwarden",
  LOCKED: "Vault is locked",
  INVALID_CREDENTIALS: "Invalid email or password",
  TWO_FACTOR_REQUIRED: "Two-factor authentication required",
  INVALID_2FA_CODE: "Invalid two-factor code",
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

type AuthModalMode = "LOGIN" | "UNLOCK";

function AuthModal(props: {
  mode: AuthModalMode;
  closeModal: () => void;
  userEmail?: string;
  isLoading: boolean;
  error: string | null;
  debugOutput: BwCommandOutput | null;
  onLogin: (email: string, password: string) => Promise<"OK" | "TWO_FACTOR_REQUIRED" | "ERROR">;
  onLogin2fa: (
    email: string,
    password: string,
    method: TwoFactorMethod,
    code: string,
  ) => Promise<"OK" | "ERROR">;
  onUnlock: (masterPassword: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
}) {
  const {
    mode,
    closeModal,
    userEmail,
    isLoading,
    error,
    debugOutput,
    onLogin,
    onLogin2fa,
    onUnlock,
    onLogout,
  } = props;

  const [email, setEmail] = useState(userEmail ?? DEV_PREFILL_EMAIL);
  const [password, setPassword] = useState(DEV_PREFILL_PASSWORD);
  const [masterPassword, setMasterPassword] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>(TWO_FACTOR_METHOD.AUTHENTICATOR);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const doLogin = async () => {
    const res = await onLogin(email, password);
    if (res === "OK") {
      closeModal();
      return;
    }
    if (res === "TWO_FACTOR_REQUIRED") {
      setNeeds2fa(true);
      return;
    }
  };

  const doLogin2fa = async () => {
    const res = await onLogin2fa(email, password, twoFactorMethod, twoFactorCode);
    if (res === "OK") closeModal();
  };

  const doUnlock = async () => {
    const ok = await onUnlock(masterPassword);
    if (ok) closeModal();
    setMasterPassword("");
  };

  return (
    <ModalRoot
      closeModal={closeModal}
      bDisableBackgroundDismiss={true}
      bAllowFullSize={true}
    >
      <DialogBody>
        <DialogControlsSection style={{ height: "calc(100%)" }}>
          <PanelSection title={mode === "LOGIN" ? "Login to Bitwarden" : "Unlock Vault"}>
            {mode === "UNLOCK" && userEmail && (
              <PanelSectionRow>
                <div style={{ opacity: 0.7, fontSize: "0.9em" }}>Logged in as: {userEmail}</div>
              </PanelSectionRow>
            )}

            {error && (
              <PanelSectionRow>
                <div style={{ color: "#ff6b6b", fontSize: "0.9em" }}>{error}</div>
              </PanelSectionRow>
            )}

            {/* Raw CLI output for debugging (especially for COMMAND_FAILED) */}
            {error && debugOutput && (
              <PanelSectionRow>
                <div style={{ width: "100%" }}>
                  <div style={{ fontSize: "0.85em", opacity: 0.8, marginBottom: 6 }}>
                    Details (bw output)
                  </div>
                  <pre
                    style={{
                      width: "100%",
                      maxHeight: 220,
                      overflow: "auto",
                      padding: 8,
                      borderRadius: 4,
                      background: "rgba(0,0,0,0.2)",
                      fontSize: "0.75em",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
{`returncode: ${debugOutput.returncode ?? "?"}
stderr:
${debugOutput.stderr ?? ""}

stdout:
${debugOutput.stdout ?? ""}${debugOutput.message ? `\n\nmessage:\n${debugOutput.message}` : ""}`}
                  </pre>
                </div>
              </PanelSectionRow>
            )}

            {mode === "LOGIN" ? (
              <>
                <PanelSectionRow>
                  <div style={{ fontSize: "0.9em", opacity: 0.8 }}>
                    Login uses <b>--nointeraction</b> to prevent hangs. If your account has 2FA enabled
                    and Bitwarden CLI says <i>No provider selected</i>, you&apos;ll be prompted for a
                    2FA method and code.
                  </div>
                </PanelSectionRow>

                {(DEV_PREFILL_EMAIL || DEV_PREFILL_PASSWORD) && (
                  <PanelSectionRow>
                    <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
                      Dev prefill active (from `.env` / `.env.local` at build time)
                    </div>
                  </PanelSectionRow>
                )}

                <PanelSectionRow>
                  <TextField
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </PanelSectionRow>

                <PanelSectionRow>
                  <TextField
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    bIsPassword={true}
                    disabled={isLoading}
                  />
                </PanelSectionRow>

                {!needs2fa ? (
                  <PanelSectionRow>
                    <ButtonItem
                      layout="below"
                      onClick={doLogin}
                      disabled={isLoading || !email.trim() || !password}
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </ButtonItem>
                  </PanelSectionRow>
                ) : (
                  <>
                    <PanelSectionRow>
                      <div style={{ fontSize: "0.9em", opacity: 0.8 }}>
                        2FA required. Choose provider and enter the 2FA code.
                      </div>
                    </PanelSectionRow>

                    <PanelSectionRow>
                      <div style={{ display: "flex", gap: 8 }}>
                        <ButtonItem
                          layout="below"
                          onClick={() => setTwoFactorMethod(TWO_FACTOR_METHOD.AUTHENTICATOR)}
                          disabled={isLoading || twoFactorMethod === TWO_FACTOR_METHOD.AUTHENTICATOR}
                        >
                          Authenticator (method 0)
                        </ButtonItem>
                        <ButtonItem
                          layout="below"
                          onClick={() => setTwoFactorMethod(TWO_FACTOR_METHOD.EMAIL)}
                          disabled={isLoading || twoFactorMethod === TWO_FACTOR_METHOD.EMAIL}
                        >
                          Email (method 1)
                        </ButtonItem>
                        <ButtonItem
                          layout="below"
                          onClick={() => setTwoFactorMethod(TWO_FACTOR_METHOD.YUBIKEY)}
                          disabled={isLoading || twoFactorMethod === TWO_FACTOR_METHOD.YUBIKEY}
                        >
                          YubiKey (method 3)
                        </ButtonItem>
                      </div>
                    </PanelSectionRow>

                    <PanelSectionRow>
                      <TextField
                        label="2FA Code"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        disabled={isLoading}
                      />
                    </PanelSectionRow>

                    <PanelSectionRow>
                      <ButtonItem
                        layout="below"
                        onClick={doLogin2fa}
                        disabled={
                          isLoading ||
                          !twoFactorCode.trim() ||
                          !email.trim() ||
                          !password
                        }
                      >
                        {isLoading ? "Submitting..." : "Submit 2FA"}
                      </ButtonItem>
                    </PanelSectionRow>
                  </>
                )}
              </>
            ) : (
              <>
                <PanelSectionRow>
                  <div style={{ opacity: 0.8, fontSize: "0.9em" }}>
                    Enter your master password to unlock this session.
                  </div>
                </PanelSectionRow>

                <PanelSectionRow>
                  <TextField
                    label="Master Password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    bIsPassword={true}
                    disabled={isLoading}
                  />
                </PanelSectionRow>

                <PanelSectionRow>
                  <ButtonItem
                    layout="below"
                    onClick={doUnlock}
                    disabled={isLoading || !masterPassword}
                  >
                    {isLoading ? "Unlocking..." : "Unlock"}
                  </ButtonItem>
                </PanelSectionRow>

                <PanelSectionRow>
                  <ButtonItem layout="below" onClick={onLogout} disabled={isLoading}>
                    Logout
                  </ButtonItem>
                </PanelSectionRow>
              </>
            )}

            <PanelSectionRow>
              <ButtonItem layout="below" onClick={closeModal} disabled={isLoading}>
                Close
              </ButtonItem>
            </PanelSectionRow>
          </PanelSection>
        </DialogControlsSection>
      </DialogBody>
    </ModalRoot>
  );
}

function Content() {
  const [appState, setAppState] = useState<AppState>("LOADING");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOutput, setDebugOutput] = useState<BwCommandOutput | null>(null);
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
    setDebugOutput(null);

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
        setDebugOutput((statusResult.data as unknown as BwCommandOutput) ?? null);
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

  const handleLogin = async (
    email: string,
    password: string,
  ): Promise<"OK" | "TWO_FACTOR_REQUIRED" | "ERROR"> => {
    setIsLoading(true);
    setError(null);
    setDebugOutput(null);

    try {
      const result = await api.login(email, password);

      if (result.ok) {
        // Re-check status: some CLI versions return a session key from `login --raw`,
        // meaning we may already be unlocked.
        const statusResult = await api.getStatus();
        if (statusResult.ok && statusResult.data) {
          const statusData = statusResult.data as StatusData;
          if (statusData.userEmail) setUserEmail(statusData.userEmail);

          if (statusData.status === "unlocked") {
            await loadVaultItems();
            setAppState("UNLOCKED");
            toaster.toast({ title: "Success", body: "Logged in and unlocked" });
          } else {
            setUserEmail(email);
            setAppState("LOCKED");
            toaster.toast({
              title: "Success",
              body: "Device logged in. Next, unlock with your master password.",
            });
          }
        } else {
          setUserEmail(email);
          setAppState("LOCKED");
          toaster.toast({
            title: "Success",
            body: "Device logged in. Next, unlock with your master password.",
          });
        }

        return "OK";
      } else {
        setDebugOutput((result.data as unknown as BwCommandOutput) ?? null);
        if (result.error === "TWO_FACTOR_REQUIRED") {
          setError("Two-step login required. Choose a provider and enter the code.");
          return "TWO_FACTOR_REQUIRED";
        }
        setError(getErrorMessage(result.error));
        return "ERROR";
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
      return "ERROR";
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin2fa = async (
    email: string,
    password: string,
    method: TwoFactorMethod,
    code: string,
  ): Promise<"OK" | "ERROR"> => {
    setIsLoading(true);
    setError(null);
    setDebugOutput(null);
    try {
      const res = await api.login2fa(email, password, method, code);
      if (res.ok) {
        const statusResult = await api.getStatus();
        if (statusResult.ok && statusResult.data) {
          const statusData = statusResult.data as StatusData;
          if (statusData.userEmail) setUserEmail(statusData.userEmail);

          if (statusData.status === "unlocked") {
            await loadVaultItems();
            setAppState("UNLOCKED");
            toaster.toast({ title: "Success", body: "Logged in and unlocked" });
          } else {
            setUserEmail(email);
            setAppState("LOCKED");
            toaster.toast({
              title: "Success",
              body: "Device logged in. Next, unlock with your master password.",
            });
          }
        } else {
          setUserEmail(email);
          setAppState("LOCKED");
          toaster.toast({
            title: "Success",
            body: "Device logged in. Next, unlock with your master password.",
          });
        }

        return "OK";
      }
      setDebugOutput((res.data as unknown as BwCommandOutput) ?? null);
      setError(getErrorMessage(res.error));
      return "ERROR";
    } catch (err) {
      console.error("2FA login error:", err);
      setError("2FA login failed. Please try again.");
      return "ERROR";
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (masterPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setDebugOutput(null);

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
        return true;
      } else {
        setDebugOutput((result.data as unknown as BwCommandOutput) ?? null);
        setError(getErrorMessage(result.error));
        return false;
      }
    } catch (err) {
      console.error("Unlock error:", err);
      setError("Unlock failed. Please try again.");
      return false;
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
  const openAuthModal = (mode: AuthModalMode) => {
    let modalRes: ReturnType<typeof showModal> | null = null;
    const close = () => modalRes?.Close();

    modalRes = showModal(
      <AuthModal
        mode={mode}
        closeModal={close}
        userEmail={userEmail}
        isLoading={isLoading}
        error={error}
        debugOutput={debugOutput}
        onLogin={handleLogin}
        onLogin2fa={handleLogin2fa}
        onUnlock={handleUnlock}
        onLogout={handleLogout}
      />,
      undefined,
      { strTitle: mode === "LOGIN" ? "Bitwarden Login" : "Bitwarden Unlock" },
    );
  };

  if (appState === "LOADING") return <Loading />;

  if (appState === "UNLOCKED") {
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
  }

  // Sidebar-friendly views: open auth in a modal so Steam keyboard isn't hidden.
  if (appState === "FLATPAK_MISSING" || appState === "BITWARDEN_MISSING") {
    return (
      <PanelSection title="Bitwarden">
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b" }}>
            {appState === "FLATPAK_MISSING"
              ? "Flatpak is not installed on this system."
              : "Bitwarden Flatpak is not installed (com.bitwarden.desktop)."}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={initializePlugin} disabled={isLoading}>
            {isLoading ? "Checking..." : "Retry"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (appState === "LOCKED") {
    return (
      <PanelSection title="Bitwarden">
        {userEmail && (
          <PanelSectionRow>
            <div style={{ opacity: 0.7, fontSize: "0.9em" }}>Logged in as: {userEmail}</div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div style={{ opacity: 0.8, fontSize: "0.9em" }}>Vault is locked.</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openAuthModal("UNLOCK")} disabled={isLoading}>
            Unlock
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleLogout} disabled={isLoading}>
            Logout
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  // UNAUTHENTICATED (and any fallback)
  return (
    <PanelSection title="Bitwarden">
      {error && (
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b" }}>{error}</div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <div style={{ opacity: 0.8, fontSize: "0.9em" }}>Not logged in.</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => openAuthModal("LOGIN")} disabled={isLoading}>
          Login
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={initializePlugin} disabled={isLoading}>
          Refresh Status
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Definition
// ─────────────────────────────────────────────────────────────────────────────

export default definePlugin(() => {
  console.log("Bitwarden plugin initializing");

  return {
    name: "Bitwarden",
    titleView: <div className={staticClasses.Title}>Bitwarden</div>,
    content: <Content />,
    icon: <FaKey />,
    onDismount() {
      console.log("Bitwarden plugin unloading");
    },
  };
});
