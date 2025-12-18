/**
 * RetroWebLauncher - State Management
 * Simple reactive state management with localStorage persistence
 */

const STORAGE_KEY = 'rwl-state';

class StateManager {
  constructor() {
    this._state = {};
    this._listeners = new Map();
    this._persistKeys = ['lastSystem', 'lastGame', 'viewPreferences', 'favoriteGames'];

    // Load persisted state
    this._loadPersistedState();
  }

  _loadPersistedState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const key of this._persistKeys) {
          if (parsed[key] !== undefined) {
            this._state[key] = parsed[key];
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  _persistState() {
    try {
      const toPersist = {};
      for (const key of this._persistKeys) {
        if (this._state[key] !== undefined) {
          toPersist[key] = this._state[key];
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  /**
   * Get a value from state
   * @param {string} key - State key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} State value
   */
  get(key, defaultValue = null) {
    return this._state[key] !== undefined ? this._state[key] : defaultValue;
  }

  /**
   * Set a value in state
   * @param {string} key - State key
   * @param {*} value - Value to set
   */
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;

    // Persist if needed
    if (this._persistKeys.includes(key)) {
      this._persistState();
    }

    // Notify listeners
    this._notifyListeners(key, value, oldValue);
  }

  /**
   * Update multiple state values at once
   * @param {Object} updates - Key-value pairs to update
   */
  update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.set(key, value);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch (or '*' for all)
   * @param {Function} callback - Callback function (value, oldValue, key)
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Emit a custom event (not tied to state)
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this._notifyListeners(`event:${event}`, data, null);
  }

  /**
   * Listen for custom events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this.subscribe(`event:${event}`, callback);
  }

  _notifyListeners(key, value, oldValue) {
    // Notify specific key listeners
    const keyListeners = this._listeners.get(key);
    if (keyListeners) {
      for (const callback of keyListeners) {
        try {
          callback(value, oldValue, key);
        } catch (error) {
          console.error('State listener error:', error);
        }
      }
    }

    // Notify wildcard listeners
    const wildcardListeners = this._listeners.get('*');
    if (wildcardListeners) {
      for (const callback of wildcardListeners) {
        try {
          callback(value, oldValue, key);
        } catch (error) {
          console.error('State listener error:', error);
        }
      }
    }
  }

  /**
   * Get the entire state object (for debugging)
   * @returns {Object} State object
   */
  getAll() {
    return { ...this._state };
  }

  /**
   * Clear all state
   */
  clear() {
    this._state = {};
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const state = new StateManager();

// Expose for debugging
window.rwlState = state;
