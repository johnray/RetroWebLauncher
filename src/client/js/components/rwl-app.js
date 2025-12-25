/**
 * RetroWebLauncher - Main App Component
 * Root component that orchestrates the application layout and routing
 */

import { state } from '../state.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlApp extends LitElement {
  static properties = {
    _currentRoute: { state: true },
    _config: { state: true },
    _currentSystemId: { state: true },
    _currentSystemName: { state: true },
    _currentGameName: { state: true }
  };

  static styles = css`
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
      display: flex;
      flex-direction: column;
    }

    #main-content {
      width: 100%;
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    /* Home view styles */
    .home-view {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--spacing-xl, 2rem);
    }

    .home-view .bg-layer {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0;
      pointer-events: none;
    }

    .home-view .bg-image {
      position: absolute;
      top: -5%; left: -5%;
      width: 110%; height: 110%;
      background-color: var(--color-background, #0a0a0a);
      background-size: cover;
      background-position: center;
      filter: blur(var(--bg-blur, 15px)) brightness(var(--bg-brightness, 0.5));
    }

    .home-view .bg-gradient {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center, transparent 0%, rgba(10,10,10,0.9) 70%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%));
    }

    .welcome-section {
      position: relative;
      z-index: 1;
      text-align: center;
      max-width: 500px;
    }

    .welcome-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: var(--font-size-2xl, 2rem);
      color: var(--color-primary, #ff0066);
      margin: 0 0 var(--spacing-lg, 1.5rem) 0;
      text-shadow: 0 0 30px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
    }

    .welcome-text {
      color: var(--color-text-muted, #888);
      font-size: var(--font-size-base, 1rem);
      line-height: 1.6;
      margin-bottom: var(--spacing-xl, 2rem);
    }

    .welcome-actions {
      display: flex;
      gap: var(--spacing-md, 1rem);
      justify-content: center;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
      background: var(--color-primary, #ff0066);
      border: none;
      border-radius: var(--radius-lg, 12px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-base, 1rem);
      cursor: pointer;
      transition: all var(--transition-normal, 250ms);
      box-shadow: 0 4px 15px var(--button-primary-shadow, rgba(255, 0, 102, 0.3));
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--button-primary-shadow-hover, rgba(255, 0, 102, 0.4));
    }

    .action-btn svg {
      width: 20px;
      height: 20px;
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
      background: var(--button-secondary-bg, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--button-secondary-border, rgba(255, 255, 255, 0.2));
      border-radius: var(--radius-lg, 12px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .quick-btn:hover {
      background: var(--button-secondary-hover, rgba(255, 0, 102, 0.2));
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
      font-family: var(--font-display, 'VT323', monospace);
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

    /* Breadcrumbs - positioned at top of content area without overlapping */
    .breadcrumbs {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--breadcrumb-background, rgba(0, 0, 0, 0.5));
      backdrop-filter: blur(10px);
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .breadcrumbs .crumb {
      color: var(--color-text-muted, #888);
      text-decoration: none;
      transition: color 0.15s ease;
      background: none;
      border: none;
      font: inherit;
      cursor: pointer;
      padding: 0;
    }

    .breadcrumbs button.crumb:hover {
      color: var(--color-primary, #ff0066);
    }

    .breadcrumbs button.crumb:focus-visible {
      outline: 2px solid var(--color-primary, #ff0066);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .breadcrumbs .crumb.current {
      color: var(--color-text, #fff);
      font-weight: 500;
    }

    .breadcrumbs .separator {
      color: var(--color-text-muted, #666);
      font-size: 0.9em;
    }

    /* System view container with toolbar */
    .system-view-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .view-toolbar {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      background: var(--toolbar-background, rgba(0, 0, 0, 0.6));
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .view-content {
      flex: 1;
      position: relative;
      overflow: hidden;
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
  `;

  constructor() {
    super();
    this._currentRoute = null;
    this._config = null;
    this._currentSystemId = null;
    this._currentSystemName = null;
    this._currentGameName = null;
    this._unsubscribers = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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
          this._currentSystemName = data.systemName || data.systemId;
        }
      })
    );

    // Track system selection for breadcrumbs
    this._unsubscribers.push(
      state.on('systemHighlighted', (system) => {
        if (system) {
          this._currentSystemId = system.id;
          this._currentSystemName = system.fullname || system.name || system.id;
        }
      })
    );

    // Track game selection for breadcrumbs
    this._unsubscribers.push(
      state.on('gameSelected', (game) => {
        if (game) {
          this._currentGameName = game.name || 'Game';
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
    this.requestUpdate();
    // Update after render
    this.updateComplete.then(() => {
      this._updateSidebarVisibility();
      this._updateBreadcrumbs();
    });
  }

  _isHomeScreen() {
    const route = this._currentRoute;
    return !route || route.path === '/' || route.path === '';
  }

  _shouldShowSidebar() {
    const homeSettings = themeService.getHomeSettings();

    // Sidebar mode: always show sidebar
    // Carousel mode: never show sidebar (use breadcrumbs instead)
    return homeSettings.style === 'sidebar';
  }

  _updateSidebarVisibility() {
    const sidebar = this.shadowRoot.querySelector('rwl-sidebar');
    if (sidebar) {
      sidebar.style.display = this._shouldShowSidebar() ? '' : 'none';
    }
  }

  _updateBreadcrumbs() {
    const breadcrumbs = this.shadowRoot.querySelector('.breadcrumbs');
    if (!breadcrumbs) return;

    const homeSettings = themeService.getHomeSettings();

    // Breadcrumbs only show in carousel mode (never in sidebar mode)
    // They're hidden on home screen since there's nothing to navigate back to
    if (homeSettings.style !== 'carousel' || this._isHomeScreen()) {
      breadcrumbs.style.display = 'none';
      return;
    }

    const route = this._currentRoute;
    let crumbs = [];

    // Build breadcrumb trail
    if (route?.path === '/system/:id') {
      crumbs = [
        { label: 'Home', path: '/' },
        { label: this._currentSystemName || route.params.id, path: null }
      ];
    } else if (route?.path === '/game/:id') {
      crumbs = [
        { label: 'Home', path: '/' }
      ];
      if (this._currentSystemId) {
        crumbs.push({ label: this._currentSystemName || this._currentSystemId, path: `/system/${this._currentSystemId}` });
      }
      crumbs.push({ label: this._currentGameName || 'Game', path: null });
    } else if (route?.path === '/search') {
      crumbs = [
        { label: 'Home', path: '/' },
        { label: 'Search', path: null }
      ];
    } else if (route?.path === '/settings') {
      crumbs = [
        { label: 'Home', path: '/' },
        { label: 'Settings', path: null }
      ];
    } else if (route?.path === '/collections') {
      crumbs = [
        { label: 'Home', path: '/' },
        { label: 'Collections', path: null }
      ];
    } else if (route?.path === '/collection/:id') {
      crumbs = [
        { label: 'Home', path: '/' },
        { label: 'Collections', path: '/collections' },
        { label: route.params.id, path: null }
      ];
    }

    if (crumbs.length === 0) {
      breadcrumbs.style.display = 'none';
      return;
    }

    breadcrumbs.style.display = 'flex';
    breadcrumbs.innerHTML = crumbs.map((crumb, i) => {
      if (crumb.path) {
        return `<button class="crumb" data-path="${crumb.path}">${crumb.label}</button>${i < crumbs.length - 1 ? '<span class="separator">›</span>' : ''}`;
      }
      return `<span class="crumb current">${crumb.label}</span>`;
    }).join('');

    // Add click handlers for breadcrumb navigation
    breadcrumbs.querySelectorAll('button.crumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.path;
        if (path) router.navigate(path);
      });
    });
  }

  _applyTheme() {
    const theme = this._config?.theme || 'classic-arcade';
    document.documentElement.setAttribute('data-theme', theme);
  }

  _handleSearchClick() {
    router.navigate('/search');
  }

  _handleViewChange(e) {
    const viewContent = this.shadowRoot.querySelector('.view-content');
    const systemId = e.target.getAttribute('system-id');
    const newView = e.detail.view;
    if (viewContent && systemId) {
      this._renderViewType(viewContent, newView, systemId);
    }
  }

  _renderViewType(container, viewType, systemId) {
    switch (viewType) {
      case 'grid':
        container.innerHTML = `<rwl-grid-view></rwl-grid-view>`;
        const gridView = container.querySelector('rwl-grid-view');
        if (gridView) gridView.systemId = systemId;
        break;
      case 'list':
        container.innerHTML = `<rwl-list-view></rwl-list-view>`;
        const listView = container.querySelector('rwl-list-view');
        if (listView) listView.systemId = systemId;
        break;
      case 'spin':
        container.innerHTML = `<rwl-spin-wheel></rwl-spin-wheel>`;
        const spinView = container.querySelector('rwl-spin-wheel');
        if (spinView) spinView.systemId = systemId;
        break;
      case 'spinner':
        container.innerHTML = `<rwl-spinner-view></rwl-spinner-view>`;
        const spinnerView = container.querySelector('rwl-spinner-view');
        if (spinnerView) spinnerView.systemId = systemId;
        break;
      case 'wheel':
      default:
        container.innerHTML = `<rwl-wheel-view></rwl-wheel-view>`;
        const wheelView = container.querySelector('rwl-wheel-view');
        if (wheelView) wheelView.systemId = systemId;
        break;
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('_currentRoute')) {
      // Handle view-specific rendering that needs imperative DOM manipulation
      const content = this.shadowRoot.querySelector('#main-content');
      if (content) {
        this._renderContent(content);
      }
    }
  }

  _renderContent(container) {
    const route = this._currentRoute;

    // Clear previous content
    container.innerHTML = '';

    if (!route) {
      this._renderHome(container);
      return;
    }

    // Route matching - use route.params for dynamic segments
    if (route.path === '/' || route.path === '') {
      this._renderHome(container);
    } else if (route.path === '/system/:id') {
      this._renderSystemView(container, route.params.id);
    } else if (route.path === '/game/:id') {
      this._renderGameDetail(container, route.params.id);
    } else if (route.path === '/search') {
      this._renderSearch(container);
    } else if (route.path === '/settings') {
      this._renderSettings(container);
    } else if (route.path === '/collections') {
      this._renderCollections(container);
    } else if (route.path === '/collection/:id') {
      this._renderCollectionView(container, route.params.id);
    } else {
      this._renderNotFound(container);
    }
  }

  _renderHome(container) {
    const homeSettings = themeService.getHomeSettings();

    // Carousel mode: show the graphical system carousel
    if (homeSettings.style === 'carousel') {
      container.innerHTML = `<rwl-system-carousel></rwl-system-carousel>`;
      return;
    }

    // Sidebar mode: show welcome screen with instructions
    container.innerHTML = `
      <div class="home-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>
        <div class="welcome-section">
          <h1 class="welcome-title">Welcome</h1>
          <p class="welcome-text">
            Select a system from the sidebar to browse your game library, or use the search to find a specific game.
          </p>
          <div class="welcome-actions">
            <button class="action-btn search-action" aria-label="Search games">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              Search Games
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind search button
    container.querySelector('.search-action')?.addEventListener('click', () => {
      router.navigate('/search');
    });
  }

  _renderSystemView(container, systemId) {
    // Get view type from per-system localStorage, fallback to theme default
    const storedView = localStorage.getItem(`rwl-view-type-${systemId}`);
    const viewType = storedView || themeService.getDefaultView('system') || this._config?.defaultView || 'wheel';

    container.innerHTML = `
      <div class="system-view-container">
        <div class="view-toolbar">
          <rwl-view-toggle system-id="${systemId}" view="${viewType}"></rwl-view-toggle>
        </div>
        <div class="view-content"></div>
      </div>
    `;

    const viewContent = container.querySelector('.view-content');
    const viewToggle = container.querySelector('rwl-view-toggle');

    // Also set systemId property for proper initialization
    if (viewToggle) {
      viewToggle.systemId = systemId;
    }

    // Render the selected view
    this._renderViewType(viewContent, viewType, systemId);

    // Listen for view changes
    viewToggle?.addEventListener('viewchange', (e) => {
      const newView = e.detail.view;
      this._renderViewType(viewContent, newView, systemId);
    });
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

  render() {
    return html`
      <div class="app-layout">
        <rwl-header></rwl-header>

        <div class="main-area">
          <rwl-sidebar></rwl-sidebar>

          <div class="content-area">
            <div class="breadcrumbs"></div>
            <div id="main-content">
              <!-- Dynamic content rendered here -->
            </div>
          </div>
        </div>

        <rwl-screensaver></rwl-screensaver>
      </div>
    `;
  }
}

customElements.define('rwl-app', RwlApp);
