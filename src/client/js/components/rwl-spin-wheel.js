/**
 * RetroWebLauncher - Spin Wheel View Component
 * HyperSpin-style vertical spinning wheel on right, details on left
 */

import { RwlCarouselBase } from './rwl-carousel-base.js';
import { themeService } from '../theme-service.js';

const { html, css } = window.Lit;

class RwlSpinWheel extends RwlCarouselBase {
  static properties = {
    ...RwlCarouselBase.properties,
    _rotation: { state: true }
  };

  static styles = css`
    ${RwlCarouselBase.sharedStyles}

    .spin-view {
      position: relative;
      display: flex;
      height: 100%;
    }

    .bg-gradient {
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center bottom, transparent 0%, rgba(10,10,10,0.9) 70%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%));
    }

    /* Left: Details */
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
      max-width: 350px;
      margin-bottom: 25px;
    }

    .crt-frame {
      border-radius: 18px;
    }

    /* Use base controls-bar styling from RwlCarouselBase.sharedStyles */

    /* Use base nav-btn sizing from RwlCarouselBase.sharedStyles */

    /* Right: Wheel */
    .wheel-area {
      position: relative;
      flex: 0 0 auto;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      overflow: visible;
      perspective: 1000px;
      z-index: 1;
      /* width set dynamically in JS - wheel extends off right edge */
    }

    .spin-wheel {
      position: relative;
      /* width set dynamically in JS based on item size */
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1000px;
    }

    .wheel-track {
      position: relative;
      transform-style: preserve-3d;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none; /* Let clicks pass through to 3D-positioned children */
    }

    .wheel-item {
      pointer-events: auto; /* Re-enable clicks on items */
      position: absolute;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: var(--wheel-item-bg, rgba(20, 20, 30, 0.85));
      border-radius: 10px;
      border: 2px solid var(--content-border, rgba(255, 255, 255, 0.1));
      cursor: pointer;
      /* No CSS transition - animated via JavaScript for smooth scrolling */
      transform-style: preserve-3d;
      backface-visibility: hidden;
    }

    .wheel-item.active {
      background: var(--wheel-item-active-bg, linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(0, 200, 255, 0.2)));
      border-color: var(--selection-border-color, rgba(255, 0, 102, 0.8));
      box-shadow: var(--selection-glow, 0 0 30px rgba(255, 0, 102, 0.4), 0 0 60px rgba(0, 200, 255, 0.2));
    }

    .wheel-item.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .wheel-item:hover:not(.active) {
      border-color: var(--content-border-hover, rgba(255, 255, 255, 0.3));
      background: var(--content-item-hover-bg, rgba(30, 30, 50, 0.9));
    }

    .item-image {
      width: var(--spin-img-width, 80px);
      height: var(--spin-img-height, 100px);
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: var(--image-placeholder-bg, rgba(0, 0, 0, 0.4));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .no-img {
      font-size: 1.8rem;
      opacity: 0.3;
    }

    .item-title {
      flex: 1;
      font-size: var(--spin-title-font-size, 0.85rem);
      color: var(--color-text, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .wheel-item.active .item-title {
      text-shadow: 0 0 15px rgba(255, 0, 102, 0.5);
    }

    .badge { position: absolute; top: 5px; right: 10px; font-size: 1rem; }

    .wheel-pointer {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 12px solid transparent;
      border-bottom: 12px solid transparent;
      border-left: 18px solid var(--selection-border-color, #ff0066);
      filter: drop-shadow(0 0 10px var(--selection-glow-rgba, rgba(255, 0, 102, 0.8)));
      z-index: 200;
    }

    .wheel-glow {
      position: absolute;
      width: 280px;
      height: 120px;
      background: radial-gradient(ellipse, rgba(255, 0, 102, 0.15) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
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

      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .spin-view {
        flex-direction: column;
      }

      .details-panel {
        width: 100%;
        height: auto;
        padding: 15px;
        order: 2;
      }

      .wheel-area {
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
    this._rotation = 0;
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract method implementations
  // ─────────────────────────────────────────────────────────────

  _getStoragePrefix() {
    return 'spin';
  }

  _getDefaultSize() {
    const spinWheelSettings = themeService.getSpinWheelSettings();
    return spinWheelSettings?.sizing?.defaultCardSize || 300;
  }

  _getMinSize() {
    return 80; // Minimum size (consistent across all views)
  }

  _getMaxSize() {
    return 550; // Maximum size
  }

  /**
   * Calculate max multiplier so card height is max 75% of wheel area height.
   * Card height = imgHeight + 20 = 156 * multiplier + 20
   * Recalculated on resize to ensure max is always appropriate.
   */
  _calculateMaxMultiplier() {
    const wheelArea = this.shadowRoot?.querySelector('.wheel-area');
    if (!wheelArea) return 2.0; // Fallback

    const containerHeight = wheelArea.offsetHeight;
    const baseImgHeight = 156; // Base image height at multiplier 1.0
    const cardPadding = 20; // Vertical padding on card
    const targetMaxCardHeight = containerHeight * 0.75;
    // cardHeight = baseImgHeight * multiplier + cardPadding
    // multiplier = (targetMaxCardHeight - cardPadding) / baseImgHeight
    const maxMultiplier = (targetMaxCardHeight - cardPadding) / baseImgHeight;

    // Clamp between 0.5 and 3.0
    return Math.max(0.5, Math.min(3.0, maxMultiplier));
  }

  _getNavKeys() {
    return { prev: 'ArrowUp', next: 'ArrowDown' };
  }

  // ─────────────────────────────────────────────────────────────
  // Spin-wheel-specific methods
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

  _updateWheelPositions() {
    const track = this.shadowRoot?.querySelector('.wheel-track');
    const items = this.shadowRoot?.querySelectorAll('.wheel-item');
    const wheelArea = this.shadowRoot?.querySelector('.wheel-area');
    const spinWheel = this.shadowRoot?.querySelector('.spin-wheel');

    if (!track || !items || items.length === 0) return;

    // Get view height to determine how many items we need
    const viewHeight = wheelArea?.clientHeight || window.innerHeight;

    // Card dimensions - scale with multiplier (350px max height at 2.25x zoom)
    const baseImgWidth = 111;
    const baseImgHeight = 156;
    const imgWidth = baseImgWidth * this._sizeMultiplier;
    const imgHeight = baseImgHeight * this._sizeMultiplier;
    // Horizontal growth: slower than vertical but still noticeable
    // At 1.0x: 280px, at 2.0x: 440px (60% growth vs 100% vertical)
    const itemWidth = 200 + (80 * this._sizeMultiplier) + (60 * (this._sizeMultiplier - 1));

    // Title font size scales with multiplier: 0.85rem at 1.0x to ~1.2rem at 2.0x
    const titleFontSize = 0.85 + (0.35 * (this._sizeMultiplier - 1));
    this.style.setProperty('--spin-title-font-size', `${titleFontSize}rem`);

    // Card height = image height + vertical padding (card is flex row, not column)
    const cardHeight = imgHeight + 20;

    // Wheel radius - INVERSE scaling: larger radius at low zoom for more visible items
    // 40% larger than previous values for better visibility at max zoom
    // At 0.5x: ~875px, at 1.0x: 840px, at 2.0x: 770px
    const radius = 840 - (70 * (this._sizeMultiplier - 1));

    // Calculate angle step so adjacent cards just touch the selected card's bounding box
    // Distance between centers = cardHeight ensures no overlap on selected card
    // sin(angleStep) * radius = cardHeight
    const angleStep = Math.asin(Math.min(0.9, cardHeight / radius)) * 180 / Math.PI;

    // Calculate how many items fit in visible arc (~80 degrees each side)
    const visibleItems = Math.floor(80 / angleStep);

    // Set CSS custom properties on host for image sizing
    this.style.setProperty('--spin-img-width', `${imgWidth}px`);
    this.style.setProperty('--spin-img-height', `${imgHeight}px`);

    // Set wheel area width based on item width
    // Keep it reasonably sized - grows with item width but has a minimum
    const wheelAreaWidth = Math.max(350, itemWidth + 80);
    if (wheelArea) {
      wheelArea.style.width = `${wheelAreaWidth}px`;
    }
    if (spinWheel) {
      // Spin wheel width matches wheel area for proper centering
      spinWheel.style.width = `${wheelAreaWidth}px`;
      spinWheel.style.marginRight = '';
    }

    // Position the arrow pointer to the LEFT of the center item's border
    // The arrow is a triangle pointing right (border-left: 18px creates the point at right edge)
    // Center item left edge = wheelAreaWidth/2 - itemWidth/2
    // Arrow tip should be ~35px left of card border for proper visual spacing
    const pointer = this.shadowRoot?.querySelector('.wheel-pointer');
    if (pointer) {
      const cardLeftEdge = (wheelAreaWidth / 2) - (itemWidth / 2);
      const arrowLeft = cardLeftEdge - 35 - 18; // 35px gap + 18px arrow width
      pointer.style.left = `${Math.max(0, arrowLeft)}px`;
    }

    items.forEach((item, i) => {
      // Use _visualOffset for smooth animation
      const offset = i - this._visualOffset;
      const absOffset = Math.abs(offset);

      // Hide items outside visible arc
      if (absOffset > visibleItems + 1) {
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        item.classList.add('hidden');
        return;
      }

      item.classList.remove('hidden');
      item.style.pointerEvents = 'auto';

      // TIRE EFFECT: Use sine/cosine for circular positioning
      // Items at center (offset=0) are at 0 degrees (facing us)
      // Items above/below curve away like a tire viewed from the side
      const angleDeg = offset * angleStep;
      const angleRad = angleDeg * Math.PI / 180;

      // Y position: sine gives the vertical spread (items cluster at top/bottom)
      const translateY = Math.sin(angleRad) * radius;

      // Z position: cosine gives depth (items curve away from viewer)
      // Subtract radius so center item (cos=1) is at z=0, edges curve back
      const translateZ = (Math.cos(angleRad) - 1) * radius;

      // Opacity based on angle - fade as items curve away
      const opacity = Math.max(0.1, Math.cos(angleRad));

      // Scale slightly smaller as items curve away
      const scale = 0.7 + (0.3 * Math.cos(angleRad));

      item.style.transform = `
        translateY(${translateY}px)
        translateZ(${translateZ}px)
        rotateX(${-angleDeg}deg)
        scale(${scale})
      `;
      item.style.opacity = opacity;
      item.style.zIndex = Math.round(100 - absOffset);

      // Apply card width
      item.style.width = `${itemWidth}px`;

      // Active class based on logical selection
      item.classList.toggle('active', i === this._currentIndex);
    });
  }

  /**
   * Handle clicks on the wheel using event delegation
   * This works better with 3D transforms than individual element handlers
   */
  _handleWheelClick(e) {
    const item = e.target.closest('.wheel-item');
    if (!item) return;

    const index = parseInt(item.dataset.index, 10);
    if (isNaN(index)) return;

    this._handleCardClick(index);
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

  _renderWheelContent() {
    if (this._loading) {
      return html`
        <div class="state-message">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
    }

    if (this._games.length === 0) {
      return html`
        <div class="state-message">
          <span class="icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
    }

    return html`
      <div class="wheel-pointer"></div>
      <div class="spin-wheel" @wheel=${this._handleWheel} @click=${this._handleWheelClick}>
        <div class="wheel-track">
          ${this._games.map((game, index) => {
            const hasImage = game.thumbnail || game.image;
            const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

            return html`
              <div class="wheel-item" data-index="${index}">
                <div class="item-image">
                  ${imageUrl
                    ? html`<img src="${imageUrl}" alt="${game.name}" loading="lazy">`
                    : html`<span class="no-img">🎮</span>`
                  }
                </div>
                <div class="item-title">${game.name}</div>
                ${game.favorite ? html`<span class="badge favorite">❤</span>` : ''}
              </div>
            `;
          })}
        </div>
        <div class="wheel-glow"></div>
      </div>
      ${this._renderAlphabetBar()}
    `;
  }

  render() {
    return html`
      <div class="spin-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="details-panel">
          <div class="crt-container">
            <div class="crt-frame">
              <div class="crt-screen">
                <rwl-video-player autoplay loop muted .src=${this.selectedGame ? `/api/media/game/${this.selectedGame.id}/video` : ''}></rwl-video-player>
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

        <div class="wheel-area">
          ${this._renderWheelContent()}
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>▲</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▼</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input
              type="range"
              id="size-slider"
              min="0.5"
              max="${this._maxMultiplier.toFixed(2)}"
              step="0.05"
              .value=${this._sizeMultiplier}
              @input=${this._onSliderChange}
              title="Size multiplier: ${this._sizeMultiplier}x"
            >
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-spin-wheel', RwlSpinWheel);
