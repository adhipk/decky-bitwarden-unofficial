/**
 * VaultList - Displays vault items with search functionality
 */

import { useState, useMemo } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, TextField } from "@decky/ui";
import type { VaultItem } from "../types";

interface VaultListProps {
  items: VaultItem[];
  onItemSelect: (item: VaultItem) => void;
  onLock: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function VaultList({ 
  items, 
  onItemSelect, 
  onLock, 
  onLogout, 
  onRefresh, 
  isLoading 
}: VaultListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side filtering with memoization
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.login?.username?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Limit displayed items for performance
  const displayedItems = filteredItems.slice(0, 50);
  const hasMore = filteredItems.length > 50;

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
          <div style={{ opacity: 0.7 }}>Loading items...</div>
        </PanelSectionRow>
      ) : items.length === 0 ? (
        <PanelSectionRow>
          <div style={{ opacity: 0.7 }}>No items in vault</div>
        </PanelSectionRow>
      ) : filteredItems.length === 0 ? (
        <PanelSectionRow>
          <div style={{ opacity: 0.7 }}>No matching items</div>
        </PanelSectionRow>
      ) : (
        <>
          {displayedItems.map((item) => (
            <PanelSectionRow key={item.id}>
              <ButtonItem
                layout="below"
                onClick={() => onItemSelect(item)}
                description={item.login?.username || undefined}
              >
                {item.name}
              </ButtonItem>
            </PanelSectionRow>
          ))}
          {hasMore && (
            <PanelSectionRow>
              <div style={{ opacity: 0.7, fontSize: "0.85em", textAlign: "center" }}>
                Showing {displayedItems.length} of {filteredItems.length} items. 
                Use search to filter.
              </div>
            </PanelSectionRow>
          )}
        </>
      )}

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onLock} disabled={isLoading}>
          Lock Vault
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onLogout} disabled={isLoading}>
          Logout
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
