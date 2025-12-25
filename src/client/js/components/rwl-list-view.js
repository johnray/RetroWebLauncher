/**
 * RetroWebLauncher - List View Component
 * Detailed list view for games with more information visible
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlListView extends LitElement {
  static properties = {
    systemId: { type: String, attribute: 'system-id' },
    _games: { state: true },
    _loading: { state: true },
    _selectedIndex: { state: true },
    _sortBy: { state: true },
    _sortOrder: { state: true },
    _currentLetter: { state: true },
    _iconSize: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    .list-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .list-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 50px;
      display: flex;
      flex-direction: column;
      background: var(--content-overlay, rgba(0,0,0,0.4));
    }

    .list-header {
      padding: var(--spacing-md, 1rem);
      background: var(--content-overlay-dark, rgba(0,0,0,0.6));
      border-bottom: 1px solid var(--content-border, rgba(255,255,255,0.1));
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
      background: var(--table-header-background, rgba(0,0,0,0.9));
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
      border-bottom: 1px solid var(--content-border, rgba(255,255,255,0.05));
      transition: all var(--transition-fast, 150ms);
      cursor: pointer;
    }

    .games-table tbody tr:hover {
      background: var(--selection-hover-bg, rgba(255,0,102,0.1));
    }

    .games-table tbody tr.selected {
      background: var(--selection-hover-bg, rgba(255,0,102,0.2));
      box-shadow:
        inset 4px 0 0 var(--color-primary, #ff0066),
        0 0 20px var(--selection-glow-rgba, rgba(255,0,102,0.2));
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
      width: var(--icon-size, 40px);
      height: var(--icon-size, 40px);
      border-radius: var(--radius-sm, 4px);
      object-fit: cover;
      flex-shrink: 0;
    }

    .game-thumb-placeholder {
      background: var(--content-overlay-dark, rgba(255,255,255,0.1));
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
      border: 3px solid var(--spinner-track, rgba(255,255,255,0.2));
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
      background: var(--content-scrollbar-track, rgba(0,0,0,0.2));
    }

    .list-content::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
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
      background: var(--alphabet-bar-background, rgba(0, 0, 0, 0.7));
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
      color: var(--alphabet-letter-muted, var(--color-text-muted, rgba(255, 255, 255, 0.3)));
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.15s ease;
      padding: 0;
    }

    .alpha-letter.has-games {
      color: var(--alphabet-letter-color, var(--color-text, rgba(255, 255, 255, 0.7)));
    }

    .alpha-letter.has-games:hover {
      background: var(--selection-hover-bg, rgba(255, 0, 102, 0.3));
      color: var(--alphabet-letter-active-color, var(--color-text, #fff));
    }

    .alpha-letter.active {
      background: var(--alphabet-letter-active-bg, var(--color-primary, #ff0066));
      color: var(--alphabet-letter-active-color, #fff);
      box-shadow: 0 0 10px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
    }

    /* Dynamic Background */
    .bg-layer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      pointer-events: none;
    }

    .bg-image {
      position: absolute;
      top: -5%;
      left: -5%;
      width: 110%;
      height: 110%;
      background-color: var(--color-background, #0a0a0a);
      background-size: cover;
      background-position: center;
      filter: blur(var(--bg-blur, 15px)) brightness(var(--bg-brightness, 0.5));
      opacity: 0;
      transition: opacity 0.5s ease, background-image 0.5s ease;
    }

    .bg-image.visible {
      opacity: 1;
    }

    .bg-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.7) 100%);
    }

    /* Toolbar */
    .toolbar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: var(--toolbar-background, rgba(20, 20, 20, 0.95));
      border-top: 1px solid var(--toolbar-border, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 0 16px;
      z-index: 150;
    }

    .toolbar label {
      color: var(--color-text-muted, #888);
      font-size: 14px;
    }

    .toolbar input[type="range"] {
      width: 150px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .game-count {
      color: var(--color-text-muted, #888);
      font-size: 12px;
      margin-left: auto;
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
  `;

  constructor() {
    super();
    this._games = [];
    this.systemId = null;
    this._loading = true;
    this._selectedIndex = 0;
    this._sortBy = 'name';
    this._sortOrder = 'asc';
    this._currentLetter = '';
    this._letterIndex = {};
    this._unsubscribers = [];
    this._iconSize = 40; // Will be loaded per-section when systemId is set
    this._savedScrollPos = null;
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this.systemId || 'default';
  }

  /**
   * Load icon size for this section from localStorage, with theme default fallback
   */
  _loadSectionSize() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-list-size-${key}`);
    if (stored) {
      this._iconSize = parseInt(stored, 10);
    } else {
      // Fall back to theme default
      const listSettings = themeService.getListSettings();
      this._iconSize = listSettings?.defaultIconSize || 40;
    }
    this.requestUpdate();
  }

  /**
   * Save icon size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-list-size-${key}`, this._iconSize);
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Save scroll position before leaving
    this._saveScrollPosition();
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  updated(changedProperties) {
    if (changedProperties.has('systemId')) {
      const newId = this.systemId;
      const oldId = changedProperties.get('systemId');
      if (newId !== oldId && newId) {
        // Restore scroll position if available
        const savedPos = sessionStorage.getItem(`rwl-list-scroll-${newId}`);
        if (savedPos) {
          this._savedScrollPos = parseInt(savedPos, 10);
        }
        this._loadSectionSize();
        this._loadGames();
      }
    }

    if (changedProperties.has('_iconSize')) {
      this._applyIconSize();
    }

    // Restore scroll position after render
    if (this._savedScrollPos !== null) {
      requestAnimationFrame(() => this._restoreScrollPosition());
    }
  }

  _saveScrollPosition() {
    const scrollContainer = this.shadowRoot.querySelector('.list-content');
    if (scrollContainer && this.systemId) {
      sessionStorage.setItem(`rwl-list-scroll-${this.systemId}`, scrollContainer.scrollTop);
    }
  }

  _restoreScrollPosition() {
    if (!this._savedScrollPos) return;
    const scrollContainer = this.shadowRoot.querySelector('.list-content');
    if (scrollContainer) {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = this._savedScrollPos;
        this._savedScrollPos = null;
      });
    }
  }

  set games(data) {
    this._games = data || [];
    this._loading = false;
  }

  async _loadGames() {
    if (!this.systemId) return;

    this._loading = true;

    try {
      const response = await api.getGames(this.systemId, {
        sortBy: this._sortBy,
        order: this._sortOrder,
        limit: 10000
      });
      this._games = response.games || [];
    } catch (error) {
      console.error('Failed to load games:', error);
      this._games = [];
    }

    this._loading = false;

    // Update initial background
    if (this._games.length > 0) {
      this._updateBackground(this._games[this._selectedIndex]);
    }

    // Build letter index after loading
    this._buildLetterIndex();
    this._updateCurrentLetter();
  }

  _bindEvents() {
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

    // Update background with selected game's screenshot
    const game = this._games[this._selectedIndex];
    this._updateBackground(game);

    // Update alphabet bar highlight
    this._updateCurrentLetter();
  }

  _updateBackground(game) {
    const bgImage = this.shadowRoot.querySelector('.bg-image');
    if (!bgImage) return;

    if (game) {
      const imgUrl = `/api/media/game/${game.id}/screenshot`;

      // Preload image before swapping to prevent flash
      const preloader = new Image();
      preloader.onload = () => {
        bgImage.style.backgroundImage = `url('${imgUrl}')`;
        bgImage.classList.add('visible');
      };
      preloader.onerror = () => {
        bgImage.style.backgroundImage = `url('${imgUrl}')`;
        bgImage.classList.add('visible');
      };
      preloader.src = imgUrl;
    } else {
      bgImage.classList.remove('visible');
    }
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
      this.requestUpdate();
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
    }
  }

  _handleGameRowClick(e) {
    const row = e.target.closest('.game-row');
    if (row) {
      const gameId = row.dataset.gameId;
      if (gameId) {
        router.navigate(`/game/${gameId}`);
      }
    }
  }

  _handleAlphabetClick(e) {
    const letterBtn = e.target.closest('.alpha-letter');
    if (letterBtn) {
      this._jumpToLetter(letterBtn.dataset.letter);
    }
  }

  _onSliderChange(e) {
    this._iconSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
  }

  _applyIconSize() {
    const container = this.shadowRoot.querySelector('.list-container');
    if (container) {
      container.style.setProperty('--icon-size', `${this._iconSize}px`);
    }
  }

  _renderAlphabetBar() {
    if (this._games.length < 50) return '';

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

  _renderContent() {
    if (this._loading) {
      return html`
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
    }

    if (this._games.length === 0) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
    }

    return html`
      <table class="games-table">
        <thead>
          <tr>
            <th class="col-name">
              <button class="sort-btn ${this._sortBy === 'name' ? 'active' : ''}" @click=${() => this._handleSort('name')}>
                Name ${this._sortBy === 'name' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-year">
              <button class="sort-btn ${this._sortBy === 'release_year' ? 'active' : ''}" @click=${() => this._handleSort('release_year')}>
                Year ${this._sortBy === 'release_year' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-genre">Genre</th>
            <th class="col-rating">
              <button class="sort-btn ${this._sortBy === 'rating' ? 'active' : ''}" @click=${() => this._handleSort('rating')}>
                Rating ${this._sortBy === 'rating' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-plays">
              <button class="sort-btn ${this._sortBy === 'play_count' ? 'active' : ''}" @click=${() => this._handleSort('play_count')}>
                Plays ${this._sortBy === 'play_count' ? (this._sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </th>
            <th class="col-fav">Fav</th>
          </tr>
        </thead>
        <tbody>
          ${this._games.map((game, index) => html`
            <tr class="game-row ${index === this._selectedIndex ? 'selected' : ''}" data-game-id="${game.id}" @click=${this._handleGameRowClick}>
              <td class="col-name">
                <div class="game-name-cell">
                  ${game.thumbnail || game.image ? html`
                    <img class="game-thumb" src="/api/media/game/${game.id}/thumbnail" alt="" />
                  ` : html`
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
          `)}
        </tbody>
      </table>
    `;
  }

  render() {
    return html`
      <div class="list-wrapper">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="list-container">
          <div class="list-content">
            ${this._renderContent()}
          </div>
          ${this._renderAlphabetBar()}
        </div>

        <div class="toolbar">
          <label>🔍</label>
          <input type="range" id="size-slider" min="24" max="80" .value=${this._iconSize} @input=${this._onSliderChange} title="Adjust icon size">
          <span class="game-count">${this._games.length} games</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-list-view', RwlListView);
