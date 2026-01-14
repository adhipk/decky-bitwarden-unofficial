/**
 * Loading - Shown during initial plugin load
 */

import { PanelSection, PanelSectionRow } from "@decky/ui";

export function Loading() {
  return (
    <PanelSection title="Bitwarden">
      <PanelSectionRow>
        <div>Loading...</div>
      </PanelSectionRow>
    </PanelSection>
  );
}
