/**
 * BitwardenMissing - Shown when Bitwarden Flatpak is not installed
 */

import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";

export function BitwardenMissing() {
  // TODO: Add button to open Discover store

  return (
    <PanelSection title="Bitwarden Required">
      <PanelSectionRow>
        <div>
          Bitwarden is not installed. Please install Bitwarden from the
          Discover store in Desktop Mode.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled>
          Open Discover (Desktop Mode only)
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
