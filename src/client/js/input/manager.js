/**
 * RetroWebLauncher - Input Manager
 * Unified input handling for gamepad, keyboard, and touch
 */

import { state } from '../state.js';
import { GamepadHandler } from './gamepad.js';
import { KeyboardHandler } from './keyboard.js';
import { TouchHandler } from './touch.js';

class InputManager {
  constructor() {
    this._gamepad = null;
    this._keyboard = null;
    this._touch = null;
    this._enabled = true;
    this._lastInputType = 'keyboard';
  }

  init() {
    // Initialize handlers
    this._gamepad = new GamepadHandler(this);
    this._keyboard = new KeyboardHandler(this);
    this._touch = new TouchHandler(this);

    // Start gamepad polling
    this._gamepad.start();

    console.log('Input manager initialized');
  }

  destroy() {
    this._gamepad?.stop();
    this._keyboard?.destroy();
    this._touch?.destroy();
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  get enabled() {
    return this._enabled;
  }

  get lastInputType() {
    return this._lastInputType;
  }

  /**
   * Emit an input event
   * @param {string} action - The action name (navigate, select, back, etc.)
   * @param {*} data - Optional data for the action
   * @param {string} source - Input source (gamepad, keyboard, touch)
   */
  emit(action, data = null, source = 'unknown') {
    if (!this._enabled) return;

    this._lastInputType = source;

    // Emit specific action event
    state.emit(`input:${action}`, data);

    // Emit generic input event (for idle detection)
    state.emit('input:any', { action, data, source });
  }

  /**
   * Navigate in a direction
   * @param {'up'|'down'|'left'|'right'} direction
   * @param {string} source
   */
  navigate(direction, source) {
    this.emit('navigate', direction, source);
  }

  /**
   * Select/confirm action (A button, Enter key)
   * @param {string} source
   */
  select(source) {
    this.emit('select', null, source);
  }

  /**
   * Back/cancel action (B button, Escape key)
   * @param {string} source
   */
  back(source) {
    this.emit('back', null, source);
  }

  /**
   * Menu action (Start button)
   * @param {string} source
   */
  menu(source) {
    this.emit('menu', null, source);
  }

  /**
   * Search action (Y button)
   * @param {string} source
   */
  search(source) {
    this.emit('search', null, source);
  }

  /**
   * Favorite toggle (X button)
   * @param {string} source
   */
  favorite(source) {
    this.emit('favorite', null, source);
  }

  /**
   * Page left (LB/L1)
   * @param {string} source
   */
  pageLeft(source) {
    this.emit('pageLeft', null, source);
  }

  /**
   * Page right (RB/R1)
   * @param {string} source
   */
  pageRight(source) {
    this.emit('pageRight', null, source);
  }

  /**
   * Character input (for search)
   * @param {string} char
   * @param {string} source
   */
  character(char, source) {
    this.emit('character', char, source);
  }
}

// Create singleton instance
export const inputManager = new InputManager();
