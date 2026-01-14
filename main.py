"""
Bitwarden Decky Plugin - Backend Entry Point

Exposes Bitwarden CLI operations to the frontend via Decky RPC.
"""

import asyncio
import decky

# Import the Bitwarden CLI wrapper
from py_modules.bitwarden_backend import BitwardenCLI


class Plugin:
    """
    Decky plugin class exposing Bitwarden operations.
    All public async methods are callable from the frontend.
    """

    def __init__(self):
        self._bw: BitwardenCLI | None = None

    # ─────────────────────────────────────────────────────────────────────────
    # Lifecycle Methods
    # ─────────────────────────────────────────────────────────────────────────

    async def _main(self):
        """Called on plugin load."""
        self._bw = BitwardenCLI()
        decky.logger.info("Bitwarden plugin loaded")

    async def _unload(self):
        """Called when plugin is stopped (but not removed)."""
        decky.logger.info("Bitwarden plugin unloading")

    async def _uninstall(self):
        """Called when plugin is uninstalled."""
        decky.logger.info("Bitwarden plugin uninstalled")

    async def _migration(self):
        """Called before _main() for data migration."""
        decky.logger.info("Bitwarden plugin migration check")

    # ─────────────────────────────────────────────────────────────────────────
    # Environment Checks (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def check_flatpak(self) -> dict:
        """Check if flatpak is available."""
        return self._bw.check_flatpak()

    async def check_bitwarden(self) -> dict:
        """Check if Bitwarden Flatpak is installed."""
        return self._bw.check_bitwarden()

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def status(self) -> dict:
        """Get Bitwarden authentication status."""
        return self._bw.status()

    async def login(self, email: str, password: str) -> dict:
        """Login to Bitwarden."""
        return self._bw.login(email, password)

    async def unlock(self, master_password: str) -> dict:
        """Unlock the Bitwarden vault."""
        return self._bw.unlock(master_password)

    async def logout(self) -> dict:
        """Logout from Bitwarden."""
        return self._bw.logout()

    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operations (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def list_items(self) -> dict:
        """List all vault items."""
        return self._bw.list_items()

    async def get_item(self, item_id: str) -> dict:
        """Get a specific vault item."""
        return self._bw.get_item(item_id)

    async def get_totp(self, item_id: str) -> dict:
        """Get TOTP code for an item."""
        return self._bw.get_totp(item_id)

    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def copy_to_clipboard(self, text: str) -> dict:
        """Copy text to clipboard."""
        return self._bw.copy_to_clipboard(text)
