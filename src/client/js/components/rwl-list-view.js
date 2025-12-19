/**
 * RetroWebLauncher - List View Component
 * Detailed list view for games with more information visible
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

class RwlListView extends HTMLElement {
  static get observedAttributes() {
    return ['system-id'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
    this._loading = true;
    this._selectedIndex = 0;
    this._sortBy = 'name';
    this._sortOrder = 'asc';
    this._currentLetter = '';
    this._letterIndex = {};
    this._unsubscribers = [];
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  disconnectedCallback() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'system-id' && newValue !== oldValue) {
      this._systemId = newValue;
      this._loadGames();
    }
  }

  set games(data) {
    this._games = data || [];
    this._loading = false;
    this._renderGames();
  }

  async _loadGames() {
    if (!this._systemId) return;

    this._loading = true;
    this._renderGames();

    try {
      const response = await api.getGames(this._systemId, {
        sortBy: this._sortBy,
        order: this._sortOrder,
        limit: 1000
      });
      this._games = response.games || [];
    } catch (error) {
      console.error('Failed to load games:', error);
      this._games = [];
    }

    this._loading = false;
    this._renderGames();
  }

  _bindEvents() {
    // Click handlers
    this.shadowRoot.addEventListener('click', (e) => {
      const row = e.target.closest('.game-row');
      if (row) {
        const gameId = row.dataset.gameId;
        if (gameId) {
          router.navigate(`/game/${gameId}`);
        }
      }

      const sortBtn = e.target.closest('.sort-btn');
      if (sortBtn) {
        this._handleSort(sortBtn.dataset.sort);
      }
    });

    // Keyboard navigation
    this.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this._selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this._selectPrev();
          break;
        case 'Enter':
          e.preventDefault();
          this._activateSelected();
          break;
        case 'Home':
          e.preventDefault();
          this._selectFirst();
          break;
        case 'End':
          e.preventDefault();
          this._selectLast();
          break;
      }
    });

    // Input manager events
    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (direction === 'up') this._selectPrev();
        else if (direction === 'down') this._selectNext();
      })
    );
    this._unsubscribers.push(
      state.on('input:select', () => this._activateSelected())
    );

    // Letter navigation
    this._unsubscribers.push(
      state.on('input:pageLeft', () => this._jumpToPreviousLetter())
    );
    this._unsubscribers.push(
      state.on('input:pageRight', () => this._jumpToNextLetter())
    );
    this._unsubscribers.push(
      state.on('input:character', (char) => this._jumpToLetter(char.toUpperCase()))
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

  _handleSort(field) {
    if (this._sortBy === field) {
      this._sortOrder = this._sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortBy = field;
      this._sortOrder = 'asc';
    }
    this._loadGames();
  }

  _selectNext() {
    if (this._selectedIndex < this._games.length - 1) {
      this._selectedIndex++;
      this._updateSelection();
    }
  }

  _selectPrev() {
    if (this._selectedIndex > 0) {
      this._selectedIndex--;
      this._updateSelection();
    }
  }

  _selectFirst() {
    this._selectedIndex = 0;
    this._updateSelection();
  }

  _selectLast() {
    this._selectedIndex = Math.max(0, this._games.length - 1);
    this._updateSelection();
  }

  _activateSelected() {
    const game = this._games[this._selectedIndex];
    if (game) {
      router.navigate(`/game/${game.id}`);
    }
  }

  _updateSelection() {
    const rows = this.shadowRoot.querySelectorAll('.game-row');
    rows.forEach((row, index) => {
      row.classList.toggle('selected', index === this._selectedIndex);
      if (index === this._selectedIndex) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  _formatRating(rating) {
    if (!rating) return '-';
    const stars = Math.round(parseFloat(rating) * 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  _buildLetterIndex() {
    this._letterIndex = {};
    this._games.forEach((game, index) => {
      if (!game.name) return;
      let firstChar = game.name.charAt(0).toUpperCase();
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
      this._updateSelection();
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

  _bindAlphabetBar() {
    const bar = this.shadowRoot.querySelector('.alphabet-bar');
    if (!bar) return;

    bar.addEventListener('click', (e) => {
      const letterBtn = e.target.closest('.alpha-letter');
      if (letterBtn) {
        this._jumpToLetter(letterBtn.dataset.letter);
      }
    });
  }

  _renderGames() {
    const container = this.shadowRoot.querySelector('.list-content');
    if (!container) return;

    // Remove old alphabet bar
    const oldBar = this.shadowRoot.querySelector('.alphabet-bar');
    if (oldBar) oldBar.remove();

    if (this._loading) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
      return;
    }

    if (this._games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
      return;
    }

    // Build letter index
    this._buildLetterIndex();
    this._updateCurrentLetter();

    container.innerHTML = `
      <table class="games-table">
        <thead>
          <tr>
            <th class="col-name">
              <button class="sort-btn ${this._sortBy === 'name' ? 'active' : ''}" data-sort="name">
                Name ${this._sortBy === 'name' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-year">
              <button class="sort-btn ${this._sortBy === 'release_year' ? 'active' : ''}" data-sort="release_year">
                Year ${this._sortBy === 'release_year' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-genre">Genre</th>
            <th class="col-rating">
              <button class="sort-btn ${this._sortBy === 'rating' ? 'active' : ''}" data-sort="rating">
                Rating ${this._sortBy === 'rating' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-plays">
              <button class="sort-btn ${this._sortBy === 'play_count' ? 'active' : ''}" data-sort="play_count">
                Plays ${this._sortBy === 'play_count' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-fav">Fav</th>
          </tr>
        </thead>
        <tbody>
          ${this._games.map((game, index) => `
            <tr class="game-row ${index === this._selectedIndex ? 'selected' : ''}" data-game-id="${game.id}">
              <td class="col-name">
                <div class="game-name-cell">
                  ${game.thumbnail || game.image ? `
                    <img class="game-thumb" src="/api/media/game/${game.id}/thumbnail" alt="" />
                  ` : `
                    <div class="game-thumb-placeholder">🎮</div>
                  `}
                  <span class="game-name">${game.name}</span>
                </div>
              </td>
              <td class="col-year">${game.releaseYear || '-'}</td>
              <td class="col-genre">${game.genre || '-'}</td>
              <td class="col-rating">
                <span class="rating-stars">${this._formatRating(game.rating)}</span>
              </td>
              <td class="col-plays">${game.playCount || '0'}</td>
              <td class="col-fav">${game.favorite ? '❤️' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Add alphabet bar for large lists
    const listContainer = this.shadowRoot.querySelector('.list-container');
    if (this._games.length >= 50 && listContainer) {
      listContainer.insertAdjacentHTML('beforeend', this._renderAlphabetBar());
      this._bindAlphabetBar();
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }

        .list-container {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.4);
        }

        .list-header {
          padding: var(--spacing-md, 1rem);
          background: rgba(0,0,0,0.6);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .list-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .games-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-sm, 0.75rem);
        }

        .games-table thead {
          position: sticky;
          top: 0;
          background: rgba(0,0,0,0.9);
          z-index: 10;
        }

        .games-table th {
          padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
          text-align: left;
          color: var(--color-text-muted, #888);
          font-weight: 500;
          text-transform: uppercase;
          font-size: var(--font-size-xs, 0.625rem);
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--color-primary, #ff0066);
        }

        .sort-btn {
          background: none;
          border: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
          padding: 0;
          text-transform: uppercase;
          transition: color var(--transition-fast, 150ms);
        }

        .sort-btn:hover,
        .sort-btn.active {
          color: var(--color-primary, #ff0066);
        }

        .games-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: all var(--transition-fast, 150ms);
          cursor: pointer;
        }

        .games-table tbody tr:hover {
          background: rgba(255,0,102,0.1);
        }

        .games-table tbody tr.selected {
          background: rgba(255,0,102,0.2);
          box-shadow:
            inset 4px 0 0 var(--color-primary, #ff0066),
            0 0 20px rgba(255,0,102,0.2);
        }

        .games-table td {
          padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
          color: var(--color-text, #fff);
          vertical-align: middle;
        }

        .game-name-cell {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm, 0.5rem);
        }

        .game-thumb,
        .game-thumb-placeholder {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm, 4px);
          object-fit: cover;
          flex-shrink: 0;
        }

        .game-thumb-placeholder {
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .game-name {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }

        .rating-stars {
          color: var(--color-accent, #ffff00);
          font-size: 0.7rem;
        }

        .col-year,
        .col-plays,
        .col-fav {
          text-align: center;
          width: 80px;
        }

        .col-genre {
          width: 150px;
          color: var(--color-text-muted, #888);
        }

        .col-rating {
          width: 100px;
        }

        /* Loading/Empty states */
        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: var(--spacing-md, 1rem);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: var(--color-primary, #ff0066);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 4rem;
          opacity: 0.3;
        }

        .empty-state p,
        .loading-state p {
          color: var(--color-text-muted, #888);
        }

        /* Scrollbar */
        .list-content::-webkit-scrollbar {
          width: 8px;
        }

        .list-content::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }

        .list-content::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
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
        @media (max-width: 768px) {
          .col-genre,
          .col-rating,
          .col-plays {
            display: none;
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

      <div class="list-container">
        <div class="list-content">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading games...</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-list-view', RwlListView);
