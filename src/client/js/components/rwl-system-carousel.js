/**
 * RetroWebLauncher - System Carousel Component
 * Graphical horizontal carousel for system selection using RetroBat theme assets
 *
 * Uses iOS-like scroll physics for smooth touch interactions.
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { ScrollPhysics } from '../scroll-physics.js';

const { LitElement, html, css } = window.Lit;

class RwlSystemCarousel extends LitElement {
  static properties = {
    _systems: { state: true },
    _currentIndex: { state: true },
    _loading: { state: true },
    _sizeMultiplier: { type: Number, state: true },
    _maxMultiplier: { type: Number, state: true },
    _visualOffset: { type: Number, state: true }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--view-background, linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%));
    }

    .system-carousel {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px 0 0 0;
      box-sizing: border-box;
    }

    .carousel-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .carousel {
      flex: 1;
      width: 100%;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
    }

    .carousel-track {
      display: flex;
      gap: 30px;
      /* No CSS transition - physics engine handles smooth animation */
      height: 100%;
      align-items: center;
      padding: 20px 0;
      will-change: transform;
    }

    .system-card {
      flex-shrink: 0;
      width: var(--card-width, 280px);
      height: var(--card-height, 320px);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      /* No CSS transitions - inline styles from JS provide smooth physics-based animation */
      position: relative;
      transform-style: preserve-3d;
      perspective: 1000px;
      will-change: transform, opacity, filter;
    }

    /* Active card gets glow effect - this class still used for border/shadow */
    .system-card.active .card-inner {
      border: var(--selection-border-width, 3px) solid var(--selection-border-color, #00c8ff);
      box-shadow:
        0 0 60px var(--selection-glow-rgba, rgba(0, 200, 255, 0.4)),
        0 0 100px var(--selection-glow-secondary, rgba(255, 0, 102, 0.2)),
        0 20px 40px rgba(0, 0, 0, 0.6);
    }

    .system-card:hover:not(.active) {
      opacity: 0.8;
      filter: brightness(0.8) blur(0);
    }

    .card-inner {
      width: 100%;
      height: 100%;
      background: var(--system-card-background, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%));
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--card-inner-padding, 20px);
      box-sizing: border-box;
      /* Inactive cards use --system-card-inactive-border (default: transparent) */
      border: 2px solid var(--system-card-inactive-border, transparent);
      transition: box-shadow 0.5s ease, border-color 0.3s ease;
    }

    .console-image {
      flex: 0 0 auto; /* Don't grow - use natural size only */
      display: flex;
      align-items: center;
      justify-content: center;
      max-height: var(--console-max-height, 180px);
      margin-bottom: var(--console-margin-bottom, 15px);
    }

    .console-image img {
      max-width: 100%;
      max-height: var(--console-img-max-height, 160px);
      object-fit: contain;
      filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
    }

    .fallback-icon {
      font-size: var(--fallback-icon-size, 5rem);
      opacity: 0.3;
      align-items: center;
      justify-content: center;
    }

    .logo-image {
      flex: 0 0 auto; /* Don't grow - use natural size only */
      height: var(--logo-height, 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .logo-image img {
      max-width: 100%;
      max-height: var(--logo-img-max-height, 50px);
      object-fit: contain;
      filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
    }

    .fallback-text {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.7rem;
      color: var(--color-text, #fff);
      text-align: center;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .game-count-badge {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: var(--game-count-badge-bg, rgba(255, 0, 102, 0.8));
      color: var(--game-count-badge-color, #fff);
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.5rem;
      padding: 6px 10px;
      border-radius: 20px;
      box-shadow: 0 2px 10px var(--badge-glow, rgba(255, 0, 102, 0.4));
    }

    .system-info {
      padding: 20px 30px;
      text-align: center;
      background: var(--system-info-background, linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%));
      position: relative;
      z-index: 5;
    }

    .system-name {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.2rem;
      color: var(--system-name-color, #fff);
      margin-bottom: 8px;
      text-shadow: 0 0 20px var(--selection-glow-rgba, rgba(0, 200, 255, 0.5));
    }

    .system-meta {
      font-size: 0.85rem;
      color: var(--system-meta-color, #888);
      margin: 0;
    }

    /* Controls bar - floating palette style */
    .controls-bar {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      height: auto;
      padding: 12px 24px;
      background: var(--controls-bar-background, var(--controls-bar-bg, rgba(15, 15, 15, 0.85)));
      backdrop-filter: var(--controls-bar-blur, blur(12px));
      -webkit-backdrop-filter: var(--controls-bar-blur, blur(12px));
      border: 1px solid var(--controls-bar-border, var(--controls-bar-border-color, rgba(255, 255, 255, 0.15)));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .size-control {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 20px;
      padding-left: 20px;
      border-left: 1px solid var(--controls-bar-border, rgba(255, 255, 255, 0.15));
    }

    .size-control label {
      font-size: 1rem;
      opacity: 0.7;
    }

    .size-control input[type="range"] {
      width: calc(33vw - 200px);
      min-width: 150px;
      max-width: 300px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .nav-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--nav-btn-bg, rgba(255, 0, 102, 0.15));
      border: 2px solid var(--nav-btn-border, rgba(255, 0, 102, 0.4));
      color: var(--nav-btn-color, #ff0066);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: var(--nav-btn-hover-bg, rgba(255, 0, 102, 0.3));
      transform: scale(1.1);
      box-shadow: 0 0 20px var(--badge-glow, rgba(255, 0, 102, 0.4));
    }

    .counter {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.6rem;
      color: var(--counter-color, #ff0066);
      min-width: 100px;
      text-align: center;
    }

    .state-message {
      text-align: center;
      padding: 40px;
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
      border-top-color: var(--color-primary, #00c8ff);
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Ambient glow effect behind carousel */
    .carousel::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 300px;
      background: radial-gradient(ellipse, rgba(0, 200, 255, 0.15) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
    }

    /* Reflection effect */
    .carousel::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: var(--carousel-reflection-gradient, linear-gradient(0deg, rgba(10, 10, 10, 1) 0%, transparent 100%));
      pointer-events: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .system-card {
        width: 200px;
        height: 240px;
      }

      .carousel {
        height: 280px;
      }

      .console-image img {
        max-height: 100px;
      }

      .system-name {
        font-size: 0.9rem;
      }
    }
  `;

  constructor() {
    super();
    this._systems = [];
    this._currentIndex = 0;
    this._loading = true;
    this._unsubscribers = [];
    try {
      this._sizeMultiplier = parseFloat(localStorage.getItem('rwl-system-carousel-size') || '1.0');
    } catch (e) {
      this._sizeMultiplier = 1.0;
    }
    this._maxMultiplier = 1.5; // Default, will be calculated dynamically
    this._resizeObserver = null;
    this._resizeRaf = null;
    this._visualOffset = 0; // For smooth physics-based scrolling

    // iOS-like scroll physics engine
    this._scrollPhysics = new ScrollPhysics({
      onPositionChange: (position) => this._onPhysicsPositionChange(position),
      onScrollEnd: (index) => this._onPhysicsScrollEnd(index),
      getItemCount: () => this._systems.length,
      wrapAround: true // System carousel wraps around
    });

    // Touch handling for physics-based drag
    this._touchActive = false;
    this._touchDragging = false;
    this._boundTouchStart = this._onTouchStart.bind(this);
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadSystems();
    this._bindEvents();

    // Observe viewport changes for responsive sizing
    // Use RAF to debounce and ensure layout is complete before recalculating
    this._resizeObserver = new ResizeObserver(() => {
      if (this._resizeRaf) {
        cancelAnimationFrame(this._resizeRaf);
      }
      this._resizeRaf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this._recalculateMaxMultiplier();
          this._updateCarousel();
          // Update physics item size based on card width
          this._updatePhysicsItemSize();
        });
      });
    });
    this._resizeObserver.observe(document.body);

    // Attach touch handlers for physics-based scrolling
    this.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    this.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    this.addEventListener('touchend', this._boundTouchEnd, { passive: true });
    this.addEventListener('touchcancel', this._boundTouchEnd, { passive: true });
  }

  firstUpdated() {
    // Defer max multiplier calculation to ensure DOM has laid out
    // Use double RAF to wait for both render and layout passes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._recalculateMaxMultiplier();
        // Initialize physics item size after layout is complete
        this._updatePhysicsItemSize();
      });
    });
  }

  /**
   * Recalculate max multiplier and update slider.
   * Called after DOM layout is complete.
   */
  _recalculateMaxMultiplier() {
    const newMax = this._calculateMaxMultiplier();
    if (newMax > 0.5) {
      this._maxMultiplier = newMax;
      if (this._sizeMultiplier > this._maxMultiplier) {
        this._sizeMultiplier = this._maxMultiplier;
        try {
          localStorage.setItem('rwl-system-carousel-size', this._sizeMultiplier);
        } catch (e) {
          // localStorage unavailable
        }
      }
      this.requestUpdate();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);

    // Clean up touch handlers
    this.removeEventListener('touchstart', this._boundTouchStart);
    this.removeEventListener('touchmove', this._boundTouchMove);
    this.removeEventListener('touchend', this._boundTouchEnd);
    this.removeEventListener('touchcancel', this._boundTouchEnd);

    // Clean up physics engine
    if (this._scrollPhysics) {
      this._scrollPhysics.destroy();
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeRaf) {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = null;
    }
  }

  /**
   * Calculate max multiplier so image height is max 75% of carousel height.
   * Image height = 160 * _sizeMultiplier (base image max-height at multiplier 1.0)
   * Recalculated on resize to ensure max is always appropriate.
   */
  _calculateMaxMultiplier() {
    const carousel = this.shadowRoot?.querySelector('.carousel');
    if (!carousel) return 1.5; // Fallback

    const containerHeight = carousel.offsetHeight;
    const baseImageHeight = 160; // Base image max-height at multiplier 1.0
    const targetMaxHeight = containerHeight * 0.75; // 75% of content area
    const maxMultiplier = targetMaxHeight / baseImageHeight;

    // Clamp between 0.5 and 3.0
    return Math.max(0.5, Math.min(3.0, maxMultiplier));
  }

  get selectedSystem() {
    return this._systems[this._currentIndex] || null;
  }

  async _loadSystems() {
    try {
      const response = await api.getSystems();
      // Only show systems with games
      this._systems = (response.systems || []).filter(s => s.gameCount > 0);
      this._loading = false;
    } catch (error) {
      console.error('Failed to load systems:', error);
      this._loading = false;
      this._systems = null; // Signal error state
    }
  }

  _bindEvents() {
    // Keyboard navigation
    this._keyHandler = (e) => {
      // Only handle if carousel is visible
      if (!this.offsetParent) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this._navigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this._navigate(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._selectCurrent();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this._scrollPhysics.snapTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        this._scrollPhysics.snapTo(this._systems.length - 1);
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // State events for gamepad/input
    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (!this.offsetParent) return;
        if (direction === 'left') this._navigate(-1);
        if (direction === 'right') this._navigate(1);
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => {
        if (!this.offsetParent) return;
        this._selectCurrent();
      })
    );

    // Listen for library updates
    this._unsubscribers.push(
      state.on('libraryUpdated', () => {
        this._loadSystems();
      })
    );
  }

  _navigate(delta) {
    if (this._systems.length === 0) return;

    // Use physics engine for spring-animated navigation
    this._scrollPhysics.navigateBy(delta);
  }

  _selectCurrent() {
    const system = this.selectedSystem;
    if (system) {
      router.navigate(`/system/${system.id}`);
    }
  }

  _handleCardClick(index) {
    if (index === this._currentIndex) {
      this._selectCurrent();
    } else {
      // Use physics spring snap to clicked card
      this._scrollPhysics.snapTo(index);
    }
  }

  _handleWheel(e) {
    e.preventDefault();
    this._navigate(e.deltaY > 0 ? 1 : -1);
  }

  _onSliderChange(e) {
    this._sizeMultiplier = parseFloat(e.target.value);
    try {
      localStorage.setItem('rwl-system-carousel-size', this._sizeMultiplier);
    } catch (err) {
      // localStorage unavailable
    }
    this._updateCarousel();
    // Update physics item size
    this._updatePhysicsItemSize();
  }

  _handleImageError(e, showFallback) {
    e.target.style.display = 'none';
    if (showFallback) {
      e.target.nextElementSibling.style.display = showFallback === 'flex' ? 'flex' : 'block';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Physics Engine Callbacks
  // ─────────────────────────────────────────────────────────────

  /**
   * Update the physics item size based on current card dimensions
   */
  _updatePhysicsItemSize() {
    // Get card width + gap for physics calculations
    const consoleImgMaxHeight = Math.round(160 * this._sizeMultiplier);
    const consoleImgWidth = Math.round(consoleImgMaxHeight * 1.3);
    const minMultiplier = 0.5;
    const maxMultiplier = this._maxMultiplier || 2.0;
    const marginProgress = (this._sizeMultiplier - minMultiplier) / (maxMultiplier - minMultiplier);
    const cardPadding = Math.round(15 + (10 * marginProgress));
    const cardWidth = consoleImgWidth + (cardPadding * 2);
    const gap = Math.round(20 + (20 * marginProgress));

    this._scrollPhysics.setItemSize(cardWidth + gap);
  }

  /**
   * Called by physics engine when position changes during scroll/animation
   */
  _onPhysicsPositionChange(position) {
    this._visualOffset = position;
    // Direct update without waiting for Lit (performance)
    this._updateCarousel();
  }

  /**
   * Called by physics engine when scroll/animation completes
   */
  _onPhysicsScrollEnd(index) {
    this._currentIndex = index;
    this._visualOffset = index;

    // Emit system selection event
    const system = this.selectedSystem;
    if (system) {
      state.emit('systemHighlighted', system);
    }

    this.requestUpdate();
  }

  // ─────────────────────────────────────────────────────────────
  // Touch Handlers for Physics-Based Scrolling
  // ─────────────────────────────────────────────────────────────

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this._touchActive = true;
    this._touchDragging = false;

    // Start physics drag (horizontal for system carousel)
    this._scrollPhysics.startDrag(touch.clientX);
  }

  _onTouchMove(e) {
    if (!this._touchActive || e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Update physics drag - returns true if threshold exceeded
    const isDragging = this._scrollPhysics.updateDrag(touch.clientX);

    if (isDragging) {
      // Prevent page scroll when carousel is dragging
      e.preventDefault();
      this._touchDragging = true;
    }
  }

  _onTouchEnd() {
    if (!this._touchActive) return;

    this._touchActive = false;

    if (this._touchDragging) {
      // End physics drag - will trigger momentum and snap
      this._scrollPhysics.endDrag();
    } else {
      // Was a tap, not a drag - cancel physics and let click handler work
      this._scrollPhysics.cancelDrag();
    }

    this._touchDragging = false;
  }

  updated(changedProperties) {
    if (changedProperties.has('_currentIndex') || changedProperties.has('_systems') || changedProperties.has('_sizeMultiplier') || changedProperties.has('_visualOffset')) {
      this._updateCarousel();
    }
  }

  _updateCarousel() {
    const track = this.shadowRoot.querySelector('.carousel-track');
    const cards = this.shadowRoot.querySelectorAll('.system-card');

    if (!track || cards.length === 0) return;

    // Image sizes scale linearly with multiplier (user confirmed these are correct)
    const consoleImgMaxHeight = Math.round(160 * this._sizeMultiplier);
    const logoImgMaxHeight = Math.round(50 * this._sizeMultiplier);

    // Margin between images: scales from 10px (min zoom) to 50px (max zoom)
    // Use linear interpolation based on multiplier range (0.5 to max)
    const minMultiplier = 0.5;
    const maxMultiplier = this._maxMultiplier || 2.0;
    const marginProgress = (this._sizeMultiplier - minMultiplier) / (maxMultiplier - minMultiplier);
    const consoleMargin = Math.round(10 + (40 * marginProgress)); // 10px to 50px

    // Card padding: minimal, grows slowly (15px to 25px)
    const cardPadding = Math.round(15 + (10 * marginProgress));

    // Calculate card dimensions based on actual content size (tight fit)
    const contentHeight = consoleImgMaxHeight + logoImgMaxHeight + consoleMargin;
    const cardHeight = contentHeight + (cardPadding * 2);
    // Width based on aspect ratio of console image (~1.3:1) plus padding
    const consoleImgWidth = Math.round(consoleImgMaxHeight * 1.3);
    const cardWidth = consoleImgWidth + (cardPadding * 2);

    // Gap between cards scales moderately
    const gap = Math.round(20 + (20 * marginProgress)); // 20px to 40px

    // Set CSS custom properties
    this.style.setProperty('--card-width', `${cardWidth}px`);
    this.style.setProperty('--card-height', `${cardHeight}px`);
    track.style.gap = `${gap}px`;

    // Image container heights (slightly larger than images for flex centering)
    const consoleMaxHeight = consoleImgMaxHeight + 10;
    const logoHeight = logoImgMaxHeight + 10;

    this.style.setProperty('--console-max-height', `${consoleMaxHeight}px`);
    this.style.setProperty('--console-img-max-height', `${consoleImgMaxHeight}px`);
    this.style.setProperty('--logo-height', `${logoHeight}px`);
    this.style.setProperty('--logo-img-max-height', `${logoImgMaxHeight}px`);
    this.style.setProperty('--fallback-icon-size', `${Math.round(3 + (2 * marginProgress))}rem`);
    this.style.setProperty('--card-inner-padding', `${cardPadding}px`);
    this.style.setProperty('--console-margin-bottom', `${consoleMargin}px`);

    // Apply smooth visual styles based on continuous offset from _visualOffset
    const totalSystems = this._systems.length;
    cards.forEach((card, i) => {
      // Calculate continuous offset from visual position
      let offset = i - this._visualOffset;

      // Handle wrapping for smooth animation at edges
      if (totalSystems > 0) {
        if (offset > totalSystems / 2) offset -= totalSystems;
        if (offset < -totalSystems / 2) offset += totalSystems;
      }

      const absOffset = Math.abs(offset);

      // Smooth interpolation of visual properties based on distance from center
      // Scale: 1.0 at center, decreasing as we move away
      const scale = absOffset < 0.5
        ? 1.0 - absOffset * 0.3  // Near center: 1.0 to 0.85
        : Math.max(0.65, 0.85 - (absOffset - 0.5) * 0.2);  // Further: 0.85 to 0.65

      // Opacity: 1.0 at center, decreasing as we move away
      const opacity = absOffset < 0.5
        ? 1.0 - absOffset * 0.6  // Near center: 1.0 to 0.7
        : Math.max(0.3, 0.7 - (absOffset - 0.5) * 0.4);  // Further: 0.7 to 0.3

      // Brightness: 1.0 at center, decreasing as we move away
      const brightness = absOffset < 0.5
        ? 1.0 - absOffset * 0.6
        : Math.max(0.4, 0.7 - (absOffset - 0.5) * 0.3);

      // Blur: 0 at center, increasing as we move away
      const blur = absOffset < 0.5
        ? absOffset * 2  // Near center: 0 to 1px
        : Math.min(3, 1 + (absOffset - 0.5) * 2);  // Further: 1px to 3px

      // Rotation: 0 at center, increasing as we move away (direction based on side)
      const rotateY = offset < 0
        ? Math.min(25, absOffset * 15)  // Left side: positive rotation
        : Math.max(-25, -absOffset * 15);  // Right side: negative rotation

      // Z-index based on distance from center
      const zIndex = Math.round(100 - absOffset * 10);

      // Apply inline styles for smooth animation
      card.style.transform = `scale(${scale}) rotateY(${rotateY}deg)`;
      card.style.opacity = opacity;
      card.style.filter = `brightness(${brightness}) blur(${blur}px)`;
      card.style.zIndex = zIndex;

      // Active class only for the glow effect (border/shadow)
      const isActive = absOffset < 0.5;
      card.classList.toggle('active', isActive);
    });

    // Calculate translation using _visualOffset for smooth scrolling
    const containerWidth = this.shadowRoot.querySelector('.carousel')?.offsetWidth || 900;
    const centerOffset = (containerWidth / 2) - (cardWidth / 2);
    const translateX = centerOffset - (this._visualOffset * (cardWidth + gap));

    track.style.transform = `translateX(${translateX}px)`;
  }

  _renderSystemCard(system, index) {
    return html`
      <div
        class="system-card"
        data-index="${index}"
        data-system-id="${system.id}"
        @click=${() => this._handleCardClick(index)}
      >
        <div class="card-inner">
          <div class="console-image">
            <img
              src="/api/media/system/${system.id}/console"
              alt="${system.fullname}"
              loading="lazy"
              @error=${(e) => this._handleImageError(e, 'flex')}
            >
            <div class="fallback-icon" style="display:none;">🎮</div>
          </div>
          <div class="logo-image">
            <img
              src="/api/media/system/${system.id}/logo"
              alt="${system.fullname}"
              loading="lazy"
              @error=${(e) => this._handleImageError(e, 'block')}
            >
            <span class="fallback-text" style="display:none;">${system.fullname}</span>
          </div>
        </div>
        <div class="game-count-badge">${system.gameCount} games</div>
      </div>
    `;
  }

  render() {
    // Loading state
    if (this._loading) {
      return html`
        <div class="system-carousel">
          <div class="carousel-container">
            <div class="state-message">
              <div class="spinner"></div>
              <p>Loading systems...</p>
            </div>
          </div>
        </div>
      `;
    }

    // Error state
    if (this._systems === null) {
      return html`
        <div class="system-carousel">
          <div class="carousel-container">
            <div class="state-message">
              <span class="icon">⚠️</span>
              <p>Failed to load systems</p>
            </div>
          </div>
        </div>
      `;
    }

    // Empty state
    if (this._systems.length === 0) {
      return html`
        <div class="system-carousel">
          <div class="carousel-container">
            <div class="state-message">
              <span class="icon">🎮</span>
              <p>No systems found</p>
            </div>
          </div>
        </div>
      `;
    }

    // Normal carousel view
    const system = this.selectedSystem;
    const systemNameText = system?.fullname || '';
    const metaParts = [];
    if (system?.manufacturer) metaParts.push(system.manufacturer);
    if (system?.hardware) metaParts.push(system.hardware);
    metaParts.push(`${system?.gameCount || 0} games`);
    const systemMetaText = metaParts.join(' • ');

    return html`
      <div class="system-carousel">
        <div class="carousel-container">
          <div class="system-info">
            <div class="system-name">${systemNameText}</div>
            <div class="system-meta">${systemMetaText}</div>
          </div>
          <div class="carousel" @wheel=${this._handleWheel}>
            <div class="carousel-track">
              ${this._systems.map((sys, index) => this._renderSystemCard(sys, index))}
            </div>
          </div>
          <div class="controls-bar">
            <div class="nav-controls">
              <button class="nav-btn prev" aria-label="Previous system" @click=${() => this._navigate(-1)}>◀</button>
              <span class="counter">${this._currentIndex + 1} / ${this._systems.length}</span>
              <button class="nav-btn next" aria-label="Next system" @click=${() => this._navigate(1)}>▶</button>
            </div>
            <div class="size-control">
              <label>🔍</label>
              <input type="range" id="size-slider" min="0.5" .max=${this._maxMultiplier.toFixed(2)} step="0.1"
                     .value=${this._sizeMultiplier}
                     @input=${this._onSliderChange}
                     title="Size: ${this._sizeMultiplier}x">
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-system-carousel', RwlSystemCarousel);
