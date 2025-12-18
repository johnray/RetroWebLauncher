# RetroWebLauncher

A modern web frontend for Retrobat - browse and launch your retro game collection from any device on your network.

## Features

- **Web-based interface** - Access your game library from any browser
- **Safari-optimized** - Works great on iOS, iPadOS, macOS, and Apple TV
- **Multiple views** - Wheel carousel, grid, and list views
- **Full-text search** - Find games instantly across all systems
- **Gamepad support** - Navigate with controller, keyboard, or touch
- **Attract mode** - Screensaver with random game showcase
- **Themes** - Classic Arcade and Dark Modern included
- **AI-powered** - Optional natural language search (Ollama/OpenAI)
- **PWA support** - Install as an app on your devices
- **Fully portable** - Copy to any Windows machine, no installation needed

## Quick Start

### Option 1: Portable Mode (Recommended)

No Node.js installation required! The app can download its own portable Node.js.

1. Extract RetroWebLauncher to any folder
2. Run `rwl.bat`
3. Select option 7 "Make Portable" to download Node.js
4. Select option 1 "Start Server"
5. Open http://localhost:3000 in your browser

### Option 2: With System Node.js

If you already have Node.js 18+ installed:

1. Run `setup.bat` (or `rwl setup`)
2. Follow the prompts to configure your Retrobat path
3. Run `start.bat` (or `rwl start`)
4. Open http://localhost:3000 in your browser

## Controller Script (rwl.bat)

The unified controller script provides easy access to all functions:

```
rwl start     - Start the server
rwl stop      - Stop the server
rwl restart   - Restart the server
rwl status    - Show server status
rwl setup     - Run configuration wizard
rwl install   - Install Node.js dependencies
rwl portable  - Download portable Node.js
rwl help      - Show help
```

Run `rwl` without arguments to open the interactive menu.

## Portable Installation

RetroWebLauncher can run completely self-contained without any system-wide installation:

1. Run `rwl portable` to download a bundled copy of Node.js
2. All files (Node.js, dependencies, config) stay within the app folder
3. Copy the entire folder to any Windows machine
4. Sync between computers via cloud storage (Dropbox, OneDrive, etc.)

**Note:** The `node_modules` folder and `node` folder should be synced along with everything else for a complete portable installation.

## Windows Startup

To start RetroWebLauncher automatically when Windows starts:

### Method 1: Setup Wizard
Run `setup.bat` and choose "Yes" when asked about Windows startup.

### Method 2: Manual
1. Press `Win+R` and type: `shell:startup`
2. Create a shortcut to `start.bat` in that folder
3. Right-click the shortcut > Properties > Run: Minimized

### Method 3: Via Installer
The Windows installer offers a startup option during installation.

## Accessing from Other Devices

Once the server is running, access it from any device on your network:

1. Run `rwl status` to see your network IP address
2. On your phone/tablet/TV, open: `http://YOUR_IP:3000`
3. Add to home screen for app-like experience (PWA)

**Note:** You may need to add a firewall rule. Run `setup.bat` as Administrator and select the firewall option.

## Configuration

Configuration is stored in `rwl.config.json`:

```json
{
  "retrobatPath": "E:\\Emulators-and-Launchers\\RetroBat",
  "port": 3000,
  "arcadeName": "My Arcade",
  "theme": "classic-arcade",
  "defaultView": "wheel",
  "showHiddenGames": false,
  "attractMode": {
    "enabled": true,
    "idleTimeout": 300
  },
  "ai": {
    "enabled": false,
    "provider": "ollama"
  }
}
```

Edit manually or run `setup.bat` to reconfigure.

## Themes

Two themes are included:

- **Classic Arcade** - Neon colors, pixel fonts, CRT effects
- **Dark Modern** - Clean design, glass morphism, smooth animations

Change themes in Settings or edit `rwl.config.json`.

### Creating Custom Themes

Themes use a JSON-based configuration system - no CSS knowledge required:

```json
{
  "name": "My Theme",
  "colors": {
    "preset": "neon",
    "primary": "#ff0066"
  },
  "fonts": {
    "preset": "retro"
  },
  "effects": {
    "preset": "arcade"
  }
}
```

## AI Features (Optional)

Enable natural language search like "2 player shooters from the 90s":

### Ollama (Local, Free)
1. Install Ollama from https://ollama.ai
2. Run: `ollama pull llama2`
3. Set `ai.enabled: true` in config

### OpenAI
1. Get an API key from https://platform.openai.com
2. Set `ai.enabled: true` and `ai.provider: "openai"` in config
3. Set environment variable: `OPENAI_API_KEY=your-key`

## Troubleshooting

### Server won't start
- Run `rwl status` to check if it's already running
- Check if port 3000 is in use by another app
- Run `rwl stop` then `rwl start`

### Dependencies missing
- Run `rwl install` to reinstall dependencies
- If using portable mode, ensure `node` folder exists

### Can't access from other devices
- Check firewall settings
- Run `setup.bat` as Administrator to add firewall rule
- Verify devices are on the same network

### Games not showing
- Verify Retrobat path in `rwl.config.json`
- Check that `emulatorLauncher.exe` exists in that path
- Run library rescan from Settings

## File Structure

```
RetroWebLauncher/
├── rwl.bat              # Controller script (main entry point)
├── start.bat            # Start server
├── stop.bat             # Stop server
├── setup.bat            # Setup wizard
├── install.bat          # Install dependencies
├── rwl.config.json      # Configuration (created by setup)
├── package.json         # Node.js dependencies
├── node/                # Portable Node.js (if using portable mode)
├── node_modules/        # Dependencies
├── src/
│   ├── server/          # Backend (Express, Socket.io)
│   └── client/          # Frontend (Web Components)
├── themes/              # Theme files
└── data/                # SQLite cache database
```

## Requirements

- **Windows 10 or later**
- **Node.js 18+** (or use portable mode)
- **Retrobat** installation with game library

## License

MIT License - See LICENSE file for details.

## Author

John Ray (johnray@mac.com)
