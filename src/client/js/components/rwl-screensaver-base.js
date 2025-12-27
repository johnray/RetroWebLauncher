/**
 * RetroWebLauncher - Screensaver Base Class
 * Shared functionality for all screensaver implementations
 */

import { state } from '../state.js';
import { api } from '../api.js';

const { LitElement, css } = window.Lit;

export class RwlScreensaverBase extends LitElement {
  static properties = {
    _active: { type: Boolean, state: true },
    _games: { type: Array, state: true },
    arcadeName: { type: String, state: true }
  };

  static baseStyles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: var(--z-screensaver, 9999);
      background: var(--screensaver-background, var(--color-background, #0a0a0a));
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.8s ease, visibility 0.8s ease;
      pointer-events: none;
      overflow: hidden;
    }

    :host(.active) {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .screensaver-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    /* Scanlines overlay */
    .scanlines {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.08) 0px,
        rgba(0, 0, 0, 0.08) 1px,
        transparent 1px,
        transparent 3px
      );
      pointer-events: none;
      z-index: 999;
    }

    /* Vignette */
    .vignette {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
      pointer-events: none;
      z-index: 998;
    }

    /* Exit hint */
    .exit-hint {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      color: var(--screensaver-hint-color, rgba(255, 255, 255, 0.4));
      animation: hintBlink 2s ease infinite;
      z-index: 1000;
    }

    @keyframes hintBlink {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }

    /* Center arcade title */
    .arcade-title {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 4rem;
      color: var(--screensaver-title-color, #fff);
      text-shadow:
        0 0 10px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 20px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 40px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 80px var(--screensaver-title-glow, var(--color-primary, #ff0066));
      animation: titleFloat 6s ease-in-out infinite;
      z-index: 1000;
      text-align: center;
      pointer-events: none;
      letter-spacing: 4px;
    }

    @keyframes titleFloat {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        filter: brightness(1);
      }
      50% {
        transform: translate(-50%, -52%) scale(1.02);
        filter: brightness(1.2);
      }
    }

    .arcade-subtitle {
      position: absolute;
      top: calc(50% + 50px);
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.2rem;
      color: var(--screensaver-subtitle-color, rgba(255, 255, 255, 0.7));
      z-index: 1000;
      animation: subtitlePulse 3s ease-in-out infinite;
      letter-spacing: 2px;
    }

    @keyframes subtitlePulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .arcade-title {
        font-size: 2rem;
      }

      .arcade-subtitle {
        font-size: 0.9rem;
        top: calc(50% + 35px);
      }
    }
  `;

  constructor() {
    super();
    this._active = false;
    this._games = [];
    this._idleTimer = null;
    this._idleTimeout = 60000; // 1 minute default
    this._unsubscribers = [];
    this._boundHandleActivity = (e) => this._handleActivity(e);
    this._boundOnResize = () => this._onResize();
    this._boundOnVisibilityChange = () => this._onVisibilityChange();
    this._lastMousePos = null;
    this.arcadeName = 'RetroWebLauncher';

    // Cache viewport dimensions
    this._viewportWidth = window.innerWidth;
    this._viewportHeight = window.innerHeight;

    // Track recently shown games to avoid repeats
    this._recentlyShownGames = [];
    this._recentlyShownSet = new Set(); // Cached Set for performance
    this._maxRecentHistory = 30;
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();
    this._loadConfig();
    this._bindEvents();
    this._resetIdleTimer();
    window.addEventListener('resize', this._boundOnResize, { passive: true });
    document.addEventListener('visibilitychange', this._boundOnVisibilityChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();

    const exitEvents = ['click', 'keydown', 'touchstart', 'mousemove', 'wheel'];
    exitEvents.forEach(event => {
      document.removeEventListener(event, this._boundHandleActivity);
    });
    window.removeEventListener('resize', this._boundOnResize);
    document.removeEventListener('visibilitychange', this._boundOnVisibilityChange);

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];

    this._onCleanup();
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract methods - override in subclasses
  // ─────────────────────────────────────────────────────────────

  /**
   * Called when screensaver activates. Set up your animation here.
   */
  _onActivate() {
    // Override in subclass
  }

  /**
   * Called when screensaver deactivates. Clean up animations here.
   */
  _onDeactivate() {
    // Override in subclass
  }

  /**
   * Called on disconnect. Clean up any remaining resources.
   */
  _onCleanup() {
    // Override in subclass
  }

  /**
   * Clear any timers specific to this screensaver.
   */
  _clearScreensaverTimers() {
    // Override in subclass
  }

  // ─────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────

  _loadConfig() {
    const config = state.get('config') || {};

    const storedTimeout = localStorage.getItem('rwl-screensaver-timeout');
    const parsedTimeout = parseInt(storedTimeout, 10);
    // Validate timeout: must be a number between 10-3600 seconds
    if (!isNaN(parsedTimeout) && parsedTimeout >= 10 && parsedTimeout <= 3600) {
      this._idleTimeout = parsedTimeout * 1000;
    } else {
      this._idleTimeout = 60000; // Default 1 minute
    }

    this.arcadeName = config.arcadeName || 'RetroWebLauncher';
  }

  _onResize() {
    this._viewportWidth = window.innerWidth;
    this._viewportHeight = window.innerHeight;
  }

  /**
   * Handle page visibility changes (tab hidden/shown)
   * Pauses screensaver when tab is hidden to save resources
   */
  _onVisibilityChange() {
    if (!this._active) return;

    if (document.hidden) {
      this._onPause();
    } else {
      this._onResume();
    }
  }

  /**
   * Called when tab becomes hidden. Override to pause animations/videos.
   */
  _onPause() {
    // Override in subclass
  }

  /**
   * Called when tab becomes visible. Override to resume animations/videos.
   */
  _onResume() {
    // Override in subclass
  }

  // ─────────────────────────────────────────────────────────────
  // Event handling
  // ─────────────────────────────────────────────────────────────

  _bindEvents() {
    const exitEvents = ['click', 'keydown', 'touchstart', 'mousemove', 'wheel'];
    exitEvents.forEach(event => {
      document.addEventListener(event, this._boundHandleActivity, { passive: true });
    });

    this._unsubscribers.push(
      state.on('input:any', () => this._handleActivity())
    );

    this._unsubscribers.push(
      state.on('configSaved', () => this._loadConfig())
    );

    this._unsubscribers.push(
      state.subscribe('config', (config) => {
        if (config) {
          this._loadConfig();
          this._resetIdleTimer();
        }
      })
    );
  }

  _handleActivity(e) {
    // Ignore small mouse movements
    if (e?.type === 'mousemove') {
      // Validate that clientX/clientY exist (they should for mousemove, but be safe)
      if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') {
        return;
      }
      if (this._lastMousePos) {
        const dx = Math.abs(e.clientX - this._lastMousePos.x);
        const dy = Math.abs(e.clientY - this._lastMousePos.y);
        if (dx < 10 && dy < 10) return;
      }
      this._lastMousePos = { x: e.clientX, y: e.clientY };
    }

    if (this._active) {
      this._deactivate();
    }
    this._resetIdleTimer();
  }

  // ─────────────────────────────────────────────────────────────
  // Timer management
  // ─────────────────────────────────────────────────────────────

  _resetIdleTimer() {
    clearTimeout(this._idleTimer);
    this._idleTimer = null;

    const config = state.get('config') || {};
    if (config.attractMode?.enabled === false) return;

    this._idleTimer = setTimeout(() => {
      this._activate();
    }, this._idleTimeout);
  }

  _clearTimers() {
    clearTimeout(this._idleTimer);
    this._idleTimer = null;
    this._clearScreensaverTimers();
  }

  // ─────────────────────────────────────────────────────────────
  // Activation / Deactivation
  // ─────────────────────────────────────────────────────────────

  async _activate() {
    if (this._active) return;
    if (!this.isConnected) return;

    this._active = true;
    this.classList.add('active');
    this._lastMousePos = null;

    this._viewportWidth = window.innerWidth;
    this._viewportHeight = window.innerHeight;

    // Load games
    try {
      await this._loadGames();
    } catch (error) {
      console.error('[Screensaver] Failed to load games:', error);
    }

    if (!this._active || !this.isConnected) {
      return;
    }

    this._onActivate();
    state.emit('screensaverActive', true);
  }

  _deactivate() {
    if (!this._active) return;

    this._active = false;
    this.classList.remove('active');

    this._clearTimers();
    this._onDeactivate();

    state.emit('screensaverActive', false);
  }

  // ─────────────────────────────────────────────────────────────
  // Game loading
  // ─────────────────────────────────────────────────────────────

  /**
   * Fisher-Yates shuffle
   */
  _shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async _loadGames() {
    try {
      const systemsResponse = await api.getSystems();
      const systems = systemsResponse.systems || [];

      if (systems.length === 0) {
        console.warn('[Screensaver] No systems found');
        this._games = [];
        return;
      }

      let allGames = [];

      // Fetch games from ALL systems with controlled concurrency
      const gamesPerSystem = Math.max(10, Math.ceil(500 / systems.length));
      const maxConcurrent = 5; // Limit concurrent API requests

      // Process systems in batches to avoid overwhelming the server
      for (let i = 0; i < systems.length; i += maxConcurrent) {
        const batch = systems.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (system) => {
          try {
            const response = await api.getGames(system.id, { limit: gamesPerSystem });
            if (response.games) {
              return response.games.map(g => ({
                ...g,
                systemName: system.name
              }));
            }
          } catch (e) {
            // Continue with other systems
          }
          return [];
        });

        const results = await Promise.all(batchPromises);
        allGames = allGames.concat(results.flat());

        // Early exit if screensaver was deactivated during loading
        if (!this._active || !this.isConnected) {
          return;
        }
      }

      // Filter to games with videos
      const videoGames = allGames.filter(g => g.video);
      const shuffledVideoGames = this._shuffle(videoGames);

      // Take games for screensaver pool
      this._games = shuffledVideoGames.slice(0, 200);

      // If not enough video games, include games with images
      if (this._games.length < 50) {
        const imageGames = allGames
          .filter(g => !g.video && (g.thumbnail || g.image));
        const shuffledImageGames = this._shuffle(imageGames).slice(0, 100);
        this._games = [...this._games, ...shuffledImageGames];
      }

      this._recentlyShownGames = [];
      this._recentlyShownSet.clear();

      console.log(`[Screensaver] Loaded ${this._games.length} games from ${systems.length} systems (${this._games.filter(g => g.video).length} with videos)`);
    } catch (error) {
      console.error('Failed to load games for screensaver:', error);
      this._games = [];
    }
  }

  /**
   * Get a random game that hasn't been shown recently
   * @param {Set} currentlyDisplayed - Set of game IDs currently on screen
   * @returns {Object|null} - Game object or null if no games available
   */
  _getRandomGame(currentlyDisplayed = new Set()) {
    // Early return if no games loaded
    if (!this._games || this._games.length === 0) {
      return null;
    }

    // Pick a game not currently displayed and not recently shown
    let availableGames = this._games.filter(g =>
      !currentlyDisplayed.has(g.id) && !this._recentlyShownSet.has(g.id)
    );

    // If no games available, reset history and try again
    if (availableGames.length === 0) {
      this._recentlyShownGames = [];
      this._recentlyShownSet.clear();
      availableGames = this._games.filter(g => !currentlyDisplayed.has(g.id));
    }

    // If still no games (all are currently displayed), pick from all games
    if (availableGames.length === 0) {
      availableGames = this._games;
    }

    const game = availableGames[Math.floor(Math.random() * availableGames.length)];

    // Track in history (maintain both array for order and set for fast lookup)
    if (game) {
      this._recentlyShownGames.push(game.id);
      this._recentlyShownSet.add(game.id);
      if (this._recentlyShownGames.length > this._maxRecentHistory) {
        const removed = this._recentlyShownGames.shift();
        this._recentlyShownSet.delete(removed);
      }
    }

    return game || null;
  }
}
