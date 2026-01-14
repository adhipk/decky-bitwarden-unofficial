"""
Bitwarden CLI wrapper module.

This module provides a central interface for calling the Bitwarden CLI (bw).

Resolution for finding `bw`:
1. Plugin's `backend/bin/bw` (bundled binary - REQUIRED for Game Mode)
   - This is the only supported location in production.
2. (Optional for dev) Legacy `bin/bw` inside the plugin folder.

We intentionally DO NOT:
- Read BW_PATH
- Search system paths
- Rely on PATH

Reason: for UX + reliability, the plugin owns its bw binary and loads it
from a known relative path that works in Game Mode without user setup.
"""

import os
import subprocess
import shutil
from typing import Any


# Cache the resolved path
_bw_path_cache: str | None = None

# Plugin directory - set by init_plugin_dir() from main.py
_plugin_dir: str | None = None


def init_plugin_dir(plugin_dir: str):
    """Initialize the plugin directory path (called from main.py)."""
    global _plugin_dir, _bw_path_cache
    _plugin_dir = plugin_dir
    _bw_path_cache = None  # Reset cache when plugin dir changes


def get_bw_path(debug_callback=None) -> str | None:
    """
    Resolve the Bitwarden CLI binary path.
    
    Resolution order:
    1. BW_PATH environment variable
    2. Plugin's bin/bw (bundled binary - best for Game Mode)
    3. Common system paths
    4. PATH lookup (fallback)
    
    Args:
        debug_callback: Optional callable for debug logging (e.g. decky.logger.info)
    
    Returns:
        Path to bw binary, or None if not found.
    """
    global _bw_path_cache
    
    def debug(msg):
        if debug_callback:
            debug_callback(f"[bw_path] {msg}")
    
    if _bw_path_cache is not None:
        debug(f"Using cached path: {_bw_path_cache}")
        return _bw_path_cache
    
    debug(f"Plugin dir: {_plugin_dir}")
    debug(f"PATH (ignored for bw resolution): {os.environ.get('PATH', 'NOT SET')[:200]}")  # truncate
    
    # 1. Check plugin's backend/bin/bw (bundled binary - PRIMARY for Game Mode)
    if _plugin_dir:
        # Try backend/bin/bw first (new structure)
        bundled_path = os.path.join(_plugin_dir, "backend", "bin", "bw")
        exists = os.path.isfile(bundled_path)
        exe = os.access(bundled_path, os.X_OK) if exists else False
        debug(f"Bundled (backend/bin) {bundled_path} exists={exists} exe={exe}")
        if exists and exe:
            _bw_path_cache = bundled_path
            return _bw_path_cache
        
        # Fallback to old bin/bw location (backward compat)
        bundled_path_old = os.path.join(_plugin_dir, "bin", "bw")
        exists = os.path.isfile(bundled_path_old)
        exe = os.access(bundled_path_old, os.X_OK) if exists else False
        debug(f"Bundled (bin) {bundled_path_old} exists={exists} exe={exe}")
        if exists and exe:
            _bw_path_cache = bundled_path_old
            return _bw_path_cache
    
    # No BW_PATH, no system paths, no PATH lookup – bundled only
    debug("No bw binary found in bundled paths")
    return None


def clear_path_cache():
    """Clear the cached bw path (useful for testing)."""
    global _bw_path_cache
    _bw_path_cache = None


def run_bw(args: list[str], timeout: int = 30, env: dict | None = None) -> dict[str, Any]:
    """
    Run a Bitwarden CLI command.
    
    Args:
        args: CLI arguments (e.g. ["status", "--raw"])
        timeout: Command timeout in seconds
        env: Optional environment variables to add
    
    Returns:
        Dict with structure:
        {
            "ok": bool,
            "error": str | None,
            "data": Any | None
        }
    """
    bw_path = get_bw_path()
    
    if bw_path is None:
        return {
            "ok": False,
            "error": "BW_BINARY_MISSING",
            "data": {
                "message": "Bitwarden CLI (bw) not found. Run ./scripts/fetch_bw.sh to download the bundled binary (backend/bin/bw)."
            }
        }
    
    try:
        # Build environment
        run_env = os.environ.copy()
        if env:
            run_env.update(env)
        
        # Run command
        result = subprocess.run(
            [bw_path] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=run_env,
        )
        
        if result.returncode == 0:
            return {
                "ok": True,
                "error": None,
                "data": {
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
            }
        else:
            return {
                "ok": False,
                "error": "BW_COMMAND_FAILED",
                "data": {
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
            }
    
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "error": "BW_COMMAND_FAILED",
            "data": {
                "stdout": "",
                "stderr": "Command timed out",
                "returncode": -1
            }
        }
    except Exception as e:
        return {
            "ok": False,
            "error": "BW_COMMAND_FAILED",
            "data": {
                "stdout": "",
                "stderr": str(e),
                "returncode": -1
            }
        }
