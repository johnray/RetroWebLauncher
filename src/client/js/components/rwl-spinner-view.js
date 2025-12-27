/**
 * RetroWebLauncher - Spinner View Component (Wheel of Fortune)
 * Half-clock wheel layout - selection at 9 o'clock position
 * Details on left with CRT video, wheel on right, controls at bottom
 */

import { RwlCarouselBase } from './rwl-carousel-base.js';
import { themeService } from '../theme-service.js';

const { html, css } = window.Lit;

class RwlSpinnerView extends RwlCarouselBase {
  static properties = {
    ...RwlCarouselBase.properties,
    _visibleItems: { state: true }
  };

  static styles = css`
    ${RwlCarouselBase.sharedStyles}

    .spinner-view {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
    }

    .bg-gradient {
      background: var(--bg-gradient-overlay,
        linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.7) 100%),
        linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%));
    }

    /* Left side - Details Panel */
    .details-panel {
      position: relative;
      flex: 1;
      min-width: 300px;
      height: 100%;
      z-index: 5;
      display: flex;
      flex-direction: column;
      padding: 30px 40px;
      overflow: hidden;
    }

    .crt-container {
      width: 100%;
      max-width: 380px;
      margin-bottom: 25px;
    }

    /* Use base controls-bar styling from RwlCarouselBase.sharedStyles */

    /* Use base nav-btn sizing from RwlCarouselBase.sharedStyles */

    /* Right side - Wheel */
    .wheel-container {
      position: relative;
      flex: 0 0 auto;
      height: 100%;
      z-index: 1;
      overflow: visible;
      display: flex;
      align-items: center;
      justify-content: center;
      /* width set dynamically in JS based on wheel size */
      /* Padding on left to prevent shadow cutoff */
      padding-left: 40px;
      margin-left: -40px;
    }

    .wheel-arc {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      /* right offset and top position set dynamically in JS based on radius and zoom */
    }

    .wheel-item {
      position: absolute;
      right: 0;
      top: 50%;
      transform-origin: center center;
      cursor: pointer;
      /* No CSS transition - animated via JavaScript for smooth scrolling */
    }

    .wheel-item.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .item-card {
      position: relative;
      width: 90px;
      height: 125px;
      /* margins set dynamically in JS to center card at any size */
      border-radius: 8px;
      overflow: hidden;
      background: var(--game-card-background, rgba(20, 20, 30, 0.9));
      border: 3px solid var(--game-card-border, rgba(255, 255, 255, 0.15));
      box-shadow: var(--game-card-shadow, 0 8px 30px rgba(0, 0, 0, 0.5));
      transition: all 0.3s ease;
    }

    .wheel-item.active .item-card {
      border-color: var(--selection-border-color, #ff0066);
      border-width: var(--selection-border-width, 4px);
      box-shadow:
        0 0 0 4px var(--selection-glow-rgba, rgba(255, 0, 102, 0.3)),
        0 0 50px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5)),
        0 15px 50px rgba(0, 0, 0, 0.5);
    }

    .item-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .item-card .no-img {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      opacity: 0.3;
      background: var(--game-card-no-image-bg, linear-gradient(135deg, #1a1a2e, #0f0f1a));
    }

    /* Selection pointer - hidden */
    .selection-pointer {
      display: none;
    }

    /* State messages */
    .state-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid var(--spinner-track, #333);
      border-top-color: var(--color-primary, #ff0066);
      border-radius: 50%;
      margin-bottom: 20px;
      animation: spin 1s linear infinite;
    }

    /* Responsive */
    @media (max-width: 1000px) {
      .details-panel {
        width: 40%;
        padding: 20px;
      }

      .crt-container {
        max-width: 280px;
      }

      .game-title {
        font-size: 0.9rem;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .spinner-view {
        flex-direction: column;
      }

      .details-panel {
        width: 100%;
        height: auto;
        padding: 15px;
        order: 2;
      }

      .wheel-container {
        width: 100%;
        height: 50%;
        order: 1;
      }

      .crt-container {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this._visibleItems = 11;
    this._baseRadius = 280; // Will be updated based on viewport
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateRadius();
  }

  /**
   * Calculate radius based on viewport height.
   * Taller screens get larger radius for better proportions.
   */
  _updateRadius() {
    const vh = window.innerHeight;
    // Base radius scales with viewport height
    // Minimum 250px, scales up to ~400px on tall screens
    const minRadius = 250;
    const maxRadius = 450;
    const heightFactor = vh / 900; // Normalize to ~900px baseline
    this._baseRadius = Math.min(maxRadius, Math.max(minRadius, 280 * heightFactor));
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract method implementations
  // ─────────────────────────────────────────────────────────────

  _getStoragePrefix() {
    return 'spinner';
  }

  _getDefaultSize() {
    const spinnerSettings = themeService.getSpinnerSettings();
    return spinnerSettings?.sizing?.defaultSize || 150;
  }

  _getMinSize() {
    return 80; // Minimum size
  }

  _getMaxSize() {
    return 250; // Maximum size
  }

  /**
   * Calculate max multiplier so DISPLAYED card height is max 75% of wheel container height.
   * The active card gets a 1.25x scale transform, so we must account for that.
   * Card height = 140 * scaleFactor where scaleFactor = _size / 100
   * Displayed height = cardHeight * 1.25 (due to scale transform)
   * At multiplier M: displayedHeight = 140 * (_baseSize * M) / 100 * 1.25
   * Want: displayedHeight = 0.75 * containerHeight
   * So: 140 * _baseSize * M * 1.25 / 100 = 0.75 * containerHeight
   * M = (0.75 * containerHeight * 100) / (140 * _baseSize * 1.25)
   * M = (0.60 * containerHeight * 100) / (140 * _baseSize)
   */
  _calculateMaxMultiplier() {
    const wheelContainer = this.shadowRoot?.querySelector('.wheel-container');
    if (!wheelContainer || !this._baseSize) return 2.0; // Fallback

    const containerHeight = wheelContainer.offsetHeight;
    const baseCardFactor = 140;
    const activeScale = 1.25; // Active card scale transform
    // Target 75% of container for DISPLAYED height (after scale transform)
    const targetMaxHeight = containerHeight * 0.75 / activeScale;
    const maxMultiplier = (targetMaxHeight * 100) / (baseCardFactor * this._baseSize);

    // Clamp between 0.5 and 3.0
    return Math.max(0.5, Math.min(3.0, maxMultiplier));
  }

  _getNavKeys() {
    return { prev: 'ArrowUp', next: 'ArrowDown' };
  }

  /**
   * Override touch direction for wheel of fortune UX.
   * Swipe up should move to next item (down the wheel),
   * swipe down should move to previous item (up the wheel).
   */
  _getTouchDirection(direction, isVertical) {
    // Invert vertical swipe direction for natural wheel physics
    if (direction === 'up') return 'down';
    if (direction === 'down') return 'up';
    return direction;
  }

  // ─────────────────────────────────────────────────────────────
  // Spinner-specific methods
  // ─────────────────────────────────────────────────────────────

  _updateDisplay() {
    this._updateWheelPositions();
    this._updateGameDetailsPanel();
    this._updateCurrentLetter();
  }

  /**
   * Override for smooth scrolling - only update wheel positions, not game details
   */
  _updateSmoothDisplay() {
    this._updateWheelPositions();
  }

  _renderAlphabetBar() {
    if (this._games.length < 20) return '';

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    return html`
      <div class="alphabet-bar" @click=${this._handleAlphabetClick}>
        ${letters.map(letter => html`
          <button
            class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
            data-letter="${letter}"
            title="${letter}"
          >${letter}</button>
        `)}
      </div>
    `;
  }

  _renderWheelItems() {
    return this._games.map((game, index) => {
      const hasImage = game.thumbnail || game.image;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

      return html`
        <div class="wheel-item" data-index="${index}" @click=${() => this._handleCardClick(index)}>
          <div class="item-card">
            ${imageUrl
              ? html`<img src="${imageUrl}" alt="${game.name}" loading="lazy">`
              : html`<div class="no-img">🎮</div>`
            }
          </div>
        </div>
      `;
    });
  }

  _updateWheelPositions() {
    const items = this.shadowRoot?.querySelectorAll('.wheel-item');
    if (!items || items.length === 0) return;

    // Update radius on each render to respond to viewport changes
    this._updateRadius();

    const totalItems = this._games.length;
    const scaleFactor = this._size / 100;
    // Use responsive radius, further scaled by size multiplier
    const radius = this._baseRadius * (0.8 + scaleFactor * 0.4);
    const cardWidth = 100 * scaleFactor;  // 350px max height at max zoom
    const cardHeight = 140 * scaleFactor;
    const halfVisible = Math.floor(this._visibleItems / 2);

    // Push wheel off-screen proportionally - show ~2/5 of the wheel
    // Offset by 3/5 (60%) of radius to hide most of the wheel
    const wheelArc = this.shadowRoot?.querySelector('.wheel-arc');
    const wheelContainer = this.shadowRoot?.querySelector('.wheel-container');
    if (wheelArc) {
      const rightOffset = -(radius * 0.60);
      wheelArc.style.right = `${rightOffset}px`;
      // Vertical centering handled by CSS: top: 50% + transform: translateY(-50%)
      // Same as alphabet bar - no JavaScript override needed
    }

    // Set wheel container width dynamically based on visible portion
    // Visible portion is 40% of radius, plus card width, plus padding
    if (wheelContainer) {
      const visibleWidth = (radius * 0.40) + cardWidth + 60;
      wheelContainer.style.width = `${visibleWidth}px`;
    }

    items.forEach((item, i) => {
      // Use _visualOffset for smooth animation
      let offset = i - this._visualOffset;

      // Handle wrapping
      if (offset > totalItems / 2) offset -= totalItems;
      if (offset < -totalItems / 2) offset += totalItems;

      const absOffset = Math.abs(offset);

      if (absOffset > halfVisible + 1) {
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        item.classList.add('hidden');
        return;
      }

      item.classList.remove('hidden');
      item.style.pointerEvents = 'auto';

      const angleStep = 10 + (scaleFactor * 3);
      const angleDeg = 180 + (offset * angleStep);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = Math.cos(angleRad) * radius;
      const y = Math.sin(angleRad) * radius;
      const tiltAngle = (angleDeg - 180) * 0.7;

      // Smooth scale based on distance from center
      const scale = absOffset < 0.5 ? 1.25 : Math.max(0.5, 1.25 - absOffset * 0.15);
      const opacity = Math.max(0.25, 1 - absOffset * 0.18);
      const zIndex = Math.round(100 - absOffset);

      item.style.transform = `
        translateX(${x}px)
        translateY(${y}px)
        rotateZ(${tiltAngle}deg)
        scale(${scale})
      `;
      item.style.opacity = opacity;
      item.style.zIndex = zIndex;

      const card = item.querySelector('.item-card');
      if (card) {
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
        // Dynamic margins to keep card centered at any size
        card.style.marginLeft = `-${cardWidth / 2}px`;
        card.style.marginTop = `-${cardHeight / 2}px`;
      }

      // Active class based on logical selection (_currentIndex)
      item.classList.toggle('active', i === this._currentIndex);
    });
  }

  _handleWheelScroll(e) {
    e.preventDefault();
    this._navigate(e.deltaY > 0 ? 1 : -1);
  }

  render() {
    const videoSrc = this.selectedGame ? `/api/media/game/${this.selectedGame.id}/video` : '';

    return html`
      <div class="spinner-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="details-panel">
          <div class="crt-container">
            <div class="crt-frame">
              <div class="crt-screen">
                <rwl-video-player autoplay loop muted .src=${videoSrc}></rwl-video-player>
              </div>
              <div class="crt-details">
                <div class="crt-led"></div>
                <div class="crt-brand">RetroTV</div>
              </div>
            </div>
          </div>
          <div class="details-content">
            ${this._renderGameDetails(this.selectedGame)}
          </div>
        </div>

        <div class="wheel-container" @wheel=${this._handleWheelScroll}>
          ${this._loading ? html`
            <div class="state-message">
              <div class="loading-spinner"></div>
              <p>Loading games...</p>
            </div>
          ` : this._games.length === 0 ? html`
            <div class="state-message">
              <span class="icon">🎮</span>
              <p>Select a system to browse games</p>
            </div>
          ` : html`
            <div class="wheel-arc">
              ${this._renderWheelItems()}
            </div>
            <div class="selection-pointer"></div>
          `}
        </div>

        ${this._renderAlphabetBar()}

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>▲</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▼</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider" min="0.5" max="${this._maxMultiplier.toFixed(2)}" step="0.1" .value=${this._sizeMultiplier} @input=${this._onSliderChange} title="Size multiplier: ${this._sizeMultiplier}x">
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-spinner-view', RwlSpinnerView);
