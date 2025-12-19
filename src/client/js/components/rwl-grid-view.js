/**
 * RetroWebLauncher - Grid View Component
 * Responsive grid with virtual scrolling for large game lists
 */

import { state } from '../state.js';
import { api } from '../api.js';

class RwlGridView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
    this._collectionId = null;
    this._page = 1;
    this._totalPages = 1;
    this._loading = false;
    this._selectedIndex = 0;
    this._columns = 4;
    this._resizeObserver = null;
    this._currentLetter = '';
    this._letterIndex = {}; // Maps letters to first game index
    this._unsubscribers = []; // Store unsubscribe functions for cleanup
    this._scrollThrottleTimer = null;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
    this._setupResizeObserver();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    // Clean up state event listeners
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  set systemId(id) {
    this._systemId = id;
    this._collectionId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  set collectionId(id) {
    this._collectionId = id;
    this._systemId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  set games(data) {
    this._games = data || [];
    this._renderGames();
  }

  async _loadGames() {
    if (this._loading) return;

    this._loading = true;
    this._showLoading();

    try {
      let response;
      if (this._systemId) {
        response = await api.getGames(this._systemId, { page: this._page, limit: 100 });
      } else if (this._collectionId) {
        response = await api.getCollection(this._collectionId);
      } else {
        return;
      }

      if (this._page === 1) {
        this._games = response.games || [];
      } else {
        this._games = [...this._games, ...(response.games || [])];
      }

      this._totalPages = response.totalPages || response.pagination?.totalPages || 1;
      this._renderGames();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError('Failed to load games');
    } finally {
      this._loading = false;
    }
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this._calculateColumns(entry.contentRect.width);
      }
    });

    this._resizeObserver.observe(this);
  }

  _calculateColumns(width) {
    const cardMinWidth = 180;
    const gap = 16;
    const newColumns = Math.max(2, Math.floor((width + gap) / (cardMinWidth + gap)));

    if (newColumns !== this._columns) {
      this._columns = newColumns;
      this._updateGridStyle();
    }
  }

  _updateGridStyle() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (grid) {
      grid.style.gridTemplateColumns = `repeat(${this._columns}, 1fr)`;
    }
  }

  _bindEvents() {
    // Infinite scroll with throttling for performance
    const container = this.shadowRoot.querySelector('.grid-container');
    if (container) {
      container.addEventListener('scroll', () => {
        // Throttle scroll checks to every 100ms
        if (!this._scrollThrottleTimer) {
          this._scrollThrottleTimer = setTimeout(() => {
            this._checkInfiniteScroll(container);
            this._scrollThrottleTimer = null;
          }, 100);
        }
      }, { passive: true });
    }

    // Keyboard navigation
    this.addEventListener('keydown', (e) => this._handleKeyboard(e));

    // Listen for game focus events from input manager
    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        this._navigate(direction);
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => {
        this._selectCurrent();
      })
    );

    this._unsubscribers.push(
      state.on('input:pageLeft', () => {
        this._jumpToPreviousLetter();
      })
    );

    this._unsubscribers.push(
      state.on('input:pageRight', () => {
        this._jumpToNextLetter();
      })
    );

    // Keyboard character for quick jump
    this._unsubscribers.push(
      state.on('input:character', (char) => {
        this._jumpToLetter(char.toUpperCase());
      })
    );
  }

  _jumpToPreviousLetter() {
    const letters = Object.keys(this._letterIndex).sort();
    if (letters.length === 0) return;

    const currentIndex = letters.indexOf(this._currentLetter);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : letters.length - 1;
    this._jumpToLetter(letters[prevIndex]);
  }

  _jumpToNextLetter() {
    const letters = Object.keys(this._letterIndex).sort();
    if (letters.length === 0) return;

    const currentIndex = letters.indexOf(this._currentLetter);
    const nextIndex = currentIndex < letters.length - 1 ? currentIndex + 1 : 0;
    this._jumpToLetter(letters[nextIndex]);
  }

  _checkInfiniteScroll(container) {
    if (this._loading || this._page >= this._totalPages) return;

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (scrollBottom < 500) {
      this._page++;
      this._loadGames();
    }
  }

  _handleKeyboard(e) {
    const moves = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    };

    if (moves[e.key]) {
      e.preventDefault();
      this._navigate(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._selectCurrent();
    } else if (e.key === 'Home') {
      e.preventDefault();
      this._selectedIndex = 0;
      this._focusSelected();
    } else if (e.key === 'End') {
      e.preventDefault();
      this._selectedIndex = this._games.length - 1;
      this._focusSelected();
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      this._selectedIndex = Math.max(0, this._selectedIndex - this._columns * 3);
      this._focusSelected();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + this._columns * 3);
      this._focusSelected();
    }
  }

  _navigate(direction) {
    const oldIndex = this._selectedIndex;

    switch (direction) {
      case 'up':
        this._selectedIndex = Math.max(0, this._selectedIndex - this._columns);
        break;
      case 'down':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + this._columns);
        break;
      case 'left':
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        break;
      case 'right':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + 1);
        break;
    }

    if (oldIndex !== this._selectedIndex) {
      this._focusSelected();
    }
  }

  _focusSelected() {
    const cards = this.shadowRoot.querySelectorAll('rwl-game-card');
    if (cards[this._selectedIndex]) {
      cards[this._selectedIndex].focus();
      cards[this._selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      state.emit('gameSelected', this._games[this._selectedIndex]);
      this._updateCurrentLetter();
    }
  }

  _buildLetterIndex() {
    this._letterIndex = {};
    this._games.forEach((game, index) => {
      if (!game.name) return;
      let firstChar = game.name.charAt(0).toUpperCase();
      // Group numbers and special chars under #
      if (!/[A-Z]/.test(firstChar)) {
        firstChar = '#';
      }
      if (!(firstChar in this._letterIndex)) {
        this._letterIndex[firstChar] = index;
      }
    });
  }

  _jumpToLetter(letter) {
    if (letter in this._letterIndex) {
      this._selectedIndex = this._letterIndex[letter];
      this._focusSelected();
      this._updateAlphabetBar();
    }
  }

  _updateCurrentLetter() {
    const game = this._games[this._selectedIndex];
    if (!game?.name) return;

    let letter = game.name.charAt(0).toUpperCase();
    if (!/[A-Z]/.test(letter)) {
      letter = '#';
    }

    if (letter !== this._currentLetter) {
      this._currentLetter = letter;
      this._updateAlphabetBar();
    }
  }

  _updateAlphabetBar() {
    const bar = this.shadowRoot.querySelector('.alphabet-bar');
    if (!bar) return;

    bar.querySelectorAll('.alpha-letter').forEach(el => {
      el.classList.toggle('active', el.dataset.letter === this._currentLetter);
      el.classList.toggle('has-games', el.dataset.letter in this._letterIndex);
    });
  }

  _renderAlphabetBar() {
    // Only show for large game lists
    if (this._games.length < 50) return '';

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    return `
      <div class="alphabet-bar">
        ${letters.map(letter => `
          <button
            class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
            data-letter="${letter}"
            title="${letter}"
          >${letter}</button>
        `).join('')}
      </div>
    `;
  }

  _selectCurrent() {
    const game = this._games[this._selectedIndex];
    if (game) {
      state.emit('gameActivated', game);
    }
  }

  _showLoading() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (!grid) return;

    if (this._page === 1) {
      grid.innerHTML = `
        <div class="loading-placeholder">
          ${Array(12).fill().map(() => `
            <div class="loading-card"></div>
          `).join('')}
        </div>
      `;
    }
  }

  _showError(message) {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <p>${message}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;

      grid.querySelector('.retry-btn')?.addEventListener('click', () => {
        this._loadGames();
      });
    }
  }

  _renderGames() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    const container = this.shadowRoot.querySelector('.grid-container');
    if (!grid) return;

    // Remove old alphabet bar if exists
    const oldBar = this.shadowRoot.querySelector('.alphabet-bar');
    if (oldBar) oldBar.remove();

    if (this._games.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
      return;
    }

    // Build letter index for alphabet navigation
    this._buildLetterIndex();
    this._updateCurrentLetter();

    // Create or update game cards
    grid.innerHTML = this._games.map((game, index) => `
      <rwl-game-card
        tabindex="${index === this._selectedIndex ? '0' : '-1'}"
        data-index="${index}"
      ></rwl-game-card>
    `).join('');

    // Set game data on cards
    const cards = grid.querySelectorAll('rwl-game-card');
    cards.forEach((card, index) => {
      card.game = this._games[index];
    });

    // Update grid columns
    this._updateGridStyle();

    // Add alphabet bar for large lists
    if (this._games.length >= 50 && container) {
      container.insertAdjacentHTML('beforeend', this._renderAlphabetBar());
      this._bindAlphabetBar();
    }
  }

  _bindAlphabetBar() {
    const bar = this.shadowRoot.querySelector('.alphabet-bar');
    if (!bar) return;

    bar.addEventListener('click', (e) => {
      const letterBtn = e.target.closest('.alpha-letter');
      if (letterBtn) {
        this._jumpToLetter(letterBtn.dataset.letter);
      }
    });

    // Touch drag support for quick scrolling
    let isDragging = false;
    bar.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    bar.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
    bar.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const element = this.shadowRoot.elementFromPoint(touch.clientX, touch.clientY);
      if (element?.classList.contains('alpha-letter')) {
        this._jumpToLetter(element.dataset.letter);
      }
    }, { passive: true });
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }

        .grid-container {
          position: relative;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--spacing-md, 1rem);
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md, 1rem);
          min-height: 100%;
        }

        rwl-game-card {
          aspect-ratio: 3/4;
        }

        .loading-placeholder {
          display: contents;
        }

        .loading-card {
          aspect-ratio: 3/4;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.05) 0%,
            rgba(255,255,255,0.1) 50%,
            rgba(255,255,255,0.05) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius-md, 8px);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .empty-state,
        .error-message {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl, 3rem);
          text-align: center;
        }

        .empty-icon,
        .error-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md, 1rem);
          opacity: 0.5;
        }

        .empty-state p,
        .error-message p {
          color: var(--color-text-muted, #888);
          font-size: var(--font-size-lg, 1.25rem);
          margin: 0;
        }

        .retry-btn {
          margin-top: var(--spacing-md, 1rem);
          padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
          background: var(--color-primary, #ff0066);
          border: none;
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .retry-btn:hover {
          background: var(--color-primary-hover, #ff3388);
        }

        /* Scrollbar */
        .grid-container::-webkit-scrollbar {
          width: 8px;
        }

        .grid-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }

        .grid-container::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }

        .grid-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }

        /* Alphabet Bar */
        .alphabet-bar {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: var(--spacing-xs, 0.25rem);
          background: rgba(0, 0, 0, 0.7);
          border-radius: var(--radius-md, 8px);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100;
          max-height: calc(100% - 2rem);
          overflow-y: auto;
          scrollbar-width: none;
        }

        .alphabet-bar::-webkit-scrollbar {
          display: none;
        }

        .alpha-letter {
          width: 24px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.15s ease;
          padding: 0;
        }

        .alpha-letter.has-games {
          color: rgba(255, 255, 255, 0.7);
        }

        .alpha-letter.has-games:hover {
          background: rgba(255, 0, 102, 0.3);
          color: #fff;
        }

        .alpha-letter.active {
          background: var(--color-primary, #ff0066);
          color: #fff;
          box-shadow: 0 0 10px rgba(255, 0, 102, 0.5);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .games-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-sm, 0.5rem);
          }

          .grid-container {
            padding: var(--spacing-sm, 0.5rem);
          }

          .alphabet-bar {
            right: 2px;
            padding: 2px;
          }

          .alpha-letter {
            width: 18px;
            height: 16px;
            font-size: 8px;
          }
        }
      </style>

      <div class="grid-container">
        <div class="games-grid">
          <div class="empty-state">
            <span class="empty-icon">🎮</span>
            <p>Select a system to view games</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-grid-view', RwlGridView);
