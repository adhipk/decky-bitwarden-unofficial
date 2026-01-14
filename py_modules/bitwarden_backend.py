"""
Bitwarden CLI wrapper for Decky plugin.
Uses bundled `bw` CLI from backend/bin/bw (primary) or system-installed (fallback).
"""

import json
import os
from typing import Any

from .bitwarden_cli import run_bw, get_bw_path


class BitwardenCLI:
    """
    Wrapper around Bitwarden CLI.
    All methods return structured JSON: {"ok": bool, "error": str|None, "data": Any}
    """

    TIMEOUT = 30  # Timeout for CLI operations

    def __init__(self):
        self._session_key: str | None = None

    # ─────────────────────────────────────────────────────────────────────────
    # Environment Checks
    # ─────────────────────────────────────────────────────────────────────────

    def check_bw(self, debug_log=None) -> dict[str, Any]:
        """Check if Bitwarden CLI is available."""
        bw_path = get_bw_path(debug_callback=debug_log)
        if bw_path is None:
            return self._make_response(
                False, 
                error="BW_BINARY_MISSING",
                data={
                    "message": "Bitwarden CLI (bw) not found. Run: ./scripts/fetch_bw.sh to download bundled binary.",
                    "expected_path": "backend/bin/bw (bundled) or system PATH"
                }
            )
        
        # Try to get version
        result = run_bw(["--version"], timeout=10)
        if result["ok"]:
            version = result["data"]["stdout"].strip()
            return self._make_response(True, data={"version": version, "path": bw_path})
        
        return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])

    # Legacy method names for frontend compatibility
    def check_flatpak(self) -> dict[str, Any]:
        """Legacy: Check if bw CLI is available (renamed from flatpak check)."""
        return self.check_bw()

    def check_bitwarden(self) -> dict[str, Any]:
        """Legacy: Check if bw CLI is available (renamed from bitwarden flatpak check)."""
        return self.check_bw()

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication
    # ─────────────────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        """Get current Bitwarden CLI status (unauthenticated/locked/unlocked)."""
        # Important: `bw status` reports "unlocked" only when an active session key is available
        # (e.g. via BW_SESSION env or --session). If we have a session key, include it so the UI
        # doesn't incorrectly show "locked" after a successful unlock.
        result = run_bw(["status", "--raw"], timeout=self.TIMEOUT, env=self._get_session_env())
        
        if not result["ok"]:
            if result["error"] == "BW_BINARY_MISSING":
                return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])
        
        try:
            status_data = json.loads(result["data"]["stdout"])
            return self._make_response(True, data=status_data)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def login(self, email: str, password: str, method: int | None = None, code: str | None = None) -> dict[str, Any]:
        """
        Login to Bitwarden with email/password.
        If 2FA is enabled and the CLI requires a provider, it will return TWO_FACTOR_REQUIRED.
        If method+code are provided, we pass them to the CLI non-interactively.
        """
        args: list[str] = ["login", email, "--passwordenv", "BW_PASSWORD", "--raw"]
        if method is not None and code is not None:
            args += ["--method", str(method), "--code", code]

        result = run_bw(args, timeout=self.TIMEOUT, env={"BW_PASSWORD": password})
        
        if result["ok"]:
            # Newer CLI behavior: `bw login --raw` may return a session key directly.
            # If present, store it so subsequent commands can run without requiring a separate unlock call.
            stdout = (result.get("data") or {}).get("stdout", "")
            session_key = stdout.strip() if isinstance(stdout, str) else ""
            if session_key and not session_key.startswith("{") and not session_key.startswith("["):
                self._session_key = session_key
                return self._make_response(True, data={"logged_in": True, "session_key": session_key})

            return self._make_response(True, data={"logged_in": True})
        
        # Check for specific errors
        stderr = result["data"].get("stderr", "").lower()
        stdout = result["data"].get("stdout", "").lower()
        combined = stderr + stdout
        
        # Wrong email/password (Bitwarden CLI common message)
        if "invalid master password" in combined:
            return self._make_response(False, error="INVALID_CREDENTIALS")
        if "invalid" in combined or "incorrect" in combined:
            return self._make_response(False, error="INVALID_CREDENTIALS")
        if "no provider selected" in combined:
            return self._make_response(
                False,
                error="TWO_FACTOR_REQUIRED",
                data={
                    "providers": [
                        {"method": 0, "label": "Authenticator"},
                        {"method": 1, "label": "Email"},
                        {"method": 3, "label": "YubiKey"},
                    ]
                },
            )
        if "two-step login code is invalid" in combined or "invalid two-step login code" in combined:
            return self._make_response(False, error="INVALID_2FA_CODE")
        if "already logged in" in combined:
            return self._make_response(True, data={"logged_in": True, "already": True})
        if result["error"] == "BW_BINARY_MISSING":
            return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
        
        return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def login_2fa(self, email: str, password: str, method: int, code: str) -> dict[str, Any]:
        """Login with email/password + 2FA provider and code."""
        return self.login(email=email, password=password, method=method, code=code)

    def unlock(self, master_password: str) -> dict[str, Any]:
        """Unlock the vault with master password."""
        result = run_bw(
            ["unlock", "--passwordenv", "BW_PASSWORD", "--raw"],
            timeout=self.TIMEOUT,
            env={"BW_PASSWORD": master_password}
        )
        
        if result["ok"]:
            session_key = result["data"]["stdout"].strip()
            if session_key:
                self._session_key = session_key
                return self._make_response(True, data={"unlocked": True, "session_key": session_key})
            return self._make_response(True, data={"unlocked": True})
        
        stderr = result["data"].get("stderr", "").lower()
        stdout = result["data"].get("stdout", "").lower()
        combined = stderr + stdout
        
        if "invalid" in combined or "incorrect" in combined:
            return self._make_response(False, error="INVALID_CREDENTIALS")
        if "not logged in" in combined:
            return self._make_response(False, error="NOT_AUTHENTICATED")
        if "already unlocked" in combined:
            return self._make_response(True, data={"unlocked": True, "already": True})
        if result["error"] == "BW_BINARY_MISSING":
            return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
        
        return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def lock(self) -> dict[str, Any]:
        """Lock the Bitwarden vault."""
        result = run_bw(["lock"], timeout=self.TIMEOUT, env=self._get_session_env())
        
        if result["ok"]:
            self._session_key = None
            return self._make_response(True, data={"locked": True})
        
        if result["error"] == "BW_BINARY_MISSING":
            return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
        
        return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def logout(self) -> dict[str, Any]:
        """Logout from Bitwarden."""
        result = run_bw(["logout"], timeout=self.TIMEOUT)
        
        if result["ok"]:
            self._session_key = None
            return self._make_response(True, data={"logged_out": True})
        
        stderr = result["data"].get("stderr", "").lower()
        if "not logged in" in stderr:
            return self._make_response(True, data={"logged_out": True, "already": True})
        
        if result["error"] == "BW_BINARY_MISSING":
            return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
        
        return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operations
    # ─────────────────────────────────────────────────────────────────────────

    def list_items(self) -> dict[str, Any]:
        """List all vault items."""
        result = run_bw(["list", "items", "--raw"], timeout=self.TIMEOUT, env=self._get_session_env())
        
        if not result["ok"]:
            stderr = result["data"].get("stderr", "").lower()
            if "locked" in stderr:
                return self._make_response(False, error="LOCKED")
            if "not logged in" in stderr:
                return self._make_response(False, error="NOT_AUTHENTICATED")
            if result["error"] == "BW_BINARY_MISSING":
                return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])
        
        try:
            items = json.loads(result["data"]["stdout"])
            return self._make_response(True, data=items)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def get_item(self, item_id: str) -> dict[str, Any]:
        """Get a specific vault item by ID."""
        result = run_bw(["get", "item", item_id, "--raw"], timeout=self.TIMEOUT, env=self._get_session_env())
        
        if not result["ok"]:
            stderr = result["data"].get("stderr", "").lower()
            if "locked" in stderr:
                return self._make_response(False, error="LOCKED")
            if "not logged in" in stderr:
                return self._make_response(False, error="NOT_AUTHENTICATED")
            if "not found" in stderr:
                return self._make_response(False, error="COMMAND_FAILED", data={"message": "Item not found"})
            if result["error"] == "BW_BINARY_MISSING":
                return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])
        
        try:
            item = json.loads(result["data"]["stdout"])
            return self._make_response(True, data=item)
        except json.JSONDecodeError:
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])

    def get_totp(self, item_id: str) -> dict[str, Any]:
        """Get TOTP code for an item."""
        result = run_bw(["get", "totp", item_id, "--raw"], timeout=self.TIMEOUT, env=self._get_session_env())
        
        if not result["ok"]:
            stderr = result["data"].get("stderr", "").lower()
            stdout = result["data"].get("stdout", "").lower()
            combined = stderr + stdout
            
            if "locked" in combined:
                return self._make_response(False, error="LOCKED")
            if "not logged in" in combined:
                return self._make_response(False, error="NOT_AUTHENTICATED")
            if "no totp" in combined or "not found" in combined:
                return self._make_response(False, error="COMMAND_FAILED", data={"message": "No TOTP for this item"})
            if result["error"] == "BW_BINARY_MISSING":
                return self._make_response(False, error="BW_BINARY_MISSING", data=result["data"])
            return self._make_response(False, error="COMMAND_FAILED", data=result["data"])
        
        totp_code = result["data"]["stdout"].strip()
        return self._make_response(True, data={"totp": totp_code})

    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard
    # ─────────────────────────────────────────────────────────────────────────

    def copy_to_clipboard(self, text: str) -> dict[str, Any]:
        """Copy text to system clipboard."""
        import subprocess
        import shutil
        
        # Try wl-copy (Wayland)
        if shutil.which("wl-copy"):
            try:
                result = subprocess.run(
                    ["wl-copy"],
                    input=text,
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    return self._make_response(True, data={"copied": True, "method": "wl-copy"})
            except Exception:
                pass
        
        # Try xclip
        if shutil.which("xclip"):
            try:
                result = subprocess.run(
                    ["xclip", "-selection", "clipboard"],
                    input=text,
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    return self._make_response(True, data={"copied": True, "method": "xclip"})
            except Exception:
                pass
        
        # Try xsel
        if shutil.which("xsel"):
            try:
                result = subprocess.run(
                    ["xsel", "--clipboard", "--input"],
                    input=text,
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    return self._make_response(True, data={"copied": True, "method": "xsel"})
            except Exception:
                pass
        
        return self._make_response(False, error="CLIPBOARD_ERROR")

    # ─────────────────────────────────────────────────────────────────────────
    # Internal Helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _get_session_env(self) -> dict[str, str] | None:
        """Get environment dict with session key if available."""
        if self._session_key:
            return {"BW_SESSION": self._session_key}
        return None

    def _make_response(
        self, ok: bool, data: Any = None, error: str | None = None
    ) -> dict[str, Any]:
        """Create a standardized response dict."""
        return {"ok": ok, "data": data, "error": error}
