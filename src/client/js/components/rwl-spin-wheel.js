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
      background:
        linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.7) 100%),
        linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%);
    }

    /* Left: Details */
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
      max-width: 350px;
      margin-bottom: 25px;
    }

    .crt-frame {
      border-radius: 18px;
    }

    .controls-bar {
      height: 70px;
    }

    .nav-btn {
      width: 44px;
      height: 44px;
      font-size: 1.1rem;
    }

    /* Right: Wheel */
    .wheel-area {
      flex: 1;
      height: calc(100% - 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      perspective: 1000px;
      z-index: 1;
    }

    .spin-wheel {
      position: relative;
      width: 400px;
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
    }

    .wheel-item {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: var(--wheel-item-bg, rgba(20, 20, 30, 0.85));
      border-radius: 10px;
      border: 2px solid var(--content-border, rgba(255, 255, 255, 0.1));
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
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
      width: 60px;
      height: 80px;
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
      font-size: 0.85rem;
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
      left: -15px;
      width: 0;
      height: 0;
      border-top: 12px solid transparent;
      border-bottom: 12px solid transparent;
      border-left: 18px solid #ff0066;
      filter: drop-shadow(0 0 10px rgba(255, 0, 102, 0.8));
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

  _getNavKeys() {
    return { prev: 'ArrowUp', next: 'ArrowDown' };
  }

  // ─────────────────────────────────────────────────────────────
  // Spin-wheel-specific methods
  // ─────────────────────────────────────────────────────────────

  _updateDisplay() {
    this._updateWheelAfterRender();
  }

  _updateWheelAfterRender() {
    requestAnimationFrame(() => {
      const track = this.shadowRoot.querySelector('.wheel-track');
      const items = this.shadowRoot.querySelectorAll('.wheel-item');
      const counter = this.shadowRoot.querySelector('.counter');

      if (!track || items.length === 0) return;

      const itemHeight = this._size * 0.35;
      const visibleItems = 5;

      items.forEach((item, i) => {
        const offset = i - this._currentIndex;
        const absOffset = Math.abs(offset);

        const angle = offset * 22;
        const translateZ = -Math.abs(offset) * 40;
        const translateY = offset * itemHeight;
        const opacity = Math.max(0, 1 - absOffset * 0.25);
        const scale = Math.max(0.55, 1 - absOffset * 0.12);

        item.style.transform = `
          translateY(${translateY}px)
          translateZ(${translateZ}px)
          rotateX(${-angle}deg)
          scale(${scale})
        `;
        item.style.opacity = opacity;
        item.style.zIndex = 100 - absOffset;

        const imgContainer = item.querySelector('.item-image');
        if (imgContainer) {
          imgContainer.style.width = `${this._size * 0.3}px`;
          imgContainer.style.height = `${this._size * 0.4}px`;
        }

        item.style.width = `${this._size}px`;
        item.classList.toggle('active', i === this._currentIndex);
        item.classList.toggle('hidden', absOffset > visibleItems);
      });

      const gameCount = this.shadowRoot.querySelector('.game-count');
      if (gameCount) {
        gameCount.textContent = `${this._games.length} games`;
      }

      if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._games.length}`;

      this._updateGameDetailsPanel();
      this._updateCurrentLetter();
    });
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
      <div class="spin-wheel" @wheel=${this._handleWheel}>
        <div class="wheel-track">
          ${this._games.map((game, index) => {
            const hasImage = game.thumbnail || game.image;
            const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

            return html`
              <div class="wheel-item" data-index="${index}" @click=${() => this._handleCardClick(index)}>
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
        <div class="wheel-pointer"></div>
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
                <rwl-video-player autoplay loop muted></rwl-video-player>
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
              min="200"
              max="550"
              .value=${this._size}
              @input=${this._onSliderChange}
              title="Adjust size"
            >
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-spin-wheel', RwlSpinWheel);
