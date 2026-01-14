/**
 * ItemDetail - Shows vault item details with copy buttons
 */

import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import type { VaultItem } from "../types";

interface ItemDetailProps {
  item: VaultItem;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onCopyTotp: () => void;
  onBack: () => void;
  isCopying: boolean;
}

export function ItemDetail({
  item,
  onCopyUsername,
  onCopyPassword,
  onCopyTotp,
  onBack,
  isCopying,
}: ItemDetailProps) {
  const hasUsername = item.login?.username;
  const hasPassword = item.login?.password;
  const hasTotp = item.login?.totp;

  return (
    <PanelSection title={item.name}>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onBack}>
          ← Back to Vault
        </ButtonItem>
      </PanelSectionRow>

      {hasUsername && (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={onCopyUsername}
            disabled={isCopying}
          >
            Copy Username
          </ButtonItem>
        </PanelSectionRow>
      )}

      {hasPassword && (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={onCopyPassword}
            disabled={isCopying}
          >
            Copy Password
          </ButtonItem>
        </PanelSectionRow>
      )}

      {hasTotp && (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={onCopyTotp}
            disabled={isCopying}
          >
            Copy TOTP
          </ButtonItem>
        </PanelSectionRow>
      )}

      {item.login?.uris && item.login.uris.length > 0 && (
        <PanelSectionRow>
          <div style={{ opacity: 0.7, fontSize: "0.85em" }}>
            {item.login.uris[0].uri}
          </div>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}
