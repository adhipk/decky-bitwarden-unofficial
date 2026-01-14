/**
 * FlatpakMissing - Shown when Flatpak is not installed
 */

import { PanelSection, PanelSectionRow } from "@decky/ui";

export function FlatpakMissing() {
  return (
    <PanelSection title="Flatpak Required">
      <PanelSectionRow>
        <div>
          Flatpak is not installed on this system.
          Please install Flatpak to use this plugin.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
