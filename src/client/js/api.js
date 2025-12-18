/**
 * RetroWebLauncher - API Client
 * Handles all communication with the backend server
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const fetchOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint, useCache = true) {
    if (useCache && this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(endpoint);
    }

    const data = await this.request(endpoint);

    if (useCache) {
      this.cache.set(endpoint, { data, timestamp: Date.now() });
    }

    return data;
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
    return this.get(endpoint);
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
    return this.post('/api/config/library/rescan');
  }

  async toggleFavorite(gameId) {
    this.clearCache();
    return this.post(`/api/games/${gameId}/favorite`);
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
