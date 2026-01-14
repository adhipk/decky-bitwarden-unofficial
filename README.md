# Bitwarden for Decky Loader (Unofficial)

Access your Bitwarden vault from Steam Deck Game Mode without leaving your game.

## Features

- 🔐 Login with Bitwarden email/password
- 🔓 Unlock vault with master password
- 📋 Search and browse vault items
- 📎 Copy username, password, and TOTP to clipboard
- 🎮 Works entirely in Game Mode

## Requirements

- Steam Deck with [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed
- Bitwarden installed via Flatpak (from Discover store in Desktop Mode)

## Installation

### 1. Install Bitwarden (One-time setup)

1. Switch to Desktop Mode
2. Open the Discover app store
3. Search for "Bitwarden"
4. Install the Bitwarden Flatpak

### 2. Install the Plugin

Install via the Decky Plugin Store (coming soon), or manually:

1. Download the latest release zip
2. Extract to `~/homebrew/plugins/`
3. Restart Decky Loader

## Usage

1. Open Decky Loader in Game Mode (press `...` button)
2. Select "Bitwarden" from the plugin list
3. Login with your Bitwarden credentials
4. Unlock your vault with your master password
5. Search and copy credentials as needed

## Security Notes

- No credentials are stored by this plugin
- All authentication is handled by the official Bitwarden CLI through Flatpak
- No telemetry or data collection
- Session management follows Bitwarden CLI defaults

## Known Limitations

- Requires Bitwarden Flatpak (CLI bundled with desktop app)
- 2FA via authenticator app requires manual entry
- No PIN unlock (MVP limitation)

## Development

```bash
# Install dependencies
pnpm install

# Build frontend
pnpm run build

# Watch mode
pnpm run watch
```

## License

BSD 3-Clause License - See [LICENSE](LICENSE)

## Credits

- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) team
- [Bitwarden](https://bitwarden.com/) for the password manager
- Based on [decky-plugin-template](https://github.com/SteamDeckHomebrew/decky-plugin-template)

---

**Disclaimer:** This is an unofficial community plugin and is not affiliated with Bitwarden, Inc.
