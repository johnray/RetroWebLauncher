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
      width: 45%;
      height: calc(100% - 70px);
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

    .controls-bar {
      height: 70px;
    }

    .nav-btn {
      width: 44px;
      height: 44px;
      font-size: 1.1rem;
    }

    /* Right side - Wheel */
    .wheel-container {
      position: relative;
      flex: 1;
      height: calc(100% - 70px);
      z-index: 1;
      overflow: hidden;
    }

    .wheel-arc {
      position: absolute;
      right: 50px;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 100%;
    }

    .wheel-item {
      position: absolute;
      right: 0;
      top: 50%;
      transform-origin: center center;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
    }

    .wheel-item.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .item-card {
      position: relative;
      width: 90px;
      height: 125px;
      margin-left: -45px;
      margin-top: -62px;
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

  _getNavKeys() {
    return { prev: 'ArrowUp', next: 'ArrowDown' };
  }

  // ─────────────────────────────────────────────────────────────
  // Spinner-specific methods
  // ─────────────────────────────────────────────────────────────

  updated(changedProperties) {
    super.updated(changedProperties);

    // Re-render wheel when games load
    if (changedProperties.has('_games') && this._games.length > 0) {
      this._renderWheel();
    }
  }

  _updateDisplay() {
    this._updateWheel();
  }

  _renderWheel() {
    const container = this.shadowRoot.querySelector('.wheel-container');
    if (!container) return;

    if (this._games.length === 0) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
      return;
    }

    // Build the wheel items
    let itemsHtml = '';
    for (let i = 0; i < this._games.length; i++) {
      const game = this._games[i];
      const hasImage = game.thumbnail || game.image;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

      itemsHtml += `
        <div class="wheel-item" data-index="${i}">
          <div class="item-card">
            ${imageUrl ? `<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : `<div class="no-img">🎮</div>`}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="wheel-arc">
        ${itemsHtml}
      </div>
      <div class="selection-pointer"></div>
    `;

    // Bind click handlers
    this.shadowRoot.querySelectorAll('.wheel-item').forEach((item) => {
      const idx = parseInt(item.dataset.index, 10);
      item.addEventListener('click', () => this._handleCardClick(idx));
    });

    // Mouse wheel scrolling
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._navigate(e.deltaY > 0 ? 1 : -1);
    });

    // Add alphabet bar
    this._renderAlphabetBarDOM();

    this._updateWheel();
  }

  _renderAlphabetBarDOM() {
    const wrapper = this.shadowRoot.querySelector('.spinner-view');
    if (!wrapper) return;

    const existing = wrapper.querySelector('.alphabet-bar');
    if (existing) existing.remove();

    if (this._games.length < 20) return;

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    const bar = document.createElement('div');
    bar.className = 'alphabet-bar';
    bar.innerHTML = letters.map(letter => `
      <button
        class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
        data-letter="${letter}"
        title="${letter}"
      >${letter}</button>
    `).join('');

    wrapper.appendChild(bar);

    bar.addEventListener('click', (e) => this._handleAlphabetClick(e));
  }

  _updateWheel() {
    const items = this.shadowRoot.querySelectorAll('.wheel-item');
    const counter = this.shadowRoot.querySelector('.counter');

    if (items.length === 0) return;

    const totalItems = this._games.length;
    const scaleFactor = this._size / 100;
    const baseRadius = 202;
    const cardWidth = 90 * scaleFactor;
    const cardHeight = 125 * scaleFactor;
    const halfVisible = Math.floor(this._visibleItems / 2);

    items.forEach((item, i) => {
      let offset = i - this._currentIndex;

      if (offset > totalItems / 2) offset -= totalItems;
      if (offset < -totalItems / 2) offset += totalItems;

      const absOffset = Math.abs(offset);

      if (absOffset > halfVisible) {
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

      const x = Math.cos(angleRad) * baseRadius;
      const y = Math.sin(angleRad) * baseRadius;
      const tiltAngle = (angleDeg - 180) * 0.7;
      const scale = absOffset === 0 ? 1.25 : Math.max(0.5, 1 - absOffset * 0.12);
      const opacity = Math.max(0.25, 1 - absOffset * 0.18);
      const zIndex = 100 - absOffset;

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
      }

      item.classList.toggle('active', i === this._currentIndex);
    });

    if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._games.length}`;

    this._updateGameDetailsPanel();
    this._updateCurrentLetter();
    this._updateAlphabetBarHighlight();
  }

  _updateAlphabetBarHighlight() {
    const bar = this.shadowRoot.querySelector('.alphabet-bar');
    if (!bar) return;

    bar.querySelectorAll('.alpha-letter').forEach(el => {
      el.classList.toggle('active', el.dataset.letter === this._currentLetter);
      el.classList.toggle('has-games', el.dataset.letter in this._letterIndex);
    });
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
            <h2 class="game-title">Select a game</h2>
          </div>
        </div>

        <div class="wheel-container">
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
          ` : ''}
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>▲</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▼</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider" min="80" max="250" .value=${this._size} @input=${this._onSliderChange} title="Adjust size">
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-spinner-view', RwlSpinnerView);
