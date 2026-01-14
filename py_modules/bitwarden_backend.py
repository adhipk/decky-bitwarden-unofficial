"""
Bitwarden CLI wrapper for Decky plugin.
Interacts with Bitwarden via Flatpak invocation.
"""

import subprocess
import json
import os
import shutil
from typing import Any


class BitwardenCLI:
    """
    Wrapper around Bitwarden CLI accessed through Flatpak.
    All methods return structured JSON: {"ok": bool, "error": str|None, "data": Any}
    """

    FLATPAK_APP = "com.bitwarden.desktop"
    TIMEOUT = 30  # Increased for slower operations like login

    def __init__(self):
        self._session_key: str | None = None

    # ─────────────────────────────────────────────────────────────────────────
    # Environment Checks
    # ─────────────────────────────────────────────────────────────────────────

    def check_flatpak(self) -> dict[str, Any]:
        """Check if flatpak is available on the system."""
        try:
            result = subprocess.run(
                ["flatpak", "--version"],
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT,
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                return self._make_response(True, data={"version": version})
            return self._make_response(False, error="FLATPAK_MISSING")
        except FileNotFoundError:
            return self._make_response(False, error="FLATPAK_MISSING")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception as e:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def check_bitwarden(self) -> dict[str, Any]:
        """Check if Bitwarden Flatpak is installed."""
        try:
            result = subprocess.run(
                ["flatpak", "info", self.FLATPAK_APP],
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT,
            )
            if result.returncode == 0:
                return self._make_response(True, data={"installed": True})
            return self._make_response(False, error="BITWARDEN_MISSING")
        except FileNotFoundError:
            return self._make_response(False, error="FLATPAK_MISSING")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication
    # ─────────────────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        """Get current Bitwarden CLI status (unauthenticated/locked/unlocked)."""
        try:
            result = self._run_bw_command("status", "--raw")
            if result.returncode != 0:
                return self._make_response(False, error="COMMAND_FAILED")

            status_data = json.loads(result.stdout)
            return self._make_response(True, data=status_data)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def login(self, email: str, password: str) -> dict[str, Any]:
        """
        Login to Bitwarden with email and password.
        Uses environment variable to pass password securely.
        """
        try:
            # Set password in environment variable
            env = os.environ.copy()
            env["BW_PASSWORD"] = password

            result = subprocess.run(
                [
                    "flatpak",
                    "run",
                    "--command=bw",
                    self.FLATPAK_APP,
                    "login",
                    email,
                    "--passwordenv",
                    "BW_PASSWORD",
                    "--raw",
                ],
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT,
                env=env,
            )

            if result.returncode == 0:
                # Login successful, may return session key
                return self._make_response(True, data={"logged_in": True})

            # Check for specific error messages
            stderr = result.stderr.lower()
            stdout = result.stdout.lower()
            combined = stderr + stdout

            if "invalid" in combined or "incorrect" in combined:
                return self._make_response(False, error="INVALID_CREDENTIALS")
            if "already logged in" in combined:
                return self._make_response(True, data={"logged_in": True, "already": True})

            return self._make_response(
                False,
                error="COMMAND_FAILED",
            )
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def unlock(self, master_password: str) -> dict[str, Any]:
        """
        Unlock the vault with master password.
        Stores session key for subsequent operations.
        """
        try:
            # Set password in environment variable for security
            env = os.environ.copy()
            env["BW_PASSWORD"] = master_password

            result = subprocess.run(
                [
                    "flatpak",
                    "run",
                    "--command=bw",
                    self.FLATPAK_APP,
                    "unlock",
                    "--passwordenv",
                    "BW_PASSWORD",
                    "--raw",
                ],
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT,
                env=env,
            )

            if result.returncode == 0:
                # The unlock command returns the session key
                session_key = result.stdout.strip()
                if session_key:
                    self._session_key = session_key
                    return self._make_response(
                        True, data={"unlocked": True, "session_key": session_key}
                    )
                return self._make_response(True, data={"unlocked": True})

            stderr = result.stderr.lower()
            stdout = result.stdout.lower()
            combined = stderr + stdout

            if "invalid" in combined or "incorrect" in combined:
                return self._make_response(False, error="INVALID_CREDENTIALS")
            if "not logged in" in combined:
                return self._make_response(False, error="NOT_AUTHENTICATED")
            if "already unlocked" in combined:
                return self._make_response(True, data={"unlocked": True, "already": True})

            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def lock(self) -> dict[str, Any]:
        """Lock the Bitwarden vault."""
        try:
            result = self._run_bw_command("lock")
            if result.returncode == 0:
                self._session_key = None
                return self._make_response(True, data={"locked": True})
            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def logout(self) -> dict[str, Any]:
        """Logout from Bitwarden."""
        try:
            result = self._run_bw_command("logout")
            if result.returncode == 0:
                self._session_key = None
                return self._make_response(True, data={"logged_out": True})

            stderr = result.stderr.lower()
            if "not logged in" in stderr:
                return self._make_response(True, data={"logged_out": True, "already": True})

            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operations
    # ─────────────────────────────────────────────────────────────────────────

    def list_items(self) -> dict[str, Any]:
        """List all vault items."""
        try:
            result = self._run_bw_command("list", "items", "--raw")

            if result.returncode != 0:
                stderr = result.stderr.lower()
                if "locked" in stderr:
                    return self._make_response(False, error="LOCKED")
                if "not logged in" in stderr:
                    return self._make_response(False, error="NOT_AUTHENTICATED")
                return self._make_response(False, error="COMMAND_FAILED")

            items = json.loads(result.stdout)
            return self._make_response(True, data=items)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def get_item(self, item_id: str) -> dict[str, Any]:
        """Get a specific vault item by ID."""
        try:
            result = self._run_bw_command("get", "item", item_id, "--raw")

            if result.returncode != 0:
                stderr = result.stderr.lower()
                if "locked" in stderr:
                    return self._make_response(False, error="LOCKED")
                if "not logged in" in stderr:
                    return self._make_response(False, error="NOT_AUTHENTICATED")
                if "not found" in stderr:
                    return self._make_response(False, error="COMMAND_FAILED")
                return self._make_response(False, error="COMMAND_FAILED")

            item = json.loads(result.stdout)
            return self._make_response(True, data=item)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED")
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    def get_totp(self, item_id: str) -> dict[str, Any]:
        """Get TOTP code for an item."""
        try:
            result = self._run_bw_command("get", "totp", item_id, "--raw")

            if result.returncode != 0:
                stderr = result.stderr.lower()
                stdout = result.stdout.lower()
                combined = stderr + stdout

                if "locked" in combined:
                    return self._make_response(False, error="LOCKED")
                if "not logged in" in combined:
                    return self._make_response(False, error="NOT_AUTHENTICATED")
                if "no totp" in combined or "not found" in combined:
                    return self._make_response(
                        False, error="COMMAND_FAILED"
                    )
                return self._make_response(False, error="COMMAND_FAILED")

            totp_code = result.stdout.strip()
            return self._make_response(True, data={"totp": totp_code})
        except subprocess.TimeoutExpired:
            return self._make_response(False, error="COMMAND_FAILED")
        except Exception:
            return self._make_response(False, error="UNKNOWN_ERROR")

    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard
    # ─────────────────────────────────────────────────────────────────────────

    def copy_to_clipboard(self, text: str) -> dict[str, Any]:
        """
        Copy text to system clipboard.
        Tries multiple methods in order: wl-copy, xclip, xsel.
        """
        # Try wl-copy first (Wayland - most likely on Steam Deck)
        if self._try_wl_copy(text):
            return self._make_response(True, data={"copied": True, "method": "wl-copy"})

        # Try xclip (X11 fallback)
        if self._try_xclip(text):
            return self._make_response(True, data={"copied": True, "method": "xclip"})

        # Try xsel (another X11 fallback)
        if self._try_xsel(text):
            return self._make_response(True, data={"copied": True, "method": "xsel"})

        return self._make_response(False, error="CLIPBOARD_ERROR")

    def _try_wl_copy(self, text: str) -> bool:
        """Try to copy using wl-copy (Wayland)."""
        try:
            if not shutil.which("wl-copy"):
                return False
            result = subprocess.run(
                ["wl-copy", text],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    def _try_xclip(self, text: str) -> bool:
        """Try to copy using xclip (X11)."""
        try:
            if not shutil.which("xclip"):
                return False
            result = subprocess.run(
                ["xclip", "-selection", "clipboard"],
                input=text,
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    def _try_xsel(self, text: str) -> bool:
        """Try to copy using xsel (X11)."""
        try:
            if not shutil.which("xsel"):
                return False
            result = subprocess.run(
                ["xsel", "--clipboard", "--input"],
                input=text,
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    # ─────────────────────────────────────────────────────────────────────────
    # Internal Helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _run_bw_command(self, *args: str) -> subprocess.CompletedProcess:
        """
        Execute a Bitwarden CLI command via Flatpak.
        Automatically includes session key if available.
        """
        cmd = ["flatpak", "run", "--command=bw", self.FLATPAK_APP] + list(args)

        env = os.environ.copy()
        if self._session_key:
            env["BW_SESSION"] = self._session_key

        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.TIMEOUT,
            env=env,
        )

    def _make_response(
        self, ok: bool, data: Any = None, error: str | None = None
    ) -> dict[str, Any]:
        """Create a standardized response dict."""
        return {"ok": ok, "data": data, "error": error}
