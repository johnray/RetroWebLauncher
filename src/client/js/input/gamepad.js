/**
 * RetroWebLauncher - Gamepad Handler
 * Uses the standard Gamepad API with Xbox layout mapping
 *
 * Button mapping (Standard Gamepad):
 * 0: A (Select)
 * 1: B (Back)
 * 2: X (Favorite)
 * 3: Y (Search)
 * 4: LB (Page Left)
 * 5: RB (Page Right)
 * 6: LT
 * 7: RT
 * 8: Back/Select
 * 9: Start (Menu)
 * 10: L3
 * 11: R3
 * 12: D-pad Up
 * 13: D-pad Down
 * 14: D-pad Left
 * 15: D-pad Right
 *
 * Axes:
 * 0: Left Stick X (-1 = left, 1 = right)
 * 1: Left Stick Y (-1 = up, 1 = down)
 * 2: Right Stick X
 * 3: Right Stick Y
 */

export class GamepadHandler {
  constructor(manager) {
    this._manager = manager;
    this._animationFrame = null;
    this._connected = false;
    this._gamepadIndex = null;

    // Button state tracking (for press detection)
    this._buttonStates = new Array(16).fill(false);

    // Axis state tracking
    this._axisStates = { x: 0, y: 0 };

    // Repeat timers for held directions
    this._repeatTimers = {};
    this._repeatDelay = 400; // Initial delay before repeat
    this._repeatRate = 100;  // Repeat interval

    // Deadzone for analog sticks
    this._deadzone = 0.3;

    // Bind event handlers
    this._onConnect = this._onConnect.bind(this);
    this._onDisconnect = this._onDisconnect.bind(this);
    this._poll = this._poll.bind(this);
  }

  start() {
    window.addEventListener('gamepadconnected', this._onConnect);
    window.addEventListener('gamepaddisconnected', this._onDisconnect);

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this._onConnect({ gamepad: gamepads[i] });
        break;
      }
    }

    // Start polling
    this._startPolling();
  }

  stop() {
    window.removeEventListener('gamepadconnected', this._onConnect);
    window.removeEventListener('gamepaddisconnected', this._onDisconnect);
    this._stopPolling();
    this._clearRepeatTimers();
  }

  _onConnect(event) {
    console.log(`Gamepad connected: ${event.gamepad.id}`);
    this._connected = true;
    this._gamepadIndex = event.gamepad.index;

    // Emit connection event
    this._manager.emit('gamepadConnected', {
      id: event.gamepad.id,
      index: event.gamepad.index
    }, 'gamepad');
  }

  _onDisconnect(event) {
    console.log(`Gamepad disconnected: ${event.gamepad.id}`);

    if (event.gamepad.index === this._gamepadIndex) {
      this._connected = false;
      this._gamepadIndex = null;
      this._clearRepeatTimers();

      this._manager.emit('gamepadDisconnected', null, 'gamepad');
    }
  }

  _startPolling() {
    const poll = () => {
      this._poll();
      this._animationFrame = requestAnimationFrame(poll);
    };
    this._animationFrame = requestAnimationFrame(poll);
  }

  _stopPolling() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  _poll() {
    if (!this._connected || this._gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this._gamepadIndex];

    if (!gamepad) return;

    // Handle buttons
    this._handleButtons(gamepad.buttons);

    // Handle analog sticks
    this._handleAxes(gamepad.axes);
  }

  _handleButtons(buttons) {
    // Button mappings
    const buttonMap = {
      0: 'select',    // A
      1: 'back',      // B
      2: 'favorite',  // X
      3: 'search',    // Y
      4: 'pageLeft',  // LB
      5: 'pageRight', // RB
      9: 'menu',      // Start
      12: 'up',       // D-pad Up
      13: 'down',     // D-pad Down
      14: 'left',     // D-pad Left
      15: 'right',    // D-pad Right
    };

    for (let i = 0; i < buttons.length && i < 16; i++) {
      const pressed = buttons[i].pressed;
      const wasPressed = this._buttonStates[i];

      if (pressed && !wasPressed) {
        // Button just pressed
        this._onButtonPress(i, buttonMap[i]);
      } else if (!pressed && wasPressed) {
        // Button just released
        this._onButtonRelease(i, buttonMap[i]);
      }

      this._buttonStates[i] = pressed;
    }
  }

  _handleAxes(axes) {
    if (axes.length < 2) return;

    const x = this._applyDeadzone(axes[0]);
    const y = this._applyDeadzone(axes[1]);

    // Check for direction changes
    const prevX = this._axisStates.x;
    const prevY = this._axisStates.y;

    // Convert to cardinal direction
    const direction = this._getDirection(x, y);
    const prevDirection = this._getDirection(prevX, prevY);

    if (direction !== prevDirection) {
      // Clear old direction repeat
      if (prevDirection) {
        this._stopRepeat(`axis_${prevDirection}`);
      }

      // Start new direction
      if (direction) {
        this._onDirectionStart(direction, 'axis');
      }
    }

    this._axisStates.x = x;
    this._axisStates.y = y;
  }

  _applyDeadzone(value) {
    if (Math.abs(value) < this._deadzone) return 0;
    // Normalize value outside deadzone
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - this._deadzone) / (1 - this._deadzone);
  }

  _getDirection(x, y) {
    // Determine dominant direction
    if (Math.abs(x) > Math.abs(y)) {
      if (x < -0.5) return 'left';
      if (x > 0.5) return 'right';
    } else {
      if (y < -0.5) return 'up';
      if (y > 0.5) return 'down';
    }
    return null;
  }

  _onButtonPress(index, action) {
    if (!action) return;

    // Navigation directions
    if (['up', 'down', 'left', 'right'].includes(action)) {
      this._onDirectionStart(action, `button_${index}`);
    } else {
      // Action buttons
      this._manager[action]?.('gamepad');
    }
  }

  _onButtonRelease(index, action) {
    if (!action) return;

    // Stop direction repeat
    if (['up', 'down', 'left', 'right'].includes(action)) {
      this._stopRepeat(`button_${index}`);
    }
  }

  _onDirectionStart(direction, source) {
    // Immediate navigation
    this._manager.navigate(direction, 'gamepad');

    // Start repeat timer
    this._startRepeat(source, () => {
      this._manager.navigate(direction, 'gamepad');
    });
  }

  _startRepeat(key, callback) {
    this._stopRepeat(key);

    // Initial delay
    this._repeatTimers[key] = setTimeout(() => {
      // Then repeat at interval
      this._repeatTimers[key] = setInterval(callback, this._repeatRate);
    }, this._repeatDelay);
  }

  _stopRepeat(key) {
    if (this._repeatTimers[key]) {
      clearTimeout(this._repeatTimers[key]);
      clearInterval(this._repeatTimers[key]);
      delete this._repeatTimers[key];
    }
  }

  _clearRepeatTimers() {
    for (const key of Object.keys(this._repeatTimers)) {
      this._stopRepeat(key);
    }
  }
}
