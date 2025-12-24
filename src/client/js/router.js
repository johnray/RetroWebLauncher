/**
 * RetroWebLauncher - Client-side Router
 * Hash-based routing for PWA compatibility
 */

import { state } from './state.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.params = {};
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/system/:id')
   * @param {Function} handler - Route handler function
   */
  register(path, handler) {
    this.routes.set(path, {
      pattern: this._pathToRegex(path),
      paramNames: this._extractParamNames(path),
      handler
    });
  }

  /**
   * Initialize the router
   */
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRoute());

    // Handle initial route
    this._handleRoute();
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   * @param {Object} queryParams - Optional query parameters
   */
  navigate(path, queryParams = {}) {
    // Strip leading hash if present to avoid double-hash
    let hash = path.startsWith('#') ? path.slice(1) : path;

    if (Object.keys(queryParams).length > 0) {
      const query = new URLSearchParams(queryParams).toString();
      hash = `${hash}?${query}`;
    }

    window.location.hash = hash;
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Replace current route without adding history entry
   * @param {string} path - Route path
   */
  replace(path) {
    window.location.replace(`#${path}`);
  }

  /**
   * Get current route info
   * @returns {Object} Current route info
   */
  getCurrent() {
    return {
      path: this.currentRoute,
      params: { ...this.params },
      query: this._getQueryParams()
    };
  }

  _handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');

    // Find matching route
    for (const [routePath, route] of this.routes) {
      const match = path.match(route.pattern);

      if (match) {
        // Extract params
        this.params = {};
        route.paramNames.forEach((name, index) => {
          this.params[name] = match[index + 1];
        });

        this.currentRoute = routePath;

        // Store in state
        const routeInfo = {
          path: routePath,
          params: this.params,
          query: this._getQueryParams()
        };
        state.set('currentRoute', routeInfo);

        // Emit route change event
        state.emit('routeChanged', routeInfo);

        // Call handler
        try {
          route.handler(this.params, this._getQueryParams());
        } catch (error) {
          console.error('Route handler error:', error);
        }

        return;
      }
    }

    // No match - navigate to home
    console.warn(`No route match for: ${path}`);
    if (path !== '/') {
      this.navigate('/');
    }
  }

  _pathToRegex(path) {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:([^/]+)/g, '([^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  _extractParamNames(path) {
    const matches = path.match(/:([^/]+)/g) || [];
    return matches.map(m => m.slice(1));
  }

  _getQueryParams() {
    const hash = window.location.hash.slice(1);
    const queryString = hash.split('?')[1] || '';
    return Object.fromEntries(new URLSearchParams(queryString));
  }
}

export const router = new Router();

// Register default routes
router.register('/', () => {
  state.emit('navigate', { view: 'home' });
});

router.register('/system/:id', (params) => {
  state.set('lastSystem', params.id);
  state.emit('navigate', { view: 'system', systemId: params.id });
});

router.register('/game/:id', (params) => {
  state.set('lastGame', params.id);
  state.emit('navigate', { view: 'game', gameId: params.id });
});

router.register('/search', (params, query) => {
  state.emit('navigate', { view: 'search', query: query.q || '' });
});

router.register('/settings', () => {
  state.emit('navigate', { view: 'settings' });
});

router.register('/collections', () => {
  state.emit('navigate', { view: 'collections' });
});

router.register('/collection/:id', (params) => {
  state.emit('navigate', { view: 'collection', collectionId: params.id });
});

// Expose for debugging
window.rwlRouter = router;
