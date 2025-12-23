/**
 * RetroWebLauncher - Keyboard Handler
 * Keyboard input mapping with key repeat support
 *
 * Key bindings:
 * Arrow keys: Navigate
 * Enter/Space: Select
 * Escape/Backspace: Back
 * F: Favorite
 * Y: Search (matches gamepad)
 * M: Menu
 * Page Up/Down: Page navigation
 * Home/End: Jump to start/end
 * Letters: Quick jump / search input
 */

export class KeyboardHandler {
  constructor(manager) {
    this._manager = manager;

    // Key repeat handling
    this._repeatTimers = {};
    this._repeatDelay = 400;
    this._repeatRate = 80;

    // Track pressed keys
    this._pressedKeys = new Set();

    // Bind handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    // Attach listeners
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this._clearAllRepeats();
  }

  _onKeyDown(event) {
    // Skip if focused on input field
    if (this._isInputFocused(event.target)) {
      return;
    }

    const key = event.key;

    // Prevent repeat events from keyboard auto-repeat
    if (this._pressedKeys.has(key)) {
      return;
    }

    this._pressedKeys.add(key);

    // Handle the key
    const handled = this._handleKey(key, event);

    if (handled) {
      event.preventDefault();
    }
  }

  _onKeyUp(event) {
    const key = event.key;

    this._pressedKeys.delete(key);
    this._stopRepeat(key);
  }

  _isInputFocused(target) {
    const tagName = target.tagName.toLowerCase();

    // Direct check
    if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
      return true;
    }

    // Recursively check Shadow DOM active elements (handles nested shadow DOMs)
    let active = document.activeElement;
    while (active) {
      const activeTag = active.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || active.isContentEditable) {
        return true;
      }
      // Traverse into shadow DOM if present
      if (active.shadowRoot && active.shadowRoot.activeElement) {
        active = active.shadowRoot.activeElement;
      } else {
        break;
      }
    }

    return false;
  }

  _handleKey(key, event) {
    // Check if we're in search mode - if so, only allow nav keys and pass chars through
    const inSearchMode = this._isInSearchMode();

    // Navigation keys - always work
    switch (key) {
      case 'ArrowUp':
        this._startDirectionRepeat('up', key);
        return true;

      case 'ArrowDown':
        this._startDirectionRepeat('down', key);
        return true;

      case 'ArrowLeft':
        this._startDirectionRepeat('left', key);
        return true;

      case 'ArrowRight':
        this._startDirectionRepeat('right', key);
        return true;

      case 'Enter':
      case ' ':
        this._manager.select('keyboard');
        return true;

      case 'Escape':
        this._manager.back('keyboard');
        return true;

      case 'Backspace':
        // In search mode, backspace deletes characters
        if (inSearchMode) {
          this._manager.emit('input:back', null, 'keyboard');
        } else {
          this._manager.back('keyboard');
        }
        return true;

      case 'PageUp':
        this._manager.pageLeft('keyboard');
        return true;

      case 'PageDown':
        this._manager.pageRight('keyboard');
        return true;

      case 'Home':
        this._manager.emit('home', null, 'keyboard');
        return true;

      case 'End':
        this._manager.emit('end', null, 'keyboard');
        return true;

      case 'F11':
        this._toggleFullscreen();
        return true;
    }

    // In search mode, all printable characters go to search input
    if (inSearchMode) {
      if (key.length === 1) {
        this._manager.character(key.toLowerCase(), 'keyboard');
        return true;
      }
      return false;
    }

    // Shortcut keys - only when NOT in search mode
    switch (key) {
      case 'f':
      case 'F':
        this._manager.favorite('keyboard');
        return true;

      case 'y':
      case 'Y':
        this._manager.search('keyboard');
        return true;

      case 'm':
      case 'M':
        this._manager.menu('keyboard');
        return true;

      default:
        // Alphanumeric keys for quick jump (not in search)
        if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
          this._manager.character(key.toLowerCase(), 'keyboard');
          return true;
        }
    }

    return false;
  }

  _isInSearchMode() {
    // Check current route
    const path = window.location.hash || '';
    if (path.includes('/search')) return true;

    // Check if search component is visible
    const searchEl = document.querySelector('rwl-search');
    if (searchEl && searchEl.offsetParent !== null) return true;

    return false;
  }

  _startDirectionRepeat(direction, key) {
    // Immediate navigation
    this._manager.navigate(direction, 'keyboard');

    // Start repeat
    this._stopRepeat(key);
    this._repeatTimers[key] = setTimeout(() => {
      this._repeatTimers[key] = setInterval(() => {
        if (this._pressedKeys.has(key)) {
          this._manager.navigate(direction, 'keyboard');
        } else {
          this._stopRepeat(key);
        }
      }, this._repeatRate);
    }, this._repeatDelay);
  }

  _stopRepeat(key) {
    if (this._repeatTimers[key]) {
      clearTimeout(this._repeatTimers[key]);
      clearInterval(this._repeatTimers[key]);
      delete this._repeatTimers[key];
    }
  }

  _clearAllRepeats() {
    for (const key of Object.keys(this._repeatTimers)) {
      this._stopRepeat(key);
    }
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }
}
