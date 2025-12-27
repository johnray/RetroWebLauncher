# Adding New Screensavers

This guide explains how to add new screensaver implementations to RetroWebLauncher.

## Architecture Overview

The screensaver system uses a modular architecture:

```
src/client/js/components/
├── rwl-screensaver.js              # Manager/registry - switches between screensavers
├── rwl-screensaver-base.js         # Base class with shared functionality
├── rwl-screensaver-floating-tvs.js # "Floating TVs" implementation
└── rwl-screensaver-{your-name}.js  # Your new screensaver
```

## Step 1: Create Your Screensaver Component

Create a new file `src/client/js/components/rwl-screensaver-{name}.js`:

```javascript
/**
 * RetroWebLauncher - {Your Screensaver Name}
 * {Brief description}
 */

import { RwlScreensaverBase } from './rwl-screensaver-base.js';

const { html, css } = window.Lit;

class RwlScreensaverYourName extends RwlScreensaverBase {
  static properties = {
    ...RwlScreensaverBase.properties,
    // Add your custom properties here
  };

  static styles = css`
    ${RwlScreensaverBase.baseStyles}

    /* Your custom styles here */
    .your-container {
      width: 100%;
      height: 100%;
    }
  `;

  constructor() {
    super();
    // Initialize your custom state
  }

  // ─────────────────────────────────────────────────────────────
  // Required: Override abstract methods from base class
  // ─────────────────────────────────────────────────────────────

  /**
   * Called when screensaver activates.
   * Start your animations, spawn elements, etc.
   */
  _onActivate() {
    console.log('[YourScreensaver] Activated');
    // this._games contains loaded games with videos/images
    // Start your animation logic here
  }

  /**
   * Called when screensaver deactivates (user activity detected).
   * Stop animations, clean up resources.
   */
  _onDeactivate() {
    console.log('[YourScreensaver] Deactivated');
    // Stop animations, clear intervals, etc.
  }

  /**
   * Called on component disconnect.
   * Final cleanup of any remaining resources.
   */
  _onCleanup() {
    // Clean up event listeners, observers, etc.
  }

  /**
   * Clear any screensaver-specific timers.
   * Called by base class during deactivation.
   */
  _clearScreensaverTimers() {
    // clearInterval(this._myTimer);
    // clearTimeout(this._myTimeout);
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="screensaver-container">
        <!-- Your screensaver content -->

        <!-- Optional: Include arcade title -->
        <div class="arcade-title">${this.arcadeName}</div>

        <!-- Optional: Retro effects -->
        <div class="scanlines"></div>
        <div class="vignette"></div>

        <!-- Exit hint -->
        <div class="exit-hint">Move mouse or press any key to exit</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver-your-name', RwlScreensaverYourName);
```

## Step 2: Register in the Manager

Edit `src/client/js/components/rwl-screensaver.js`:

### Add the import:

```javascript
import './rwl-screensaver-floating-tvs.js';
import './rwl-screensaver-your-name.js';  // Add this line
```

### Add to the registry:

```javascript
const SCREENSAVERS = {
  'floating-tvs': {
    tag: 'rwl-screensaver-floating-tvs',
    name: 'Floating TVs',
    description: 'Bouncing retro CRT TVs playing game videos'
  },
  // Add your screensaver:
  'your-name': {
    tag: 'rwl-screensaver-your-name',
    name: 'Your Display Name',
    description: 'Brief description shown in settings'
  }
};
```

### Add render case:

```javascript
_renderScreensaver(tag) {
  switch (tag) {
    case 'rwl-screensaver-floating-tvs':
      return html`<rwl-screensaver-floating-tvs></rwl-screensaver-floating-tvs>`;
    case 'rwl-screensaver-your-name':
      return html`<rwl-screensaver-your-name></rwl-screensaver-your-name>`;
    default:
      return html`<rwl-screensaver-floating-tvs></rwl-screensaver-floating-tvs>`;
  }
}
```

## Available from Base Class

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `_active` | Boolean | Whether screensaver is currently active |
| `_games` | Array | Loaded games (with video/image URLs) |
| `arcadeName` | String | User's arcade name from config |
| `_viewportWidth` | Number | Current viewport width |
| `_viewportHeight` | Number | Current viewport height |

### Methods

| Method | Description |
|--------|-------------|
| `_getRandomGame(currentlyDisplayed)` | Get a random game avoiding repeats. Pass a Set of currently displayed game IDs. |
| `_shuffle(array)` | Fisher-Yates shuffle, returns new array |
| `_loadGames()` | Loads games from all systems (called automatically on activate) |

### CSS Classes (from baseStyles)

| Class | Description |
|-------|-------------|
| `.screensaver-container` | Full-screen container |
| `.scanlines` | CRT scanline overlay effect |
| `.vignette` | Dark vignette edge effect |
| `.arcade-title` | Centered glowing title |
| `.arcade-subtitle` | Subtitle below title |
| `.exit-hint` | "Press any key" hint at bottom |

### CSS Variables

Use these for theme consistency:

```css
--screensaver-background
--screensaver-title-color
--screensaver-title-glow
--screensaver-hint-color
--color-primary
--color-background
```

## Game Object Structure

Each game in `this._games` has:

```javascript
{
  id: 'game-id',
  name: 'Game Name',
  systemName: 'System Name',
  video: '/path/to/video.mp4',      // May be null
  thumbnail: '/path/to/thumb.png',  // May be null
  image: '/path/to/image.png',      // May be null
  // ... other metadata
}
```

To get media URLs for API:
```javascript
const videoUrl = `/api/media/game/${game.id}/video`;
const thumbnailUrl = `/api/media/game/${game.id}/thumbnail`;
const imageUrl = `/api/media/game/${game.id}/image`;
```

## Example: Simple Slideshow Screensaver

```javascript
import { RwlScreensaverBase } from './rwl-screensaver-base.js';

const { html, css } = window.Lit;

class RwlScreensaverSlideshow extends RwlScreensaverBase {
  static properties = {
    ...RwlScreensaverBase.properties,
    _currentGame: { state: true }
  };

  static styles = css`
    ${RwlScreensaverBase.baseStyles}

    .slideshow-image {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 80%;
      max-height: 80%;
      object-fit: contain;
      animation: fadeIn 1s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .game-info {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      color: white;
    }
  `;

  constructor() {
    super();
    this._currentGame = null;
    this._slideInterval = null;
  }

  _onActivate() {
    this._showNextSlide();
    this._slideInterval = setInterval(() => this._showNextSlide(), 5000);
  }

  _onDeactivate() {
    this._clearScreensaverTimers();
    this._currentGame = null;
  }

  _clearScreensaverTimers() {
    if (this._slideInterval) {
      clearInterval(this._slideInterval);
      this._slideInterval = null;
    }
  }

  _showNextSlide() {
    const game = this._getRandomGame();
    if (game) {
      this._currentGame = game;
    }
  }

  render() {
    const imageUrl = this._currentGame
      ? `/api/media/game/${this._currentGame.id}/image`
      : '';

    return html`
      <div class="screensaver-container">
        ${this._currentGame ? html`
          <img class="slideshow-image" src="${imageUrl}" alt="${this._currentGame.name}">
          <div class="game-info">
            <h2>${this._currentGame.name}</h2>
            <p>${this._currentGame.systemName}</p>
          </div>
        ` : ''}

        <div class="arcade-title">${this.arcadeName}</div>
        <div class="scanlines"></div>
        <div class="vignette"></div>
        <div class="exit-hint">Move mouse or press any key to exit</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver-slideshow', RwlScreensaverSlideshow);
```

## Testing

1. Start the server: `./rwl.ps1`
2. Open Settings > Attract Mode
3. Select your new screensaver from the dropdown
4. Wait for idle timeout (or set to 10 seconds for testing)
5. Verify activation/deactivation works correctly
