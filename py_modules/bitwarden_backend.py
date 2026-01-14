"""
Bitwarden CLI wrapper for Decky plugin.
Interacts with Bitwarden via Flatpak invocation.
"""

import subprocess
import json
from typing import Any


class BitwardenCLI:
    """
    Wrapper around Bitwarden CLI accessed through Flatpak.
    All methods return structured JSON: {"ok": bool, "error": str|None, "data": Any}
    """

    FLATPAK_APP = "com.bitwarden.desktop"
    TIMEOUT = 10

    def __init__(self):
        self._session_key: str | None = None

    # ─────────────────────────────────────────────────────────────────────────
    # Environment Checks
    # ─────────────────────────────────────────────────────────────────────────

    def check_flatpak(self) -> dict[str, Any]:
        """Check if flatpak is available on the system."""
        # TODO: Implement flatpak check
        pass

    def check_bitwarden(self) -> dict[str, Any]:
        """Check if Bitwarden Flatpak is installed."""
        # TODO: Implement bitwarden installation check
        pass

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication
    # ─────────────────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        """Get current Bitwarden CLI status (unauthenticated/locked/unlocked)."""
        # TODO: Implement status check
        pass

    def login(self, email: str, password: str) -> dict[str, Any]:
        """Login to Bitwarden with email and password."""
        # TODO: Implement login
        pass

    def unlock(self, master_password: str) -> dict[str, Any]:
        """Unlock the vault with master password."""
        # TODO: Implement unlock
        pass

    def logout(self) -> dict[str, Any]:
        """Logout from Bitwarden."""
        # TODO: Implement logout
        pass

    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operations
    # ─────────────────────────────────────────────────────────────────────────

    def list_items(self) -> dict[str, Any]:
        """List all vault items."""
        # TODO: Implement list items
        pass

    def get_item(self, item_id: str) -> dict[str, Any]:
        """Get a specific vault item by ID."""
        # TODO: Implement get item
        pass

    def get_totp(self, item_id: str) -> dict[str, Any]:
        """Get TOTP code for an item."""
        # TODO: Implement TOTP retrieval
        pass

    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard
    # ─────────────────────────────────────────────────────────────────────────

    def copy_to_clipboard(self, text: str) -> dict[str, Any]:
        """Copy text to system clipboard."""
        # TODO: Implement clipboard copy
        pass

    # ─────────────────────────────────────────────────────────────────────────
    # Internal Helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _run_bw_command(self, *args: str) -> subprocess.CompletedProcess:
        """Execute a Bitwarden CLI command via Flatpak."""
        # TODO: Implement command execution
        pass

    def _make_response(
        self, ok: bool, data: Any = None, error: str | None = None
    ) -> dict[str, Any]:
        """Create a standardized response dict."""
        return {"ok": ok, "data": data, "error": error}
