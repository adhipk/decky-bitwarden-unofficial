# Project: Bitwarden Decky Plugin (MVP)

---

# Decky Plugin Template Reference

This project is based on the official [decky-plugin-template](https://github.com/SteamDeckHomebrew/decky-plugin-template). Below are the conventions and APIs used by the template.

## Project Structure

```
plugin-name/
├── backend/              # Optional: C/Rust backend (compiled binary)
│   ├── src/              # Source code
│   ├── out/              # Compiled binaries (output by build)
│   ├── Dockerfile        # Build container
│   └── Makefile          # Build rules
├── src/
│   └── index.tsx         # Frontend entry point (React)
├── dist/                 # Compiled frontend (output by pnpm build)
│   └── index.js
├── py_modules/           # Additional Python modules (if needed)
├── main.py               # Python backend entry point
├── plugin.json           # Plugin metadata
├── package.json          # Node dependencies and scripts
├── rollup.config.js      # Frontend build configuration
├── decky.pyi             # Python type stubs for IDE support
└── assets/               # Plugin assets (logo, etc.)
```

## Development Environment

**Requirements:**

* Node.js v16.14+
* pnpm v9 (`npm i -g pnpm@9`)
* Docker (only if using compiled backend)

**Build Commands:**

```bash
pnpm install        # Install dependencies
pnpm run build      # Build frontend
pnpm run watch      # Build with hot reload
```

## Frontend API (@decky/api)

The frontend uses `@decky/api` and `@decky/ui` packages.

### Calling Python Backend

Use `callable` to create typed RPC functions:

```typescript
import { callable } from "@decky/api";

// callable<[...args], returnType>("method_name")
const myMethod = callable<[param1: string, param2: number], boolean>("my_method");

// Call it
const result = await myMethod("hello", 42);
```

### Event Handling (Backend → Frontend)

```typescript
import { addEventListener, removeEventListener } from "@decky/api";

// Listen for events from Python
const listener = addEventListener<[arg1: string, arg2: boolean]>(
  "event_name",
  (arg1, arg2) => {
    console.log("Got event:", arg1, arg2);
  }
);

// Clean up
removeEventListener("event_name", listener);
```

### Plugin Definition

```typescript
import { definePlugin, toaster } from "@decky/api";
import { ButtonItem, PanelSection } from "@decky/ui";

export default definePlugin(() => {
  // Plugin initialization code runs once on startup

  return {
    name: "Plugin Name",                    // Shown in Decky menus
    titleView: <div>Title</div>,            // Top of plugin menu
    content: <YourComponent />,             // Plugin menu content
    icon: <FaIcon />,                       // Icon in plugin list
    onDismount() {                          // Cleanup on unload
      // Remove listeners, routes, etc.
    },
  };
});
```

### UI Components (@decky/ui)

Available components from `@decky/ui`:

* `PanelSection` / `PanelSectionRow` - Layout containers
* `ButtonItem` - Clickable button
* `TextField` - Text input
* `Toggle` - Boolean toggle switch
* `Dropdown` / `DropdownItem` - Selection dropdown
* `Spinner` - Loading indicator
* `Navigation` - Page navigation
* `staticClasses` - Steam UI CSS classes

## Python Backend (main.py)

### Plugin Class Structure

```python
import decky
import asyncio

class Plugin:
    # Public async methods are exposed to frontend via RPC
    async def my_method(self, param1: str, param2: int) -> bool:
        return True

    # Lifecycle: Called on plugin load
    async def _main(self):
        self.loop = asyncio.get_event_loop()
        decky.logger.info("Plugin loaded")

    # Lifecycle: Called when plugin stops (but not removed)
    async def _unload(self):
        decky.logger.info("Plugin unloading")

    # Lifecycle: Called on plugin uninstall
    async def _uninstall(self):
        decky.logger.info("Plugin uninstalled")

    # Lifecycle: Called before _main() for data migration
    async def _migration(self):
        decky.migrate_settings(...)  # Migrate old config paths
```

### Emitting Events to Frontend

```python
# From within a Plugin method:
await decky.emit("event_name", "arg1", True, 42)
```

### Decky Module Constants

```python
import decky

# User/system paths
decky.HOME                      # e.g., /home/deck
decky.USER                      # e.g., deck
decky.DECKY_HOME                # e.g., /home/deck/homebrew
decky.DECKY_USER_HOME           # e.g., /home/deck

# Plugin-specific paths (auto-created)
decky.DECKY_PLUGIN_DIR          # Plugin root directory
decky.DECKY_PLUGIN_SETTINGS_DIR # For config files
decky.DECKY_PLUGIN_RUNTIME_DIR  # For runtime data
decky.DECKY_PLUGIN_LOG_DIR      # For log files
decky.DECKY_PLUGIN_LOG          # Main log file path

# Plugin metadata (from plugin.json / package.json)
decky.DECKY_PLUGIN_NAME
decky.DECKY_PLUGIN_VERSION
decky.DECKY_PLUGIN_AUTHOR
decky.DECKY_VERSION             # Decky Loader version
```

### Logging

```python
decky.logger.info("Message")
decky.logger.error("Error occurred")
decky.logger.debug("Debug info")
```

## plugin.json Schema

```json
{
  "name": "Plugin Name",
  "author": "Author Name",
  "flags": ["debug"],
  "api_version": 1,
  "publish": {
    "tags": ["utility"],
    "description": "Short description",
    "image": "https://example.com/image.png"
  }
}
```

**Flags:**

* `debug` - Enable debug mode
* `_root` - Run Python backend as root (required for system operations)

## Distribution

**Plugin Store Submission:** Follow [decky-plugin-database](https://github.com/SteamDeckHomebrew/decky-plugin-database)

**Manual Distribution Zip Structure:**

```
pluginname-v1.0.0.zip
└── pluginname/
    ├── bin/           # Optional: compiled binaries
    ├── dist/
    │   └── index.js   # Frontend bundle
    ├── py_modules/    # Optional: additional Python modules
    ├── main.py        # Python backend
    ├── plugin.json    # Plugin metadata
    ├── package.json   # Package info
    ├── LICENSE
    └── README.md      # Optional
```

---

## Objective

Build a Decky Loader plugin for Steam Deck that integrates with Bitwarden via the Bitwarden Flatpak and its bundled CLI. The plugin must work fully in Game Mode without requiring the user to open a terminal. The only external step required is installing Bitwarden from Flathub in Desktop Mode.

Core MVP capabilities:

* Detect Flatpak availability
* Detect Bitwarden Flatpak installation
* Interact with Bitwarden CLI through Flatpak invocation
* Login (email/password)
* Unlock (master password)
* List vault items
* Search vault items (client-side)
* Get item details
* Copy username/password/TOTP to clipboard
* Robust error returns for UI

## Architecture

The plugin has two components:

1. Frontend: React + decky-frontend-lib (TypeScript)
2. Backend: Python module invoked by Decky (subprocess wrapper around Bitwarden CLI)

Communication between frontend and backend is via Decky RPC bridge calls.

---

# Requirements

## Hard Requirements

* No bundling of `bw` binary in MVP.
* Must use `flatpak run --command=bw com.bitwarden.desktop`.
* No terminal usage by end user.
* Must handle error reporting cleanly.
* Clipboard copy must function in Desktop Mode tests.
* All backend calls return structured JSON to frontend.

## Soft Requirements

* Minimal state machine UI.
* Code must be readable and maintainable.
* Commands must be wrapped with timeouts and capture stderr.

---

# External Dependencies

* Steam Deck with Decky Loader installed
* Flatpak installed on system
* Bitwarden Flatpak installed: `com.bitwarden.desktop`

Bitwarden CLI invocation syntax:

```
flatpak run --command=bw com.bitwarden.desktop <cmd> <args...>
```

---

# Backend Specification (Python)

## Module: `bitwarden_backend.py`

### Class: `BitwardenCLI`

Methods (all return structured JSON or raise internal exception):

* `check_flatpak() -> dict`
* `check_bitwarden() -> dict`
* `status() -> dict`
* `login(email: str, password: str) -> dict`
* `unlock(master_password: str) -> dict`
* `list_items() -> dict`
* `get_item(item_id: str) -> dict`
* `copy_to_clipboard(text: str) -> dict`

### Backend Outputs

All backend outputs must follow:

```
{
  "ok": true | false,
  "error": "CODE_IF_FALSE",
  "data": <value or null>
}
```

Error codes:

* `FLATPAK_MISSING`
* `BITWARDEN_MISSING`
* `NOT_AUTHENTICATED`
* `LOCKED`
* `INVALID_CREDENTIALS`
* `COMMAND_FAILED`
* `CLIPBOARD_ERROR`
* `UNKNOWN_ERROR`

### Subprocess Execution Rules

* Use `subprocess.run` with:

  * `capture_output=True`
  * `text=True`
  * `timeout=10`
* Parse stdout as JSON when `--raw` is used.
* stderr should be included in error paths for debugging.

### CLI Commands Used

* Status:
  `flatpak run --command=bw com.bitwarden.desktop status --raw`
* Login:
  `flatpak run --command=bw com.bitwarden.desktop login <email> --passwordenv`
* Unlock:
  `flatpak run --command=bw com.bitwarden.desktop unlock <master_password> --raw`
* List items:
  `flatpak run --command=bw com.bitwarden.desktop list items --raw`
* Get item:
  `flatpak run --command=bw com.bitwarden.desktop get item <id> --raw`

---

# Frontend Specification (React)

## UI States

The frontend must implement these states in a simple state machine:

1. `FLATPAK_MISSING`
2. `BITWARDEN_MISSING`
3. `UNAUTHENTICATED`
4. `LOCKED`
5. `UNLOCKED`

## Layout

* Top-level view chooses state and renders corresponding components.
* Search field filters items by `.name` substring (case-insensitive).
* Item detail view shows:

  * username [copy]
  * password [copy]
  * TOTP [copy]

## Frontend to Backend RPC

Expose these through decky bridge:

* `status()`
* `login(email, password)`
* `unlock(masterPassword)`
* `listItems()`
* `getItem(id)`
* `copy(text)`

Frontend expects standard JSON format defined above.

---

# State Flows

Startup procedure:

1. Call `check_flatpak()`

   * If false → UI: `FLATPAK_MISSING`
2. Call `check_bitwarden()`

   * If false → UI: `BITWARDEN_MISSING`
3. Call `status()`

   * status=unauthenticated → UI: `UNAUTHENTICATED`
   * status=locked → UI: `LOCKED`
   * status=unlocked → UI: `UNLOCKED`

Authentication flow:

* `UNAUTHENTICATED`:

  * User enters email/password
  * Call `login(email,password)`
  * On success, transitions to `LOCKED`

* `LOCKED`:

  * User enters master password
  * Call `unlock(masterPassword)`
  * On success, transitions to `UNLOCKED`

Unlocked flow:

* Call `listItems()`
* Render list and search
* On item click:

  * Call `getItem(id)`
  * Render detail view
  * Copy buttons call `copy(text)`

---

# Clipboard Handling

MVP clipboard strategy:

Order of attempts:

1. `wl-copy`
2. `xclip`
3. Python `pyperclip`

On failure, backend returns `{ok:false, error:"CLIPBOARD_ERROR"}`

---

# Testing Requirements

Desktop Mode tests:

* Flatpak missing scenario
* Bitwarden missing scenario
* login failure
* unlock failure
* list items
* search items
* get item
* clipboard

Game Mode smoke tests:

* Plugin opens without crash
* Copy actions do not freeze the UI

---

# Delivery Artifacts

* `plugin.json`
* `backend/bitwarden_backend.py`
* `frontend/src/index.tsx` with state machine
* `README.md` with install instructions
* No binary assets required

README must include:

* Requirements list
* One-time install instructions for Bitwarden via Flathub
* Known limitations and security notes

---

# Security Notes

For MVP:

* No master password storage
* Clear that login/unlock credentials are passed only to official Bitwarden CLI through Flatpak
* No telemetry
* No vault caching beyond CLI's internal mechanisms

Future improvements possible (not part of MVP):

* PIN-based unlock
* Idle auto-lock
* Bundled CLI for Game Mode only onboarding
* Device Flow login

---

# Acceptance Criteria (MVP Complete)

The MVP is considered complete when:

* User installs Bitwarden via Discover in Desktop Mode
* User installs Decky plugin in Game Mode
* Plugin detects Bitwarden properly
* User logs in and unlocks
* User sees and searches vault items
* User clicks item and copies fields
* No terminal use required

