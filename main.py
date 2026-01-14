"""
Bitwarden Decky Plugin - Backend Entry Point

Exposes Bitwarden CLI operations to the frontend via Decky RPC.
"""

import sys
import os

# Add plugin directory to path for py_modules import
PLUGIN_DIR = os.path.dirname(os.path.realpath(__file__))
sys.path.append(PLUGIN_DIR)

import decky
from py_modules.bitwarden_cli import init_plugin_dir
from py_modules.bitwarden_backend import BitwardenCLI

# Log tag for easy grepping: ./logs.sh | grep "\[Bitwarden\]"
LOG_TAG = "[Bitwarden]"


def log_info(msg: str):
    decky.logger.info(f"{LOG_TAG} {msg}")


def log_error(msg: str):
    decky.logger.error(f"{LOG_TAG} {msg}")


def log_debug(msg: str):
    decky.logger.debug(f"{LOG_TAG} {msg}")


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
        # Initialize plugin directory for bundled binary lookup
        init_plugin_dir(PLUGIN_DIR)
        log_debug(f"Plugin directory: {PLUGIN_DIR}")
        
        self._bw = BitwardenCLI()
        log_info("Plugin loaded")
        
        # Check if bw CLI is available (with debug logging)
        result = self._bw.check_bw(debug_log=log_debug)
        if result["ok"]:
            log_info(f"bw CLI found: {result['data']}")
        else:
            log_error(f"bw CLI not found: {result.get('data', {})}")
            log_error("Run: ./scripts/fetch_bw.sh to download the bundled binary")

    async def _unload(self):
        """Called when plugin is stopped (but not removed)."""
        log_info("Plugin unloading")

    async def _uninstall(self):
        """Called when plugin is uninstalled."""
        log_info("Plugin uninstalled")

    async def _migration(self):
        """Called before _main() for data migration."""
        log_debug("Migration check")

    # ─────────────────────────────────────────────────────────────────────────
    # Environment Checks (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def check_flatpak(self) -> dict:
        """Check if bw CLI is available (legacy name for frontend compat)."""
        log_debug("check_flatpak called")
        result = self._bw.check_bw()
        if result["ok"]:
            log_info(f"bw check: OK - {result['data']}")
        else:
            log_error(f"bw check: {result['error']} - {result.get('data', {})}")
        return result

    async def check_bitwarden(self) -> dict:
        """Check if bw CLI is available (legacy name for frontend compat)."""
        log_debug("check_bitwarden called")
        result = self._bw.check_bw()
        if result["ok"]:
            log_info(f"bw check: OK")
        else:
            log_error(f"bw check: {result['error']}")
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def status(self) -> dict:
        """Get Bitwarden authentication status."""
        log_debug("Getting status")
        result = self._bw.status()
        if result["ok"]:
            log_info(f"Status: {result['data'].get('status', 'unknown')}")
        else:
            log_error(f"Status failed: {result['error']}")
        return result

    async def login(self, email: str, password: str) -> dict:
        """Login to Bitwarden with email/password."""
        log_info(f"Login attempt for: {email}")
        result = self._bw.login(email, password)
        if result["ok"]:
            log_info("Login: OK")
        else:
            log_error(f"Login failed: {result['error']}")
        return result

    async def login_2fa(self, email: str, password: str, method: int, code: str) -> dict:
        """Login to Bitwarden with email/password + 2FA provider and code."""
        log_info(f"Login 2FA attempt for: {email} (method={method})")
        result = self._bw.login_2fa(email, password, method, code)
        if result["ok"]:
            log_info("Login 2FA: OK")
        else:
            log_error(f"Login 2FA failed: {result['error']}")
        return result

    async def unlock(self, master_password: str) -> dict:
        """Unlock the Bitwarden vault."""
        log_info("Unlock attempt")
        result = self._bw.unlock(master_password)
        if result["ok"]:
            log_info("Unlock: OK")
        else:
            log_error(f"Unlock failed: {result['error']}")
        return result

    async def logout(self) -> dict:
        """Logout from Bitwarden."""
        log_info("Logout")
        result = self._bw.logout()
        if result["ok"]:
            log_info("Logout: OK")
        else:
            log_error(f"Logout failed: {result['error']}")
        return result

    async def lock(self) -> dict:
        """Lock the Bitwarden vault."""
        log_info("Lock vault")
        result = self._bw.lock()
        if result["ok"]:
            log_info("Lock: OK")
        else:
            log_error(f"Lock failed: {result['error']}")
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operations (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def list_items(self) -> dict:
        """List all vault items."""
        log_debug("Listing items")
        result = self._bw.list_items()
        if result["ok"]:
            log_info(f"Listed {len(result['data'])} items")
        else:
            log_error(f"List items failed: {result['error']}")
        return result

    async def get_item(self, item_id: str) -> dict:
        """Get a specific vault item."""
        log_debug(f"Getting item: {item_id}")
        return self._bw.get_item(item_id)

    async def get_totp(self, item_id: str) -> dict:
        """Get TOTP code for an item."""
        log_debug(f"Getting TOTP for: {item_id}")
        return self._bw.get_totp(item_id)

    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard (exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────

    async def copy_to_clipboard(self, text: str) -> dict:
        """Copy text to clipboard."""
        log_debug("Copying to clipboard")
        result = self._bw.copy_to_clipboard(text)
        if result["ok"]:
            log_info(f"Copied via {result['data'].get('method', 'unknown')}")
        else:
            log_error(f"Clipboard failed: {result['error']}")
        return result
