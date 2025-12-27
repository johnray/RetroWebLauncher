/**
 * RetroWebLauncher - Wheel View Component (Carousel)
 * Horizontal carousel at bottom, details panel with CRT video above
 */

import { RwlCarouselBase } from './rwl-carousel-base.js';
import { themeService } from '../theme-service.js';

const { html, css } = window.Lit;

class RwlWheelView extends RwlCarouselBase {
  static properties = {
    ...RwlCarouselBase.properties
  };

  static styles = css`
    ${RwlCarouselBase.sharedStyles}

    .wheel-view {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Top: Details Panel */
    .details-panel {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 25px 40px;
      z-index: 1;
      gap: 40px;
    }

    .crt-container {
      width: 320px;
    }

    .details-content {
      max-width: 500px;
    }

    /* Bottom: Carousel */
    .carousel-area {
      position: relative;
      overflow: visible;
      z-index: 1;
      margin-bottom: 10vh;
    }

    .carousel {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .carousel-track {
      display: flex;
      /* No CSS transition - animated via JavaScript for smooth scrolling */
      height: 100%;
      align-items: flex-end;
      padding: 20px 0 80px;
    }

    .card {
      flex-shrink: 0;
      background: var(--game-card-background, #1a1a1a);
      border: 1px solid var(--game-card-border, transparent);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
      transform: scale(0.85);
      transform-origin: bottom center;
      opacity: 0.5;
      filter: brightness(0.6);
      position: relative;
    }

    .card.active {
      transform: scale(1.1);
      opacity: 1;
      filter: brightness(1);
      z-index: 10;
      border: var(--selection-border-width, 3px) solid var(--selection-border-color, #ff0066);
      box-shadow:
        0 0 60px var(--selection-glow-rgba, rgba(255, 0, 102, 0.4)),
        0 20px 40px rgba(0, 0, 0, 0.6);
    }

    .card.prev, .card.next {
      transform: scale(0.95);
      opacity: 0.8;
      filter: brightness(0.8);
    }

    .card:hover:not(.active) {
      transform: scale(0.9);
      opacity: 0.9;
    }

    .card-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--game-card-image-bg, linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%));
    }

    .card-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: var(--game-card-image-bg, linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%));
    }

    .no-img {
      font-size: 4rem;
      opacity: 0.2;
    }

    .badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 1.2rem;
    }

    /* Reflection - disabled to prevent visual artifacts */
    .carousel::after {
      display: none;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .details-panel {
        flex-direction: column;
        gap: 20px;
        padding: 15px;
      }

      .crt-container {
        width: 250px;
      }

      .game-title {
        font-size: 0.9rem;
      }

      .game-desc {
        display: none;
      }
    }

    @media (max-width: 600px) {
      .crt-container {
        display: none;
      }

      .details-content {
        text-align: center;
      }
    }
  `;

  // ─────────────────────────────────────────────────────────────
  // Abstract method implementations
  // ─────────────────────────────────────────────────────────────

  _getStoragePrefix() {
    return 'wheel';
  }

  _getDefaultSize() {
    const carouselSettings = themeService.getCarouselSettings();
    return carouselSettings?.sizing?.defaultCardSize || 330;
  }

  _getMinSize() {
    return 80; // Minimum card size (consistent across all views)
  }

  _getMaxSize() {
    return 450; // Maximum card size
  }

  _getNavKeys() {
    return { prev: 'ArrowLeft', next: 'ArrowRight' };
  }

  // ─────────────────────────────────────────────────────────────
  // Wheel-specific methods
  // ─────────────────────────────────────────────────────────────

  _getCarouselHeight() {
    // Card height * scale factor (1.1 for active) + padding for upward expansion
    const cardHeight = Math.round(this._size * 1.36);
    const scaledHeight = cardHeight * 1.1;
    return Math.round(scaledHeight) + 60;
  }

  _getGap() {
    return Math.round(this._size * 0.09);
  }

  _updateDisplay() {
    this._updateCurrentLetter();
    this._updateTrackPosition();
    this._updateGameDetailsPanel();
  }

  /**
   * Override for smooth scrolling - only update track position, not game details
   */
  _updateSmoothDisplay() {
    this._updateTrackPosition();
  }

  /**
   * Update the carousel track position based on _visualOffset
   */
  _updateTrackPosition() {
    const track = this.shadowRoot?.querySelector('.carousel-track');
    if (!track) return;

    const cardWidth = this._size;
    const gap = this._getGap();
    const carousel = this.shadowRoot.querySelector('.carousel');
    const containerWidth = carousel?.offsetWidth || 800;
    const centerOffset = (containerWidth / 2) - (cardWidth / 2);

    // Use _visualOffset for smooth animation
    const translateX = centerOffset - (this._visualOffset * (cardWidth + gap));

    track.style.transform = `translateX(${translateX}px)`;
    track.style.gap = `${gap}px`;
  }

  _renderCard(game, index) {
    const hasImage = game.thumbnail || game.image;
    const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';
    const isActive = index === this._currentIndex;
    const isPrev = index === this._currentIndex - 1;
    const isNext = index === this._currentIndex + 1;

    const classes = ['card'];
    if (isActive) classes.push('active');
    if (isPrev) classes.push('prev');
    if (isNext) classes.push('next');

    return html`
      <div class="${classes.join(' ')}"
           data-index="${index}"
           @click=${() => this._handleCardClick(index)}
           style="width: ${this._size}px; height: ${Math.round(this._size * 1.36)}px;">
        <div class="card-image">
          ${imageUrl ? html`<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : html`<span class="no-img">🎮</span>`}
        </div>
        ${game.favorite ? html`<span class="badge favorite">❤</span>` : ''}
      </div>
    `;
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

  _renderCarouselContent() {
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
          <p>${this.systemId ? 'No games found' : 'Select a system to browse games'}</p>
        </div>
      `;
    }

    return html`
      <div class="carousel" @wheel=${this._handleWheel}>
        <div class="carousel-track">
          ${this._games.map((game, index) => this._renderCard(game, index))}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="wheel-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="details-panel">
          <div class="crt-container">
            <div class="crt-frame">
              <div class="crt-screen">
                <rwl-video-player autoplay loop muted></rwl-video-player>
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

        <div class="carousel-area" style="height: ${this._getCarouselHeight()}px;">
          ${this._renderCarouselContent()}
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>◀</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▶</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider"
                   min="0.5" max="2" step="0.1"
                   .value=${this._sizeMultiplier}
                   @input=${this._onSliderChange}
                   title="Size multiplier: ${this._sizeMultiplier}x">
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>

        ${this._renderAlphabetBar()}
      </div>
    `;
  }
}

customElements.define('rwl-wheel-view', RwlWheelView);
