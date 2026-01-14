/**
 * LoginForm - Email/password login for unauthenticated state
 */

import { useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, TextField } from "@decky/ui";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    await onLogin(email, password);
  };

  return (
    <PanelSection title="Login to Bitwarden">
      {error && (
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b" }}>{error}</div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <div
          style={{
            fontSize: "0.9em",
            opacity: 0.8,
          }}
        >
          This is a one-time login for this device. After this, you&apos;ll only
          need your master password to unlock.
        </div>
      </PanelSectionRow>
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
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={handleSubmit}
          disabled={isLoading || !email || !password}
        >
          {isLoading ? "Logging in..." : "Login"}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
