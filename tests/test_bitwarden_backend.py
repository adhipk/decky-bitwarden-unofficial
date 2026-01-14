"""
Test harness for BitwardenCLI backend.

Simulates subprocess outputs for testing without calling actual Bitwarden CLI.
Run with: python -m pytest tests/ -v
Or standalone: python tests/test_bitwarden_backend.py
"""

import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock
from typing import Any
from dataclasses import dataclass

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from py_modules.bitwarden_backend import BitwardenCLI


# ─────────────────────────────────────────────────────────────────────────────
# Mock Data
# ─────────────────────────────────────────────────────────────────────────────

MOCK_VAULT_ITEMS = [
    {
        "id": "item-001",
        "name": "GitHub",
        "type": 1,
        "login": {
            "username": "user@example.com",
            "password": "secret123!",
            "totp": "JBSWY3DPEHPK3PXP",
            "uris": [{"uri": "https://github.com"}]
        },
        "favorite": True,
        "folderId": None,
        "notes": "Personal GitHub account"
    },
    {
        "id": "item-002",
        "name": "Steam",
        "type": 1,
        "login": {
            "username": "gamer123",
            "password": "steampass456",
            "uris": [{"uri": "https://store.steampowered.com"}]
        },
        "favorite": False,
        "folderId": "folder-001",
        "notes": None
    },
    {
        "id": "item-003",
        "name": "Discord",
        "type": 1,
        "login": {
            "username": "discord_user",
            "password": "discord789!",
            "totp": "HXDMVJECJJWSRB3H",
            "uris": [{"uri": "https://discord.com"}]
        },
        "favorite": True,
        "folderId": None,
        "notes": None
    },
    {
        "id": "item-004",
        "name": "Secure Note",
        "type": 2,  # Note type
        "notes": "This is a secure note with sensitive information.",
        "favorite": False,
        "folderId": None
    },
]

MOCK_STATUS_UNAUTHENTICATED = {
    "serverUrl": "https://vault.bitwarden.com",
    "lastSync": None,
    "userEmail": None,
    "userId": None,
    "status": "unauthenticated"
}

MOCK_STATUS_LOCKED = {
    "serverUrl": "https://vault.bitwarden.com",
    "lastSync": "2024-01-15T10:30:00.000Z",
    "userEmail": "user@example.com",
    "userId": "user-123",
    "status": "locked"
}

MOCK_STATUS_UNLOCKED = {
    "serverUrl": "https://vault.bitwarden.com",
    "lastSync": "2024-01-15T10:30:00.000Z",
    "userEmail": "user@example.com",
    "userId": "user-123",
    "status": "unlocked"
}

MOCK_SESSION_KEY = "mock-session-key-abc123def456"

MOCK_TOTP_CODE = "123456"


# ─────────────────────────────────────────────────────────────────────────────
# Mock Subprocess Result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class MockCompletedProcess:
    """Mock subprocess.CompletedProcess result."""
    returncode: int
    stdout: str
    stderr: str


class SubprocessMocker:
    """
    Context manager that mocks subprocess.run with configurable responses.
    """
    
    def __init__(self):
        self.state = "unauthenticated"  # unauthenticated, locked, unlocked
        self.flatpak_installed = True
        self.bitwarden_installed = True
        self.valid_email = "user@example.com"
        self.valid_password = "correct_password"
        self.valid_master_password = "correct_master"
        self.clipboard_method = "wl-copy"  # wl-copy, xclip, xsel, None
        
    def mock_subprocess_run(self, cmd: list, **kwargs) -> MockCompletedProcess:
        """Route commands to appropriate mock handlers."""
        cmd_str = " ".join(cmd)
        
        # Flatpak version check
        if cmd == ["flatpak", "--version"]:
            if self.flatpak_installed:
                return MockCompletedProcess(0, "Flatpak 1.14.4", "")
            return MockCompletedProcess(1, "", "command not found: flatpak")
        
        # Flatpak info check (Bitwarden installed)
        if "flatpak" in cmd and "info" in cmd:
            if not self.flatpak_installed:
                return MockCompletedProcess(1, "", "command not found: flatpak")
            if self.bitwarden_installed:
                return MockCompletedProcess(0, "Bitwarden - 2024.1.0", "")
            return MockCompletedProcess(1, "", "error: com.bitwarden.desktop not installed")
        
        # Bitwarden CLI commands via flatpak
        if "flatpak" in cmd and "--command=bw" in cmd:
            return self._handle_bw_command(cmd, kwargs)
        
        # Clipboard commands
        if cmd[0] == "wl-copy":
            return self._handle_wl_copy(cmd, kwargs)
        if cmd[0] == "xclip":
            return self._handle_xclip(cmd, kwargs)
        if cmd[0] == "xsel":
            return self._handle_xsel(cmd, kwargs)
        
        # Unknown command
        return MockCompletedProcess(127, "", f"command not found: {cmd[0]}")
    
    def _handle_bw_command(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Handle Bitwarden CLI commands."""
        # Extract bw subcommand
        try:
            bw_idx = cmd.index("--command=bw") + 1
            # Skip the app ID
            bw_cmd = cmd[bw_idx + 1] if bw_idx + 1 < len(cmd) else None
        except (ValueError, IndexError):
            return MockCompletedProcess(1, "", "Invalid command")
        
        if bw_cmd == "status":
            return self._handle_status()
        elif bw_cmd == "login":
            return self._handle_login(cmd, kwargs)
        elif bw_cmd == "unlock":
            return self._handle_unlock(cmd, kwargs)
        elif bw_cmd == "lock":
            return self._handle_lock()
        elif bw_cmd == "logout":
            return self._handle_logout()
        elif bw_cmd == "list":
            return self._handle_list(cmd)
        elif bw_cmd == "get":
            return self._handle_get(cmd)
        
        return MockCompletedProcess(1, "", f"Unknown command: {bw_cmd}")
    
    def _handle_status(self) -> MockCompletedProcess:
        """Mock status command."""
        if self.state == "unauthenticated":
            return MockCompletedProcess(0, json.dumps(MOCK_STATUS_UNAUTHENTICATED), "")
        elif self.state == "locked":
            return MockCompletedProcess(0, json.dumps(MOCK_STATUS_LOCKED), "")
        else:  # unlocked
            return MockCompletedProcess(0, json.dumps(MOCK_STATUS_UNLOCKED), "")
    
    def _handle_login(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Mock login command."""
        if self.state != "unauthenticated":
            return MockCompletedProcess(1, "", "You are already logged in as user@example.com.")
        
        # Check password from environment
        env = kwargs.get("env", {})
        password = env.get("BW_PASSWORD", "")
        
        # Find email in command
        email = None
        for i, arg in enumerate(cmd):
            if "@" in arg and "command" not in arg:
                email = arg
                break
        
        if email == self.valid_email and password == self.valid_password:
            self.state = "locked"
            return MockCompletedProcess(0, "", "")
        
        return MockCompletedProcess(1, "", "Invalid master password.")
    
    def _handle_unlock(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Mock unlock command."""
        if self.state == "unauthenticated":
            return MockCompletedProcess(1, "", "You are not logged in.")
        
        if self.state == "unlocked":
            return MockCompletedProcess(0, MOCK_SESSION_KEY, "")
        
        # Check password from environment
        env = kwargs.get("env", {})
        password = env.get("BW_PASSWORD", "")
        
        if password == self.valid_master_password:
            self.state = "unlocked"
            return MockCompletedProcess(0, MOCK_SESSION_KEY, "")
        
        return MockCompletedProcess(1, "", "Invalid master password.")
    
    def _handle_lock(self) -> MockCompletedProcess:
        """Mock lock command."""
        if self.state == "unlocked":
            self.state = "locked"
        return MockCompletedProcess(0, "Your vault is locked.", "")
    
    def _handle_logout(self) -> MockCompletedProcess:
        """Mock logout command."""
        if self.state == "unauthenticated":
            return MockCompletedProcess(1, "", "You are not logged in.")
        self.state = "unauthenticated"
        return MockCompletedProcess(0, "You have logged out.", "")
    
    def _handle_list(self, cmd: list) -> MockCompletedProcess:
        """Mock list command."""
        if self.state == "unauthenticated":
            return MockCompletedProcess(1, "", "You are not logged in.")
        if self.state == "locked":
            return MockCompletedProcess(1, "", "Vault is locked.")
        
        if "items" in cmd:
            return MockCompletedProcess(0, json.dumps(MOCK_VAULT_ITEMS), "")
        
        return MockCompletedProcess(1, "", "Unknown list type")
    
    def _handle_get(self, cmd: list) -> MockCompletedProcess:
        """Mock get command."""
        if self.state == "unauthenticated":
            return MockCompletedProcess(1, "", "You are not logged in.")
        if self.state == "locked":
            return MockCompletedProcess(1, "", "Vault is locked.")
        
        # get item <id>
        if "item" in cmd:
            item_id = cmd[-2] if cmd[-1] == "--raw" else cmd[-1]
            for item in MOCK_VAULT_ITEMS:
                if item["id"] == item_id:
                    return MockCompletedProcess(0, json.dumps(item), "")
            return MockCompletedProcess(1, "", "Not found.")
        
        # get totp <id>
        if "totp" in cmd:
            item_id = cmd[-2] if cmd[-1] == "--raw" else cmd[-1]
            for item in MOCK_VAULT_ITEMS:
                if item["id"] == item_id:
                    if item.get("login", {}).get("totp"):
                        return MockCompletedProcess(0, MOCK_TOTP_CODE, "")
                    return MockCompletedProcess(1, "", "No TOTP available for this item.")
            return MockCompletedProcess(1, "", "Not found.")
        
        return MockCompletedProcess(1, "", "Unknown get type")
    
    def _handle_wl_copy(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Mock wl-copy command."""
        if self.clipboard_method == "wl-copy":
            return MockCompletedProcess(0, "", "")
        return MockCompletedProcess(1, "", "wl-copy: error")
    
    def _handle_xclip(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Mock xclip command."""
        if self.clipboard_method == "xclip":
            return MockCompletedProcess(0, "", "")
        return MockCompletedProcess(1, "", "xclip: error")
    
    def _handle_xsel(self, cmd: list, kwargs: dict) -> MockCompletedProcess:
        """Mock xsel command."""
        if self.clipboard_method == "xsel":
            return MockCompletedProcess(0, "", "")
        return MockCompletedProcess(1, "", "xsel: error")


# ─────────────────────────────────────────────────────────────────────────────
# Test Cases
# ─────────────────────────────────────────────────────────────────────────────

class TestBitwardenCLI(unittest.TestCase):
    """Test suite for BitwardenCLI backend."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mocker = SubprocessMocker()
        self.cli = BitwardenCLI()
    
    def _patch_subprocess(self):
        """Create subprocess.run patch."""
        return patch("subprocess.run", side_effect=self.mocker.mock_subprocess_run)
    
    def _patch_which(self, available_commands: list[str]):
        """Create shutil.which patch."""
        def mock_which(cmd):
            return f"/usr/bin/{cmd}" if cmd in available_commands else None
        return patch("shutil.which", side_effect=mock_which)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Environment Check Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_check_flatpak_installed(self):
        """Test flatpak check when installed."""
        self.mocker.flatpak_installed = True
        
        with self._patch_subprocess():
            result = self.cli.check_flatpak()
        
        self.assertTrue(result["ok"])
        self.assertIn("version", result["data"])
    
    def test_check_flatpak_missing(self):
        """Test flatpak check when not installed."""
        self.mocker.flatpak_installed = False
        
        with self._patch_subprocess():
            result = self.cli.check_flatpak()
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "FLATPAK_MISSING")
    
    def test_check_bitwarden_installed(self):
        """Test Bitwarden check when installed."""
        self.mocker.bitwarden_installed = True
        
        with self._patch_subprocess():
            result = self.cli.check_bitwarden()
        
        self.assertTrue(result["ok"])
        self.assertTrue(result["data"]["installed"])
    
    def test_check_bitwarden_missing(self):
        """Test Bitwarden check when not installed."""
        self.mocker.bitwarden_installed = False
        
        with self._patch_subprocess():
            result = self.cli.check_bitwarden()
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "BITWARDEN_MISSING")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Status Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_status_unauthenticated(self):
        """Test status when unauthenticated."""
        self.mocker.state = "unauthenticated"
        
        with self._patch_subprocess():
            result = self.cli.status()
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["status"], "unauthenticated")
    
    def test_status_locked(self):
        """Test status when locked."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.status()
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["status"], "locked")
        self.assertEqual(result["data"]["userEmail"], "user@example.com")
    
    def test_status_unlocked(self):
        """Test status when unlocked."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.status()
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["status"], "unlocked")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Login Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_login_success(self):
        """Test successful login."""
        self.mocker.state = "unauthenticated"
        
        with self._patch_subprocess():
            result = self.cli.login(
                self.mocker.valid_email,
                self.mocker.valid_password
            )
        
        self.assertTrue(result["ok"])
        self.assertEqual(self.mocker.state, "locked")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        self.mocker.state = "unauthenticated"
        
        with self._patch_subprocess():
            result = self.cli.login("wrong@email.com", "wrong_password")
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "INVALID_CREDENTIALS")
    
    def test_login_already_logged_in(self):
        """Test login when already logged in."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.login(
                self.mocker.valid_email,
                self.mocker.valid_password
            )
        
        # Backend returns success with "already" flag when already logged in
        self.assertTrue(result["ok"])
        self.assertTrue(result["data"].get("already", False))
    
    # ─────────────────────────────────────────────────────────────────────────
    # Unlock Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_unlock_success(self):
        """Test successful unlock."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.unlock(self.mocker.valid_master_password)
        
        self.assertTrue(result["ok"])
        self.assertEqual(self.mocker.state, "unlocked")
        self.assertIn("session_key", result["data"])
    
    def test_unlock_invalid_password(self):
        """Test unlock with invalid password."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.unlock("wrong_master_password")
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "INVALID_CREDENTIALS")
    
    def test_unlock_not_logged_in(self):
        """Test unlock when not logged in."""
        self.mocker.state = "unauthenticated"
        
        with self._patch_subprocess():
            result = self.cli.unlock(self.mocker.valid_master_password)
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "NOT_AUTHENTICATED")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Lock/Logout Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_lock_success(self):
        """Test successful lock."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.lock()
        
        self.assertTrue(result["ok"])
        self.assertEqual(self.mocker.state, "locked")
    
    def test_logout_success(self):
        """Test successful logout."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.logout()
        
        self.assertTrue(result["ok"])
        self.assertEqual(self.mocker.state, "unauthenticated")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Vault Operation Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_list_items_success(self):
        """Test listing items when unlocked."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.list_items()
        
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["data"]), len(MOCK_VAULT_ITEMS))
    
    def test_list_items_locked(self):
        """Test listing items when locked."""
        self.mocker.state = "locked"
        
        with self._patch_subprocess():
            result = self.cli.list_items()
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "LOCKED")
    
    def test_list_items_unauthenticated(self):
        """Test listing items when unauthenticated."""
        self.mocker.state = "unauthenticated"
        
        with self._patch_subprocess():
            result = self.cli.list_items()
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "NOT_AUTHENTICATED")
    
    def test_get_item_success(self):
        """Test getting specific item."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.get_item("item-001")
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["name"], "GitHub")
        self.assertEqual(result["data"]["login"]["username"], "user@example.com")
    
    def test_get_item_not_found(self):
        """Test getting non-existent item."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.get_item("non-existent-id")
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "COMMAND_FAILED")
    
    def test_get_totp_success(self):
        """Test getting TOTP code."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.get_totp("item-001")  # GitHub has TOTP
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["totp"], MOCK_TOTP_CODE)
    
    def test_get_totp_not_available(self):
        """Test getting TOTP for item without TOTP."""
        self.mocker.state = "unlocked"
        
        with self._patch_subprocess():
            result = self.cli.get_totp("item-002")  # Steam has no TOTP
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "COMMAND_FAILED")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Clipboard Tests
    # ─────────────────────────────────────────────────────────────────────────
    
    def test_clipboard_wl_copy(self):
        """Test clipboard with wl-copy."""
        self.mocker.clipboard_method = "wl-copy"
        
        with self._patch_subprocess(), self._patch_which(["wl-copy"]):
            result = self.cli.copy_to_clipboard("test_password")
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["method"], "wl-copy")
    
    def test_clipboard_xclip_fallback(self):
        """Test clipboard fallback to xclip."""
        self.mocker.clipboard_method = "xclip"
        
        with self._patch_subprocess(), self._patch_which(["xclip"]):
            result = self.cli.copy_to_clipboard("test_password")
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["method"], "xclip")
    
    def test_clipboard_xsel_fallback(self):
        """Test clipboard fallback to xsel."""
        self.mocker.clipboard_method = "xsel"
        
        with self._patch_subprocess(), self._patch_which(["xsel"]):
            result = self.cli.copy_to_clipboard("test_password")
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["method"], "xsel")
    
    def test_clipboard_all_fail(self):
        """Test clipboard when all methods fail."""
        self.mocker.clipboard_method = None
        
        with self._patch_subprocess(), self._patch_which([]):
            result = self.cli.copy_to_clipboard("test_password")
        
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "CLIPBOARD_ERROR")


# ─────────────────────────────────────────────────────────────────────────────
# Full Flow Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFullFlow(unittest.TestCase):
    """Integration tests for complete user flows."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mocker = SubprocessMocker()
        self.cli = BitwardenCLI()
    
    def _patch_subprocess(self):
        return patch("subprocess.run", side_effect=self.mocker.mock_subprocess_run)
    
    def _patch_which(self, available_commands: list[str]):
        def mock_which(cmd):
            return f"/usr/bin/{cmd}" if cmd in available_commands else None
        return patch("shutil.which", side_effect=mock_which)
    
    def test_full_login_unlock_copy_flow(self):
        """Test complete flow: login -> unlock -> list -> get -> copy."""
        self.mocker.state = "unauthenticated"
        self.mocker.clipboard_method = "wl-copy"
        
        with self._patch_subprocess(), self._patch_which(["wl-copy"]):
            # Check environment
            result = self.cli.check_flatpak()
            self.assertTrue(result["ok"])
            
            result = self.cli.check_bitwarden()
            self.assertTrue(result["ok"])
            
            # Check initial status
            result = self.cli.status()
            self.assertEqual(result["data"]["status"], "unauthenticated")
            
            # Login
            result = self.cli.login(
                self.mocker.valid_email,
                self.mocker.valid_password
            )
            self.assertTrue(result["ok"])
            
            # Verify locked status
            result = self.cli.status()
            self.assertEqual(result["data"]["status"], "locked")
            
            # Unlock
            result = self.cli.unlock(self.mocker.valid_master_password)
            self.assertTrue(result["ok"])
            
            # Verify unlocked status
            result = self.cli.status()
            self.assertEqual(result["data"]["status"], "unlocked")
            
            # List items
            result = self.cli.list_items()
            self.assertTrue(result["ok"])
            self.assertGreater(len(result["data"]), 0)
            
            # Get specific item
            result = self.cli.get_item("item-001")
            self.assertTrue(result["ok"])
            
            # Copy password
            password = result["data"]["login"]["password"]
            result = self.cli.copy_to_clipboard(password)
            self.assertTrue(result["ok"])
            
            # Get TOTP
            result = self.cli.get_totp("item-001")
            self.assertTrue(result["ok"])
            
            # Lock vault
            result = self.cli.lock()
            self.assertTrue(result["ok"])
            
            # Verify locked
            result = self.cli.status()
            self.assertEqual(result["data"]["status"], "locked")
            
            # Logout
            result = self.cli.logout()
            self.assertTrue(result["ok"])
            
            # Verify logged out
            result = self.cli.status()
            self.assertEqual(result["data"]["status"], "unauthenticated")


# ─────────────────────────────────────────────────────────────────────────────
# Test Runner
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 70)
    print("Bitwarden Backend Test Harness")
    print("=" * 70)
    print()
    
    # Run tests with verbosity
    unittest.main(verbosity=2)
