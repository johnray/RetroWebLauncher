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
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      target.isContentEditable
    );
  }

  _handleKey(key, event) {
    // Navigation keys
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
      case 'Backspace':
        this._manager.back('keyboard');
        return true;

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

      default:
        // Alphanumeric keys for quick search/jump
        if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
          this._manager.character(key.toLowerCase(), 'keyboard');
          return true;
        }
    }

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
}
