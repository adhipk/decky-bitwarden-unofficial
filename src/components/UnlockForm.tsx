/**
 * UnlockForm - Master password entry for locked vault
 */

import { useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, TextField } from "@decky/ui";

interface UnlockFormProps {
  onUnlock: (masterPassword: string) => Promise<void>;
  onLogout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  userEmail?: string;
}

export function UnlockForm({ onUnlock, onLogout, isLoading, error, userEmail }: UnlockFormProps) {
  const [masterPassword, setMasterPassword] = useState("");

  const handleSubmit = async () => {
    if (!masterPassword) return;
    await onUnlock(masterPassword);
    // Clear password after attempt
    setMasterPassword("");
  };

  return (
    <PanelSection title="Unlock Vault">
      {userEmail && (
        <PanelSectionRow>
          <div style={{ opacity: 0.7, fontSize: "0.9em" }}>
            Logged in as: {userEmail}
          </div>
        </PanelSectionRow>
      )}
      
      {error && (
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b", fontSize: "0.9em" }}>{error}</div>
        </PanelSectionRow>
      )}
      
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
          onClick={handleSubmit}
          disabled={isLoading || !masterPassword}
        >
          {isLoading ? "Unlocking..." : "Unlock"}
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onLogout}
          disabled={isLoading}
        >
          Logout
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
