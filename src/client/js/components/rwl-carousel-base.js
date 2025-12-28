/**
 * RetroWebLauncher - Carousel Base Class
 * Shared functionality for wheel-view, spinner-view, and spin-wheel components
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, css } = window.Lit;

/**
 * Abstract base class for carousel-style game views.
 * Provides common functionality for navigation, game loading, alphabet index, etc.
 *
 * Subclasses must implement:
 * - static styles (component-specific CSS)
 * - render() method
 * - _getStoragePrefix() - returns prefix for localStorage/sessionStorage keys
 * - _getDefaultSize() - returns default size from theme settings
 * - _updateDisplay() - updates the visual display after navigation
 */
export class RwlCarouselBase extends LitElement {
  static properties = {
    systemId: { type: String },
    _games: { type: Array, state: true },
    _currentIndex: { type: Number, state: true },
    _loading: { type: Boolean, state: true },
    _letterIndex: { type: Object, state: true },
    _currentLetter: { type: String, state: true },
    _size: { type: Number, state: true },
    _sizeMultiplier: { type: Number, state: true },
    _baseSize: { type: Number, state: true },
    _maxMultiplier: { type: Number, state: true }
  };

  /**
   * Shared CSS for common elements (background, CRT, alphabet bar, controls, states)
   * Subclasses should include this in their styles using: ${RwlCarouselBase.sharedStyles}
   */
  static sharedStyles = css`
    :host {
      display: block;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
    }

    /* Background layer */
    .bg-layer {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0;
      pointer-events: none;
    }

    .bg-image {
      position: absolute;
      top: -5%; left: -5%;
      width: 110%; height: 110%;
      background-color: var(--color-background, #0a0a0a);
      background-size: cover;
      background-position: center;
      filter: blur(var(--bg-blur, 15px)) brightness(var(--bg-brightness, 0.5));
      transition: background-image 0.5s ease;
    }

    .bg-gradient {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center bottom, transparent 0%, rgba(10,10,10,0.9) 70%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%));
    }

    /* CRT TV Frame */
    .crt-container {
      flex-shrink: 0;
    }

    .crt-frame {
      background: var(--crt-frame-background, linear-gradient(145deg, #2a2a2a, #1a1a1a));
      border: 1px solid var(--crt-frame-border, transparent);
      border-radius: 20px;
      padding: 12px;
      box-shadow:
        0 10px 40px rgba(0,0,0,0.5),
        inset 0 2px 0 rgba(255,255,255,0.1);
    }

    .crt-screen {
      position: relative;
      background: var(--crt-screen-background, #000);
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 4/3;
    }

    .crt-screen::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0,0,0,0.15) 0px,
        rgba(0,0,0,0.15) 1px,
        transparent 1px,
        transparent 2px
      );
      pointer-events: none;
      z-index: 10;
    }

    .crt-screen::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 11;
    }

    .crt-screen rwl-video-player {
      display: block;
      width: 100%;
      height: 100%;
    }

    .crt-details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding: 0 8px;
    }

    .crt-led {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--crt-led-on, #0f0);
      box-shadow: 0 0 8px var(--crt-led-on, #0f0);
      animation: led-blink 2s ease-in-out infinite;
    }

    @keyframes led-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .crt-brand {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.65rem;
      color: var(--color-text-muted, #888);
      letter-spacing: 0.1em;
    }

    /* Game details content */
    .details-content {
      flex: 1;
      overflow-y: auto;
      padding-right: 10px;
    }

    .details-content::-webkit-scrollbar { width: 4px; }
    .details-content::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
      border-radius: 2px;
    }

    .game-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.1rem;
      color: var(--color-text, #fff);
      margin: 0 0 12px 0;
      text-shadow: 0 0 20px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
      line-height: 1.5;
    }

    .game-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .meta-item {
      font-size: 0.85rem;
      color: var(--color-text-muted, rgba(255,255,255,0.7));
      padding: 4px 10px;
      background: var(--content-overlay-dark, rgba(255,255,255,0.1));
      border-radius: 4px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      margin-bottom: 15px;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 0.65rem;
      color: var(--color-text-muted, rgba(255,255,255,0.5));
      text-transform: uppercase;
    }

    .detail-value {
      font-size: 0.85rem;
      color: var(--color-text, #fff);
    }

    .rating-stars {
      color: var(--rating-star-color, #ffcc00);
      font-size: 0.9rem;
    }

    .game-desc {
      font-size: 0.8rem;
      color: var(--color-text-muted, rgba(255,255,255,0.6));
      line-height: 1.5;
      margin: 0;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    /* Alphabet bar */
    .alphabet-bar {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 6px 4px;
      background: var(--alphabet-bar-background, rgba(0, 0, 0, 0.8));
      border: 1px solid var(--alphabet-bar-border, transparent);
      border-radius: 8px;
      backdrop-filter: blur(8px);
      z-index: 100;
      max-height: calc(100% - 150px);
      overflow-y: auto;
      scrollbar-width: none;
    }

    .alphabet-bar::-webkit-scrollbar { display: none; }

    .alpha-letter {
      width: 20px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
      background: transparent;
      border: none;
      color: var(--alphabet-letter-muted, var(--color-text-muted, rgba(255, 255, 255, 0.25)));
      cursor: default;
      border-radius: 3px;
      transition: all 0.15s ease;
      padding: 0;
    }

    .alpha-letter.has-games {
      color: var(--alphabet-letter-color, var(--color-text, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
    }

    .alpha-letter.has-games:hover {
      background: var(--selection-hover-bg, rgba(255, 0, 102, 0.3));
      color: var(--alphabet-letter-active-color, var(--color-text, #fff));
    }

    .alpha-letter.active {
      background: var(--alphabet-letter-active-bg, var(--color-primary, #ff0066));
      color: var(--alphabet-letter-active-color, #fff);
      box-shadow: 0 0 8px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
    }

    /* Controls bar - floating palette style */
    .controls-bar {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      height: auto;
      padding: 12px 24px;
      background: var(--controls-bar-background, var(--toolbar-background, rgba(15, 15, 15, 0.85)));
      backdrop-filter: var(--controls-bar-blur, blur(12px));
      -webkit-backdrop-filter: var(--controls-bar-blur, blur(12px));
      border: 1px solid var(--controls-bar-border, var(--toolbar-border, rgba(255, 255, 255, 0.15)));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      z-index: 200;
      pointer-events: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .nav-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--nav-btn-bg, rgba(255, 0, 102, 0.15));
      border: 2px solid var(--nav-btn-border, rgba(255, 0, 102, 0.4));
      color: var(--nav-btn-color, #ff0066);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 1;
      pointer-events: auto;
    }

    .nav-btn:hover {
      background: var(--nav-btn-hover-bg, rgba(255, 0, 102, 0.3));
      transform: scale(1.1);
    }

    .counter {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.6rem;
      color: var(--counter-color, #ff0066);
      min-width: 100px;
      text-align: center;
    }

    .size-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .size-control label {
      color: var(--color-text-muted, #666);
      font-size: 14px;
    }

    .size-control input[type="range"] {
      width: calc(33vw - 200px);
      min-width: 150px;
      max-width: 300px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .game-count {
      color: var(--color-text-muted, #666);
      font-size: 11px;
    }

    /* State messages */
    .state-message {
      text-align: center;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .state-message .icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .state-message p {
      color: var(--color-text-muted, #888);
      font-size: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid var(--spinner-track, #333);
      border-top-color: var(--color-primary, #ff0066);
      border-radius: 50%;
      margin-bottom: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this._games = [];
    this.systemId = null;
    this._currentIndex = 0;
    this._loading = false;
    this._letterIndex = {};
    this._currentLetter = '#';
    this._unsubscribers = [];
    this._sizeMultiplier = 1.0; // Default multiplier
    this._maxMultiplier = 2.0; // Default max, can be dynamic in subclasses
    this._baseSize = this._getDefaultSize();
    this._size = this._baseSize; // Computed from baseSize * multiplier
    this._pendingRaf = null; // Track requestAnimationFrame for cleanup
    this._momentumRaf = null; // Track momentum scrolling RAF for cleanup
    this._resizeObserver = null; // For responsive sizing
    this._resizeRaf = null; // Track resize recalculation RAF for cleanup

    // Smooth scrolling state
    this._visualOffset = 0; // Float representing visual scroll position
    this._scrollRaf = null; // Animation frame for smooth scrolling
    this._lastScrollTime = 0; // For physics timing
  }

  /**
   * Get the effective size (baseSize * multiplier).
   * Use this in subclasses instead of _size directly.
   */
  get _effectiveSize() {
    return Math.round(this._baseSize * this._sizeMultiplier);
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract methods - must be implemented by subclasses
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the storage prefix for localStorage/sessionStorage keys.
   * E.g., 'wheel', 'spinner', 'spin'
   * @returns {string}
   */
  _getStoragePrefix() {
    throw new Error('Subclass must implement _getStoragePrefix()');
  }

  /**
   * Returns the default size from theme settings.
   * @returns {number}
   */
  _getDefaultSize() {
    return 300; // Override in subclass
  }

  /**
   * Returns the minimum size for this carousel type.
   * Used as lower bound for responsive scaling.
   * @returns {number}
   */
  _getMinSize() {
    return 80; // Default minimum (consistent across all views), override in subclass
  }

  /**
   * Returns the maximum size for this carousel type.
   * Used as upper bound for responsive scaling.
   * @returns {number}
   */
  _getMaxSize() {
    return this._getDefaultSize() * 2; // Override in subclass
  }

  /**
   * Calculate base size from viewport width.
   * Scales between min and max based on viewport.
   * @returns {number}
   */
  _calculateBaseSize() {
    const vw = window.innerWidth;
    const minSize = this._getMinSize();
    const maxSize = this._getMaxSize();

    // Scale: 15% of viewport, clamped to min/max
    const viewportBased = vw * 0.15;
    return Math.min(maxSize, Math.max(minSize, viewportBased));
  }

  /**
   * Calculate the maximum multiplier based on content area height.
   * Override in subclasses that need dynamic max zoom based on container size.
   * Default implementation returns a static value.
   * @returns {number}
   */
  _calculateMaxMultiplier() {
    return 2.0; // Default static max, override in subclass for dynamic
  }

  /**
   * Get the selector for the content area container.
   * Override in subclasses that use dynamic max multiplier.
   * @returns {string|null}
   */
  _getContentAreaSelector() {
    return null; // Override in subclass
  }

  /**
   * Updates the visual display after navigation or size change.
   * Called after _currentIndex or _size changes.
   */
  _updateDisplay() {
    // Override in subclass
  }

  /**
   * Returns the navigation direction keys for this carousel.
   * @returns {{ prev: string, next: string }}
   */
  _getNavKeys() {
    return { prev: 'ArrowLeft', next: 'ArrowRight' };
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();

    // Set up responsive sizing
    this._baseSize = this._calculateBaseSize();
    this._size = this._effectiveSize;

    // Observe viewport changes for responsive sizing
    // Use RAF to debounce and ensure layout is complete before recalculating
    this._resizeObserver = new ResizeObserver(() => {
      // Cancel any pending resize recalculation
      if (this._resizeRaf) {
        cancelAnimationFrame(this._resizeRaf);
      }
      this._resizeRaf = requestAnimationFrame(() => {
        this._baseSize = this._calculateBaseSize();
        this._size = this._effectiveSize;
        // Recalculate max after a second RAF to ensure layout is complete
        requestAnimationFrame(() => {
          this._recalculateMaxMultiplier();
          this._updateDisplay();
        });
      });
    });
    this._resizeObserver.observe(document.body);

    if (this.systemId) {
      const savedPos = sessionStorage.getItem(`rwl-${this._getStoragePrefix()}-pos-${this.systemId}`);
      if (savedPos) {
        this._currentIndex = parseInt(savedPos, 10);
        this._visualOffset = this._currentIndex; // Sync visual offset
      }
    }
  }

  firstUpdated() {
    // Defer max multiplier calculation to ensure DOM has laid out
    // Use multiple attempts with increasing delays to handle complex layouts
    // and ensure container dimensions are final
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._recalculateMaxMultiplier();
      });
    });

    // Additional attempts with increasing delays for stubborn layouts
    setTimeout(() => this._recalculateMaxMultiplier(), 100);
    setTimeout(() => this._recalculateMaxMultiplier(), 250);
    setTimeout(() => this._recalculateMaxMultiplier(), 500);

    // Also observe this component for size changes (more reliable than document.body)
    this._componentResizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this._recalculateMaxMultiplier();
      });
    });
    this._componentResizeObserver.observe(this);
  }

  /**
   * Recalculate max multiplier and update slider.
   * Called after DOM layout is complete.
   */
  _recalculateMaxMultiplier() {
    const newMax = this._calculateMaxMultiplier();
    // Only update if we got a valid result (>= minimum clamp value)
    if (newMax >= 0.5 && isFinite(newMax)) {
      this._maxMultiplier = newMax;
      // Clamp current multiplier if needed
      if (this._sizeMultiplier > this._maxMultiplier) {
        this._sizeMultiplier = this._maxMultiplier;
        this._size = this._effectiveSize;
        this._updateDisplay();
      }
      // Force update to ensure slider max attribute is correct
      this.requestUpdate();

      // Also explicitly set the slider's max property (belt and suspenders)
      const slider = this.shadowRoot?.querySelector('#size-slider');
      if (slider) {
        slider.max = this._maxMultiplier.toFixed(2);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.systemId && this._games.length > 0) {
      sessionStorage.setItem(`rwl-${this._getStoragePrefix()}-pos-${this.systemId}`, this._currentIndex);
    }

    // Clean up resize observers
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._componentResizeObserver) {
      this._componentResizeObserver.disconnect();
      this._componentResizeObserver = null;
    }

    // Cancel any pending animation frames
    if (this._pendingRaf) {
      cancelAnimationFrame(this._pendingRaf);
      this._pendingRaf = null;
    }
    if (this._momentumRaf) {
      cancelAnimationFrame(this._momentumRaf);
      this._momentumRaf = null;
    }
    if (this._scrollRaf) {
      cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = null;
    }
    if (this._resizeRaf) {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = null;
    }

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    this._stopVideo();
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('systemId') && this.systemId) {
      const savedPos = sessionStorage.getItem(`rwl-${this._getStoragePrefix()}-pos-${this.systemId}`);
      this._currentIndex = savedPos ? parseInt(savedPos, 10) : 0;
      this._visualOffset = this._currentIndex; // Sync visual offset
      this._loadSectionSize();
      this._loadGames();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('_currentIndex') || changedProperties.has('_games') || changedProperties.has('_size') || changedProperties.has('_sizeMultiplier')) {
      this._updateDisplay();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Size persistence
  // ─────────────────────────────────────────────────────────────

  _getSectionKey() {
    return this.systemId || 'default';
  }

  _loadSectionSize() {
    const key = this._getSectionKey();
    // Load multiplier (new) or legacy size (old)
    const storedMultiplier = localStorage.getItem(`rwl-${this._getStoragePrefix()}-multiplier-${key}`);
    if (storedMultiplier) {
      this._sizeMultiplier = parseFloat(storedMultiplier);
    } else {
      // Check for legacy size value and convert to multiplier
      const storedSize = localStorage.getItem(`rwl-${this._getStoragePrefix()}-size-${key}`);
      if (storedSize) {
        const legacySize = parseInt(storedSize, 10);
        const defaultSize = this._getDefaultSize();
        this._sizeMultiplier = legacySize / defaultSize;
        // Clamp to valid range
        this._sizeMultiplier = Math.max(0.5, Math.min(2.0, this._sizeMultiplier));
      } else {
        this._sizeMultiplier = 1.0;
      }
    }
    this._size = this._effectiveSize;
  }

  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-${this._getStoragePrefix()}-multiplier-${key}`, this._sizeMultiplier);
  }

  _onSliderChange(e) {
    this._sizeMultiplier = parseFloat(e.target.value);
    this._size = this._effectiveSize;
    this._saveSectionSize();
    this._updateDisplay(); // Ensure display updates immediately
  }

  // ─────────────────────────────────────────────────────────────
  // Game data
  // ─────────────────────────────────────────────────────────────

  get selectedGame() {
    return this._games[this._currentIndex] || null;
  }

  async _loadGames() {
    if (this._loading || !this.systemId) return;

    this._loading = true;

    try {
      const response = await api.getGames(this.systemId, { page: 1, limit: 10000 });
      this._games = response.games || [];
      this._buildLetterIndex();

      if (this._currentIndex >= this._games.length) {
        this._currentIndex = Math.max(0, this._games.length - 1);
      }
      this._visualOffset = this._currentIndex; // Sync after loading
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      this._loading = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Navigation & Events
  // ─────────────────────────────────────────────────────────────

  _bindEvents() {
    const navKeys = this._getNavKeys();
    const isVertical = navKeys.prev === 'ArrowUp';

    // Listen to centralized input events (keyboard, gamepad, touch all emit these)
    this._unsubscribers.push(
      state.on('input:navigate', (data) => {
        // Handle both string direction (keyboard/gamepad) and object with velocity (touch)
        let direction, velocity = 0;
        if (typeof data === 'string') {
          direction = data;
        } else if (data && typeof data === 'object') {
          direction = data.direction;
          velocity = data.velocity || 0;
        } else {
          return;
        }

        // Allow subclass to invert touch direction (e.g., spinner-view)
        if (velocity > 0) {
          direction = this._getTouchDirection(direction, isVertical);
        }

        let delta = 0;
        if (isVertical) {
          if (direction === 'up') delta = -1;
          if (direction === 'down') delta = 1;
        } else {
          if (direction === 'left') delta = -1;
          if (direction === 'right') delta = 1;
        }

        if (delta !== 0) {
          // Apply momentum based on velocity
          if (velocity > 0.5) {
            // Fast swipe - use momentum scrolling
            this._momentumScroll(delta, velocity);
          } else {
            // Slow swipe or keyboard/gamepad - single step
            this._navigate(delta);
          }
        }
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => this._selectCurrent())
    );

    // Page navigation (handled by keyboard handler's pageLeft/pageRight)
    this._unsubscribers.push(
      state.on('input:pageLeft', () => this._navigate(-5))
    );

    this._unsubscribers.push(
      state.on('input:pageRight', () => this._navigate(5))
    );

    // Home/End navigation with smooth animation
    this._unsubscribers.push(
      state.on('input:home', () => {
        this._currentIndex = 0;
        this._animateToIndex(0);
      })
    );

    this._unsubscribers.push(
      state.on('input:end', () => {
        this._currentIndex = this._games.length - 1;
        this._animateToIndex(this._currentIndex);
      })
    );

    // Character input for letter jump
    this._unsubscribers.push(
      state.on('input:character', (char) => {
        if (/^[a-z]$/i.test(char)) {
          this._jumpToLetter(char.toUpperCase());
        }
      })
    );
  }

  _navigate(delta) {
    if (this._games.length === 0) return;

    // Update logical index immediately
    this._currentIndex = (this._currentIndex + delta + this._games.length) % this._games.length;

    // Start smooth animation to new index
    this._animateToIndex(this._currentIndex);

    const game = this.selectedGame;
    if (game) {
      state.emit('gameSelected', game);
    }
  }

  /**
   * Smoothly animate _visualOffset to target index using physics-based easing
   * @param {number} targetIndex - The index to animate to
   */
  _animateToIndex(targetIndex) {
    // Cancel existing animation
    if (this._scrollRaf) {
      cancelAnimationFrame(this._scrollRaf);
    }

    const startOffset = this._visualOffset;
    const startTime = performance.now();

    // Handle wrapping - find shortest path
    const gameCount = this._games.length;
    let targetOffset = targetIndex;

    // If we need to wrap around, adjust target for shortest path
    const directDist = Math.abs(targetOffset - startOffset);
    const wrapDist = gameCount - directDist;

    if (wrapDist < directDist) {
      // Shorter to wrap
      if (targetOffset > startOffset) {
        targetOffset = targetOffset - gameCount; // Wrap backwards
      } else {
        targetOffset = targetOffset + gameCount; // Wrap forwards
      }
    }

    const distance = targetOffset - startOffset;
    const duration = Math.min(300, 100 + Math.abs(distance) * 50); // 100-300ms based on distance

    const animate = (currentTime) => {
      if (!this.isConnected) {
        this._scrollRaf = null;
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      // Calculate new visual offset
      let newOffset = startOffset + distance * eased;

      // Normalize to valid range
      while (newOffset < 0) newOffset += gameCount;
      while (newOffset >= gameCount) newOffset -= gameCount;

      this._visualOffset = newOffset;

      // Update display with smooth offset
      this._updateSmoothDisplay();

      if (progress < 1) {
        this._scrollRaf = requestAnimationFrame(animate);
      } else {
        // Animation complete - snap to exact index
        this._visualOffset = this._currentIndex;
        this._scrollRaf = null;
        this._updateSmoothDisplay();
        this.requestUpdate(); // Final update
      }
    };

    this._scrollRaf = requestAnimationFrame(animate);
  }

  /**
   * Update the visual display during smooth scrolling.
   * Subclasses should override this to position items based on _visualOffset.
   * Default implementation calls _updateDisplay().
   */
  _updateSmoothDisplay() {
    this._updateDisplay();
  }

  /**
   * Get touch direction - subclasses can override to invert
   * @param {string} direction - Original direction from touch handler
   * @param {boolean} isVertical - Whether this is a vertical carousel
   * @returns {string} - Possibly modified direction
   */
  _getTouchDirection(direction, isVertical) {
    // Default: keep direction as-is
    return direction;
  }

  /**
   * Momentum scroll - animate through multiple items based on swipe velocity
   * @param {number} direction - +1 or -1
   * @param {number} velocity - Swipe velocity in px/ms
   */
  _momentumScroll(direction, velocity) {
    // Cancel any existing momentum
    if (this._momentumRaf) {
      cancelAnimationFrame(this._momentumRaf);
      this._momentumRaf = null;
    }

    // Calculate number of items to scroll based on velocity
    // velocity is in px/ms, typical fast swipe is 1-3 px/ms
    const itemCount = Math.min(Math.floor(velocity * 5), 10); // Max 10 items
    let remaining = itemCount;
    let currentVelocity = velocity;
    const friction = 0.85; // Deceleration factor
    const minInterval = 50; // Minimum ms between scrolls

    const animate = () => {
      if (remaining <= 0 || !this.isConnected) {
        this._momentumRaf = null;
        return;
      }

      this._navigate(direction);
      remaining--;
      currentVelocity *= friction;

      // Calculate delay based on current velocity (faster = shorter delay)
      const delay = Math.max(minInterval, 150 / currentVelocity);

      // Use setTimeout for variable timing, then RAF for smooth animation
      setTimeout(() => {
        if (remaining > 0 && this.isConnected) {
          this._momentumRaf = requestAnimationFrame(animate);
        } else {
          this._momentumRaf = null;
        }
      }, delay);
    };

    // Start with first navigation immediately
    this._navigate(direction);
    remaining--;

    if (remaining > 0) {
      this._momentumRaf = requestAnimationFrame(animate);
    }
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      sessionStorage.setItem(`rwl-${this._getStoragePrefix()}-pos-${this.systemId}`, this._currentIndex);
      router.navigate(`/game/${game.id}`);
    }
  }

  _handleCardClick(index) {
    if (index === this._currentIndex) {
      this._selectCurrent();
    } else {
      this._currentIndex = index;
      this._animateToIndex(index);
    }
  }

  _handleWheel(e) {
    e.preventDefault();
    this._navigate(e.deltaY > 0 ? 1 : -1);
  }

  // ─────────────────────────────────────────────────────────────
  // Letter index (A-Z navigation)
  // ─────────────────────────────────────────────────────────────

  _buildLetterIndex() {
    this._letterIndex = {};
    this._games.forEach((game, index) => {
      if (!game.name) return;
      let firstChar = game.name.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(firstChar)) firstChar = '#';
      if (!(firstChar in this._letterIndex)) {
        this._letterIndex[firstChar] = index;
      }
    });
  }

  _jumpToLetter(letter) {
    if (letter in this._letterIndex) {
      this._currentIndex = this._letterIndex[letter];
      this._currentLetter = letter;
      this._animateToIndex(this._currentIndex);
    }
  }

  _updateCurrentLetter() {
    const game = this._games[this._currentIndex];
    if (!game?.name) return;

    let letter = game.name.charAt(0).toUpperCase();
    if (!/[A-Z]/.test(letter)) letter = '#';

    if (letter !== this._currentLetter) {
      this._currentLetter = letter;
    }
  }

  _handleAlphabetClick(e) {
    const letterBtn = e.target.closest('.alpha-letter');
    if (letterBtn && letterBtn.classList.contains('has-games')) {
      this._jumpToLetter(letterBtn.dataset.letter);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Media helpers
  // ─────────────────────────────────────────────────────────────

  _stopVideo() {
    const videoPlayer = this.shadowRoot?.querySelector('rwl-video-player');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
    }
  }

  /**
   * Load background image with graceful fallbacks.
   * Tries: fanart -> screenshot -> solid color
   */
  _loadBackgroundImage(bgElement, gameId) {
    const fanartUrl = `/api/media/game/${gameId}/fanart`;
    const screenshotUrl = `/api/media/game/${gameId}/screenshot`;

    const fanartImg = new Image();
    fanartImg.onload = () => {
      bgElement.style.backgroundImage = `url('${fanartUrl}')`;
      bgElement.classList.add('visible');
    };
    fanartImg.onerror = () => {
      const screenshotImg = new Image();
      screenshotImg.onload = () => {
        bgElement.style.backgroundImage = `url('${screenshotUrl}')`;
        bgElement.classList.add('visible');
      };
      screenshotImg.onerror = () => {
        bgElement.style.backgroundImage = 'none';
        bgElement.classList.remove('visible');
      };
      screenshotImg.src = screenshotUrl;
    };
    fanartImg.src = fanartUrl;
  }

  _formatRating(rating) {
    if (!rating) return null;
    const stars = Math.round(parseFloat(rating) * 5);
    return { filled: stars, empty: 5 - stars };
  }

  /**
   * Build game details as Lit template (not HTML string)
   * This avoids breaking Lit's DOM tracking by using innerHTML
   */
  _renderGameDetails(game) {
    const { html } = window.Lit;

    if (!game) {
      return html`<h2 class="game-title">Select a game</h2>`;
    }

    const rating = this._formatRating(game.rating);

    return html`
      <h2 class="game-title">${game.name || 'Unknown'}</h2>
      <div class="game-meta">
        ${game.releaseYear ? html`<span class="meta-item">${game.releaseYear}</span>` : ''}
        ${game.genre ? html`<span class="meta-item">${game.genre}</span>` : ''}
      </div>
      <div class="details-grid">
        ${game.developer ? html`<div class="detail-row"><span class="detail-label">Developer</span><span class="detail-value">${game.developer}</span></div>` : ''}
        ${game.publisher ? html`<div class="detail-row"><span class="detail-label">Publisher</span><span class="detail-value">${game.publisher}</span></div>` : ''}
        ${game.playersString ? html`<div class="detail-row"><span class="detail-label">Players</span><span class="detail-value">${game.playersString}</span></div>` : ''}
        ${game.region ? html`<div class="detail-row"><span class="detail-label">Region</span><span class="detail-value">${game.region}</span></div>` : ''}
        ${rating ? html`<div class="detail-row"><span class="detail-label">Rating</span><span class="rating-stars">${'★'.repeat(rating.filled)}${'☆'.repeat(rating.empty)}</span></div>` : ''}
        ${game.playCount ? html`<div class="detail-row"><span class="detail-label">Play Count</span><span class="detail-value">${game.playCount}</span></div>` : ''}
      </div>
      ${game.description ? html`<p class="game-desc">${game.description}</p>` : ''}
    `;
  }

  /**
   * Update the game details panel with current game info
   * Note: This updates background and video only - details content should be rendered via Lit
   */
  _updateGameDetailsPanel() {
    const game = this.selectedGame;
    const bgImage = this.shadowRoot?.querySelector('.bg-image');
    const videoPlayer = this.shadowRoot?.querySelector('rwl-video-player');

    if (bgImage && game) {
      this._loadBackgroundImage(bgImage, game.id);
    }

    if (videoPlayer && game) {
      videoPlayer.src = `/api/media/game/${game.id}/video`;
    }

    // Request update to re-render details via Lit template
    this.requestUpdate();
  }
}
