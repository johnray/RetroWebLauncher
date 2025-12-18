# RetroWebLauncher Implementation Plan

## Overview

A Node.js web application providing a modern, Safari-first frontend for Retrobat, accessible from any network device. Runs natively on **Windows** (no WSL).

**Project Name**: RetroWebLauncher (one word)
**Retrobat Path**: `E:\Emulators-and-Launchers\RetroBat`
**Primary Browser Target**: Safari/WebKit (macOS, iOS, iPadOS, Apple TV)
**Secondary**: Chrome

---

## Project Structure

```
RetroWebLauncher/
├── package.json
├── rwl.config.json                 # Main configuration
├── setup.bat                       # Windows setup script
├── install.bat                     # Dependency installer
│
├── src/
│   ├── server/
│   │   ├── index.js                # Express + Socket.io entry
│   │   ├── config.js               # Configuration loader
│   │   │
│   │   ├── retrobat/
│   │   │   ├── parser.js           # es_systems.cfg parser
│   │   │   ├── gamelist.js         # gamelist.xml parser
│   │   │   ├── paths.js            # Windows path handling + symlinks
│   │   │   └── launcher.js         # Game launching (emulatorLauncher.exe)
│   │   │
│   │   ├── cache/
│   │   │   ├── index.js            # Cache manager
│   │   │   └── database.js         # SQLite (better-sqlite3)
│   │   │
│   │   ├── api/
│   │   │   ├── systems.js          # GET /api/systems
│   │   │   ├── games.js            # GET /api/games, POST launch
│   │   │   ├── collections.js      # GET /api/collections
│   │   │   ├── search.js           # GET /api/search
│   │   │   ├── media.js            # GET /api/media/*
│   │   │   └── config.js           # GET/PUT /api/config
│   │   │
│   │   ├── websocket.js            # Socket.io events
│   │   ├── watcher.js              # File watching (chokidar)
│   │   │
│   │   └── ai/                     # Optional AI module
│   │       ├── index.js            # Feature toggle
│   │       ├── search.js           # NLP search
│   │       └── providers/
│   │           ├── ollama.js
│   │           └── openai.js
│   │
│   └── client/
│       ├── index.html              # Main HTML
│       ├── manifest.json           # PWA manifest
│       ├── sw.js                   # Service worker
│       │
│       ├── js/
│       │   ├── app.js              # Bootstrap
│       │   ├── router.js           # Client routing
│       │   ├── state.js            # State management
│       │   ├── api.js              # API client
│       │   │
│       │   ├── components/
│       │   │   ├── rwl-app.js
│       │   │   ├── rwl-header.js       # Arcade name display
│       │   │   ├── rwl-sidebar.js
│       │   │   ├── rwl-wheel-view.js
│       │   │   ├── rwl-grid-view.js
│       │   │   ├── rwl-list-view.js
│       │   │   ├── rwl-game-card.js
│       │   │   ├── rwl-game-detail.js
│       │   │   ├── rwl-video-player.js
│       │   │   ├── rwl-pdf-viewer.js
│       │   │   ├── rwl-search.js
│       │   │   ├── rwl-screensaver.js
│       │   │   ├── rwl-settings.js
│       │   │   └── rwl-qr-code.js
│       │   │
│       │   └── input/
│       │       ├── manager.js          # Unified input
│       │       ├── gamepad.js          # Gamepad API
│       │       ├── keyboard.js
│       │       └── touch.js
│       │
│       └── css/
│           ├── main.css
│           ├── variables.css
│           ├── components/
│           └── safari.css              # Safari-specific
│
├── themes/
│   ├── classic-arcade/             # DEFAULT theme
│   │   ├── theme.yaml
│   │   ├── styles.css
│   │   └── assets/
│   └── dark-modern/
│       ├── theme.yaml
│       ├── styles.css
│       └── assets/
│
├── data/
│   └── rwl.db                      # SQLite cache
│
└── installer/
    └── inno-setup.iss              # Windows installer script
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Backend

**Files to create:**
- `package.json` - Dependencies: express, socket.io, fast-xml-parser, better-sqlite3, chokidar, qrcode
- `src/server/index.js` - Express server with static file serving
- `src/server/config.js` - Load/save rwl.config.json
- `rwl.config.json` - Default configuration including `arcadeName`

**Configuration structure:**
```json
{
  "retrobatPath": "E:\\Emulators-and-Launchers\\RetroBat",
  "port": 3000,
  "arcadeName": "My Arcade",
  "theme": "classic-arcade",
  "showHiddenGames": false,
  "attractMode": { "enabled": true, "idleTimeout": 300 },
  "ai": { "enabled": false }
}
```

### Phase 2: Retrobat Parsing

**Files to create:**
- `src/server/retrobat/parser.js` - Parse es_systems.cfg
- `src/server/retrobat/gamelist.js` - Parse gamelist.xml per system
- `src/server/retrobat/paths.js` - Windows path resolution, symlink following

**Key parsing locations:**
- Systems: `{retrobatPath}\emulationstation\.emulationstation\es_systems.cfg`
- Games: `{romPath}\gamelist.xml` (one per system)
- Collections: `{retrobatPath}\emulationstation\.emulationstation\collections\`

**Critical requirements:**
- Follow Windows symlinks/junctions to external ROM libraries
- Filter hidden games (hidden=true) by default - can be shown via settings override
- Handle Windows paths with backslashes
- Parse 150+ systems, potentially 50k+ games

### Phase 3: Cache & Database

**Files to create:**
- `src/server/cache/database.js` - SQLite schema and queries
- `src/server/cache/index.js` - Cache manager with invalidation

**SQLite schema:**
- `systems` table: id, name, fullname, path, gameCount, etc.
- `games` table: id, systemId, name, path, metadata, hidden flag
- `games_fts` virtual table for full-text search
- Indexes on frequently queried columns

**Performance targets:**
- Initial scan: <30s for 50k games
- Cached startup: <3s

### Phase 4: REST API

**Files to create:**
- `src/server/api/systems.js`
- `src/server/api/games.js`
- `src/server/api/collections.js`
- `src/server/api/search.js`
- `src/server/api/media.js`
- `src/server/api/config.js`

**Endpoints:**
```
GET  /api/systems                 - List systems with game counts
GET  /api/systems/:id             - System details
GET  /api/systems/:id/games       - Paginated game list
GET  /api/games/:id               - Game details
POST /api/games/:id/launch        - Launch game
GET  /api/collections             - List collections
GET  /api/search?q=               - Search games
GET  /api/media/:type/*path       - Serve images/videos/manuals
GET  /api/config                  - Get configuration
PUT  /api/config                  - Update configuration
GET  /api/qrcode                  - Generate QR code for URL
```

### Phase 5: Game Launching

**Files to create:**
- `src/server/retrobat/launcher.js`

**Launch command (Windows):**
```javascript
const { spawn } = require('child_process');
const launcherPath = path.join(retrobatPath, 'emulatorLauncher.exe');
// Kill existing game process if running
spawn(launcherPath, ['-system', systemName, '-rom', romPath], {
  cwd: path.dirname(launcherPath),
  detached: true,
  stdio: 'ignore'
});
```

### Phase 6: WebSocket & File Watching

**Files to create:**
- `src/server/websocket.js` - Socket.io event handling
- `src/server/watcher.js` - chokidar file watching

**Events:**
- `library:updated` - Library rescan complete
- `game:launched` - Game launch status
- `config:changed` - Settings updated

### Phase 7: Frontend Foundation

**Files to create:**
- `src/client/index.html`
- `src/client/js/app.js`
- `src/client/js/router.js`
- `src/client/js/state.js`
- `src/client/js/api.js`
- `src/client/css/main.css`
- `src/client/css/variables.css`

**Routes:**
- `/` - Home (system selection)
- `/system/:id` - Game list for system
- `/game/:id` - Game detail
- `/search` - Search results
- `/settings` - Configuration

### Phase 8: Web Components

**Components to create:**
- `rwl-app` - Main app shell
- `rwl-header` - Header with arcade name
- `rwl-sidebar` - System navigation
- `rwl-wheel-view` - 3D carousel (signature view)
- `rwl-grid-view` - Responsive grid with virtual scrolling
- `rwl-list-view` - Detailed list view
- `rwl-game-card` - Game thumbnail/info card
- `rwl-game-detail` - Full game information panel
- `rwl-video-player` - Safari-compatible video (native HLS, autoplay on focus, muted)
- `rwl-pdf-viewer` - Manual viewer (PDF.js)
- `rwl-search` - Search bar with on-screen keyboard
- `rwl-screensaver` - Attract mode
- `rwl-settings` - Settings panel
- `rwl-qr-code` - QR code display

### Phase 9: Input Handling

**Files to create:**
- `src/client/js/input/manager.js`
- `src/client/js/input/gamepad.js`
- `src/client/js/input/keyboard.js`
- `src/client/js/input/touch.js`

**Gamepad mapping (Xbox layout):**
- A: Select/Play
- B: Back
- X: Favorite toggle
- Y: Search
- D-pad/Sticks: Navigate
- LB/RB: Previous/Next system
- Start: Menu

**Keyboard:**
- Arrows: Navigate
- Enter: Select
- Escape: Back
- Letters: Quick jump

### Phase 10: Safari Optimization

**Key considerations:**
- Native HLS video playback (no HLS.js needed on Safari)
- `-webkit-` CSS prefixes for transforms, backdrop-filter
- PWA support with proper manifest
- Test on actual Safari, not Chrome DevTools

**Safari-specific CSS (`safari.css`):**
```css
@supports (-webkit-touch-callout: none) {
  /* Safari-only styles */
}
```

### Phase 11: Theme System

**Files to create:**
- `themes/classic-arcade/theme.yaml` (DEFAULT)
- `themes/classic-arcade/styles.css`
- `themes/dark-modern/theme.yaml`
- `themes/dark-modern/styles.css`

**Two bundled themes:**

1. **Classic Arcade** (DEFAULT):
   - Black background with bright neon colors
   - Pixel-style fonts (Press Start 2P)
   - Retro aesthetic, arcade cabinet feel
   - Scanline effects optional

2. **Dark & Modern**:
   - Dark backgrounds with subtle gradients
   - Clean sans-serif fonts (Inter, Roboto)
   - Neon accent colors
   - Smooth animations

Arcade name appears in:
- Header (always visible)
- Attract mode overlay
- Settings page

### Phase 12: Attract Mode

**Features:**
- Activates after idle timeout (default 5 minutes)
- Cycles random games with video/screenshots
- Shows arcade name overlay
- Any input exits

### Phase 13: Optional AI Features

**Files to create:**
- `src/server/ai/index.js` - Feature toggle
- `src/server/ai/search.js` - NLP query parsing
- `src/server/ai/providers/ollama.js`
- `src/server/ai/providers/openai.js`

**Disabled by default.** When enabled:
- Natural language search ("2 player shooters from the 90s")
- Smart collections (Hidden Gems, Couch Co-op, etc.)

### Phase 14: Windows Installer

**Files to create:**
- `setup.bat` - Quick setup script
- `install.bat` - Installs Node.js dependencies
- `installer/inno-setup.iss` - Full installer

**Setup script tasks:**
1. Check for Node.js, prompt to install if missing
2. Run `npm install`
3. Prompt for Retrobat path
4. Create initial config
5. Add to Windows Startup (shell:startup) with system tray icon

**Startup App approach** (not service):
- Runs in user's desktop session
- Can launch GUI applications (emulators) directly
- System tray icon with: Open Browser, Restart, View Logs, Exit
- Starts automatically on Windows login

---

## Critical Files Reference

| File | Location |
|------|----------|
| es_systems.cfg | `E:\Emulators-and-Launchers\RetroBat\emulationstation\.emulationstation\es_systems.cfg` |
| gamelist.xml | `{romPath}\gamelist.xml` (per system) |
| collections | `E:\...\emulationstation\.emulationstation\collections\` |
| emulatorLauncher.exe | `E:\...\RetroBat\emulatorLauncher.exe` |

---

## Key Technical Decisions

1. **No TypeScript** - Vanilla JS for simpler setup on Windows
2. **better-sqlite3** - Synchronous SQLite for Windows (no native build issues with node-sqlite3)
3. **Native Windows paths** - Use `path.win32` APIs, handle backslashes
4. **Symlink handling** - Use `fs.realpathSync()` to resolve Windows junctions
5. **Safari-first video** - Native HLS, H.264 codec, no transcoding needed
6. **Web Components** - No framework, maximum performance
7. **Virtual scrolling** - Handle 50k+ games without DOM explosion

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "fast-xml-parser": "^4.3.2",
    "better-sqlite3": "^9.2.2",
    "chokidar": "^3.5.3",
    "qrcode": "^1.5.3",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

---

## Success Criteria

- [ ] Parses all 150+ Retrobat systems
- [ ] Handles 50k+ games with <30s initial scan
- [ ] 60fps animations on wheel view
- [ ] <100ms navigation response
- [ ] Works perfectly on Safari (iOS, macOS, iPadOS)
- [ ] Hidden games filtered by default (override in settings)
- [ ] Gamepad, keyboard, touch all functional
- [ ] Arcade name displayed throughout UI
- [ ] Game launching works via emulatorLauncher.exe
- [ ] AI features work when enabled, graceful degradation when disabled
