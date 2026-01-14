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
  const hasUsername = !!item.login?.username;
  const hasPassword = !!item.login?.password;
  // TOTP might not be in the item data - we'll try to fetch it regardless
  const hasTotp = !!item.login?.totp;

  return (
    <PanelSection title={item.name}>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onBack}>
          ← Back to Vault
        </ButtonItem>
      </PanelSectionRow>

      {item.login?.username && (
        <PanelSectionRow>
          <div style={{ opacity: 0.7, fontSize: "0.85em" }}>
            Username: {item.login.username}
          </div>
        </PanelSectionRow>
      )}

      {hasUsername && (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={onCopyUsername}
            disabled={isCopying}
          >
            {isCopying ? "Copying..." : "Copy Username"}
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
            {isCopying ? "Copying..." : "Copy Password"}
          </ButtonItem>
        </PanelSectionRow>
      )}

      {/* Always show TOTP button for login items - backend will report if not available */}
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onCopyTotp}
          disabled={isCopying}
          description={hasTotp ? "TOTP configured" : "May not be available"}
        >
          {isCopying ? "Copying..." : "Copy TOTP Code"}
        </ButtonItem>
      </PanelSectionRow>

      {item.login?.uris && item.login.uris.length > 0 && (
        <PanelSectionRow>
          <div style={{ opacity: 0.6, fontSize: "0.8em", wordBreak: "break-all" }}>
            URL: {item.login.uris[0].uri}
          </div>
        </PanelSectionRow>
      )}

      {item.notes && (
        <PanelSectionRow>
          <div style={{ 
            opacity: 0.6, 
            fontSize: "0.8em", 
            maxHeight: "60px", 
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            Notes: {item.notes.substring(0, 100)}{item.notes.length > 100 ? "..." : ""}
          </div>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}
