/**
 * RetroWebLauncher - API Client
 * Handles all communication with the backend server
 */

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.pendingRequests = new Map(); // For request deduplication
    this.cacheTimeout = 60000; // 1 minute cache
    this.requestTimeout = 30000; // 30 second timeout
    this.maxRetries = 2;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const fetchOptions = { ...defaultOptions, ...options };

    // Add timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = error.error || error.message || `HTTP ${response.status}`;
        throw new ApiError(errorMessage, response.status);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408);
      }

      // Retry on network errors (not on 4xx errors)
      if (retryCount < this.maxRetries && !error.status) {
        console.warn(`Retrying request (${retryCount + 1}/${this.maxRetries}): ${endpoint}`);
        await this._delay(1000 * (retryCount + 1));
        return this.request(endpoint, options, retryCount + 1);
      }

      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get(endpoint, useCache = true) {
    // Check cache first
    if (useCache && this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(endpoint);
    }

    // Request deduplication - return existing promise if request is in flight
    if (this.pendingRequests.has(endpoint)) {
      return this.pendingRequests.get(endpoint);
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const data = await this.request(endpoint);

        if (useCache) {
          this.cache.set(endpoint, { data, timestamp: Date.now() });
        }

        return data;
      } finally {
        // Remove from pending when complete (success or failure)
        this.pendingRequests.delete(endpoint);
      }
    })();

    // Store pending promise for deduplication
    this.pendingRequests.set(endpoint, requestPromise);

    return requestPromise;
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  clearCache() {
    this.cache.clear();
  }

  // Specific API methods

  async getStatus() {
    return this.get('/api/status', false);
  }

  async getConfig() {
    return this.get('/api/config', false);
  }

  async updateConfig(config) {
    this.clearCache();
    return this.put('/api/config', config);
  }

  async getSystems() {
    return this.get('/api/systems');
  }

  async getSystem(systemId) {
    return this.get(`/api/systems/${systemId}`);
  }

  async getGames(systemId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/systems/${systemId}/games${queryString ? '?' + queryString : ''}`;
    // Don't cache game lists - they should always be fresh
    return this.get(endpoint, false);
  }

  async getGame(gameId) {
    return this.get(`/api/games/${gameId}`);
  }

  async launchGame(gameId, options = {}) {
    return this.post(`/api/games/${gameId}/launch`, options);
  }

  async getCollections() {
    return this.get('/api/collections');
  }

  async getCollection(collectionId) {
    return this.get(`/api/collections/${collectionId}`);
  }

  async search(query, filters = {}) {
    const params = { q: query, ...filters };
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/search?${queryString}`, false);
  }

  async getQRCode() {
    return this.get('/api/config/qrcode', false);
  }

  async rescanLibrary() {
    // Use longer timeout for rescan (5 minutes) since it can take a while
    const originalTimeout = this.requestTimeout;
    this.requestTimeout = 300000;
    try {
      const result = await this.post('/api/config/library/rescan');
      // Clear cache after rescan so fresh data is fetched
      this.clearCache();
      return result;
    } finally {
      this.requestTimeout = originalTimeout;
    }
  }

  async getRandomGames(systemId = null, count = 1) {
    const params = { count };
    if (systemId) params.system = systemId;
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/games/list/random?${queryString}`, false);
  }

  async getCollectionGames(collectionId) {
    return this.get(`/api/collections/${collectionId}`);
  }

  async saveConfig(config) {
    return this.updateConfig(config);
  }

  // Media URL helpers
  getImageUrl(systemId, imagePath) {
    if (!imagePath) return null;
    return `/api/media/image/${systemId}/${encodeURIComponent(imagePath)}`;
  }

  getVideoUrl(systemId, videoPath) {
    if (!videoPath) return null;
    return `/api/media/video/${systemId}/${encodeURIComponent(videoPath)}`;
  }

  getManualUrl(systemId, manualPath) {
    if (!manualPath) return null;
    return `/api/media/manual/${systemId}/${encodeURIComponent(manualPath)}`;
  }
}

export const api = new ApiClient();
