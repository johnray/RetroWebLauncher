/**
 * RetroWebLauncher - Main App Component
 * Root component that orchestrates the application layout and routing
 */

import { state } from '../state.js';
import { router } from '../router.js';

class RwlApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentRoute = null;
    this._config = null;
    this._currentSystemId = null;
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

  _bindEvents() {
    // Listen for route changes
    this._unsubscribers.push(
      state.on('routeChanged', (route) => {
        this._handleRoute(route);
      })
    );

    // Listen for config changes
    this._unsubscribers.push(
      state.subscribe('config', (config) => {
        this._config = config;
        this._applyTheme();
      })
    );

    // Listen for game activation (navigate to detail)
    this._unsubscribers.push(
      state.on('gameActivated', (game) => {
        router.navigate(`/game/${game.id}`);
      })
    );

    // Listen for navigation from sidebar
    this._unsubscribers.push(
      state.on('navigate', (data) => {
        if (data.systemId) {
          this._currentSystemId = data.systemId;
        }
      })
    );

    // Input shortcuts
    this._unsubscribers.push(
      state.on('input:search', () => {
        router.navigate('/search');
      })
    );

    this._unsubscribers.push(
      state.on('input:menu', () => {
        router.navigate('/settings');
      })
    );

    this._unsubscribers.push(
      state.on('input:back', () => {
        router.back();
      })
    );
  }

  _handleRoute(route) {
    this._currentRoute = route;
    this._renderContent();
  }

  _applyTheme() {
    const theme = this._config?.theme || 'classic-arcade';
    document.documentElement.setAttribute('data-theme', theme);
  }

  _renderContent() {
    const content = this.shadowRoot.querySelector('#main-content');
    if (!content) return;

    const route = this._currentRoute;

    // Clear previous content
    content.innerHTML = '';

    if (!route) {
      this._renderHome(content);
      return;
    }

    // Route matching - use route.params for dynamic segments
    if (route.path === '/' || route.path === '') {
      this._renderHome(content);
    } else if (route.path === '/system/:id') {
      this._renderSystemView(content, route.params.id);
    } else if (route.path === '/game/:id') {
      this._renderGameDetail(content, route.params.id);
    } else if (route.path === '/search') {
      this._renderSearch(content);
    } else if (route.path === '/settings') {
      this._renderSettings(content);
    } else if (route.path === '/collections') {
      this._renderCollections(content);
    } else if (route.path === '/collection/:id') {
      this._renderCollectionView(content, route.params.id);
    } else {
      this._renderNotFound(content);
    }
  }

  _renderHome(container) {
    container.innerHTML = `
      <div class="home-view">
        <div class="welcome-section animate__animated animate__fadeIn">
          <h2 class="welcome-title">Welcome</h2>
          <p class="welcome-text">
            Select a system from the sidebar to browse your game library,
            or use the search to find specific games.
          </p>
          <div class="quick-actions">
            <button class="quick-btn" id="quick-search">
              <span class="btn-icon">🔍</span>
              <span>Search Games</span>
            </button>
            <button class="quick-btn" id="quick-random">
              <span class="btn-icon">🎲</span>
              <span>Random Game</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind quick action buttons
    container.querySelector('#quick-search')?.addEventListener('click', () => {
      router.navigate('/search');
    });

    container.querySelector('#quick-random')?.addEventListener('click', async () => {
      // Navigate to a random game
      try {
        const response = await fetch('/api/games/list/random');
        const data = await response.json();
        if (data.games && data.games.length > 0) {
          router.navigate(`/game/${data.games[0].id}`);
        }
      } catch (error) {
        console.error('Failed to get random game:', error);
      }
    });
  }

  _renderSystemView(container, systemId) {
    const config = this._config || {};
    const defaultView = config.defaultView || 'wheel';

    // Use wheel or grid based on config
    if (defaultView === 'wheel') {
      container.innerHTML = `<rwl-wheel-view></rwl-wheel-view>`;
      const wheelView = container.querySelector('rwl-wheel-view');
      if (wheelView) {
        wheelView.systemId = systemId;
      }
    } else {
      container.innerHTML = `<rwl-grid-view></rwl-grid-view>`;
      const gridView = container.querySelector('rwl-grid-view');
      if (gridView) {
        gridView.systemId = systemId;
      }
    }
  }

  _renderCollections(container) {
    container.innerHTML = `
      <div class="collections-view">
        <h2>Collections</h2>
        <p>View your game collections</p>
      </div>
    `;
    // TODO: Implement collections list view
  }

  _renderCollectionView(container, collectionId) {
    container.innerHTML = `<rwl-grid-view></rwl-grid-view>`;
    const gridView = container.querySelector('rwl-grid-view');
    if (gridView) {
      gridView.collectionId = collectionId;
    }
  }

  _renderGameDetail(container, gameId) {
    container.innerHTML = `<rwl-game-detail game-id="${gameId}"></rwl-game-detail>`;
  }

  _renderSearch(container) {
    container.innerHTML = `<rwl-search></rwl-search>`;
  }

  _renderSettings(container) {
    container.innerHTML = `<rwl-settings></rwl-settings>`;
  }

  _renderNotFound(container) {
    container.innerHTML = `
      <div class="not-found">
        <h2>Page Not Found</h2>
        <p>The requested page doesn't exist.</p>
        <button class="back-btn" onclick="history.back()">Go Back</button>
      </div>
    `;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }

        .app-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--color-background, #0a0a0a);
        }

        /* Header */
        rwl-header {
          flex-shrink: 0;
        }

        /* Main area with sidebar and content */
        .main-area {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Sidebar */
        rwl-sidebar {
          flex-shrink: 0;
        }

        /* Content */
        .content-area {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        #main-content {
          width: 100%;
          height: 100%;
        }

        /* Home view styles */
        .home-view {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: var(--spacing-xl, 2rem);
        }

        .welcome-section {
          text-align: center;
          max-width: 500px;
        }

        .welcome-title {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-2xl, 2rem);
          color: var(--color-primary, #ff0066);
          margin: 0 0 var(--spacing-lg, 1.5rem) 0;
          text-shadow: 0 0 30px rgba(255, 0, 102, 0.5);
        }

        .welcome-text {
          color: var(--color-text-muted, #888);
          font-size: var(--font-size-base, 1rem);
          line-height: 1.6;
          margin-bottom: var(--spacing-xl, 2rem);
        }

        .quick-actions {
          display: flex;
          gap: var(--spacing-md, 1rem);
          justify-content: center;
        }

        .quick-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm, 0.5rem);
          padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-lg, 12px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .quick-btn:hover {
          background: rgba(255, 0, 102, 0.2);
          border-color: var(--color-primary, #ff0066);
          transform: translateY(-2px);
        }

        .quick-btn:focus-visible {
          outline: var(--focus-ring-width, 4px) solid var(--focus-ring-color, #ff0066);
          outline-offset: 2px;
        }

        .btn-icon {
          font-size: 1.25rem;
        }

        /* Not found */
        .not-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }

        .not-found h2 {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          color: var(--color-primary, #ff0066);
          margin-bottom: var(--spacing-md, 1rem);
        }

        .not-found p {
          color: var(--color-text-muted, #888);
          margin-bottom: var(--spacing-lg, 1.5rem);
        }

        .back-btn {
          padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
          background: var(--color-primary, #ff0066);
          border: none;
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          cursor: pointer;
        }

        /* Screensaver overlay */
        rwl-screensaver {
          position: fixed;
          z-index: var(--z-screensaver, 9999);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .main-area {
            flex-direction: column;
          }

          rwl-sidebar {
            display: none;
          }

          .welcome-title {
            font-size: var(--font-size-lg, 1.25rem);
          }

          .quick-actions {
            flex-direction: column;
          }
        }
      </style>

      <div class="app-layout">
        <rwl-header></rwl-header>

        <div class="main-area">
          <rwl-sidebar></rwl-sidebar>

          <div class="content-area">
            <div id="main-content">
              <!-- Dynamic content rendered here -->
            </div>
          </div>
        </div>

        <rwl-screensaver></rwl-screensaver>
      </div>
    `;

    // Initial content
    this._renderContent();
  }
}

customElements.define('rwl-app', RwlApp);
