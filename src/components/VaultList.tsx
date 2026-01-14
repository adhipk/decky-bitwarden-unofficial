/**
 * VaultList - Displays vault items with search functionality
 */

import { useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, TextField } from "@decky/ui";
import type { VaultItem } from "../types";

interface VaultListProps {
  items: VaultItem[];
  onItemSelect: (item: VaultItem) => void;
  onLogout: () => void;
  isLoading: boolean;
}

export function VaultList({ items, onItemSelect, onLogout, isLoading }: VaultListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Implement client-side filtering
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PanelSection title="Vault">
      <PanelSectionRow>
        <TextField
          label="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading}
        />
      </PanelSectionRow>
      
      {isLoading ? (
        <PanelSectionRow>
          <div>Loading items...</div>
        </PanelSectionRow>
      ) : filteredItems.length === 0 ? (
        <PanelSectionRow>
          <div>No items found</div>
        </PanelSectionRow>
      ) : (
        filteredItems.map((item) => (
          <PanelSectionRow key={item.id}>
            <ButtonItem
              layout="below"
              onClick={() => onItemSelect(item)}
            >
              {item.name}
            </ButtonItem>
          </PanelSectionRow>
        ))
      )}

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onLogout}>
          Lock / Logout
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
