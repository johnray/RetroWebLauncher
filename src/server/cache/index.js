/**
 * RetroWebLauncher - Cache Manager
 * Orchestrates data scanning, caching, and retrieval
 */

const { initDatabase, systemOps, gameOps, getDb } = require('./database');
const { parseSystems } = require('../retrobat/parser');
const { parseGamelist } = require('../retrobat/gamelist');
const { loadConfig } = require('../config');

let initialized = false;
let scanInProgress = false;
let lastScanTime = null;

/**
 * Initialize the cache system
 */
async function initCache() {
  if (initialized) return;

  console.log('Initializing cache...');
  initDatabase();
  initialized = true;

  // Check if we need to do initial scan
  const systems = systemOps.getAll();
  if (systems.length === 0) {
    console.log('No cached data found, performing initial scan...');
    await fullScan();
  } else {
    console.log(`Loaded ${systems.length} systems from cache`);
    lastScanTime = new Date();
  }
}

/**
 * Perform a full scan of all systems and games
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Object} Scan results
 */
async function fullScan(progressCallback = null) {
  if (scanInProgress) {
    throw new Error('Scan already in progress');
  }

  scanInProgress = true;
  const startTime = Date.now();

  try {
    // Report progress
    const progress = (message, pct) => {
      console.log(`[${pct}%] ${message}`);
      if (progressCallback) {
        progressCallback({ message, percent: pct });
      }
    };

    progress('Starting full library scan...', 0);

    // Parse systems from es_systems.cfg
    progress('Parsing systems configuration...', 5);
    const systems = await parseSystems();

    progress(`Found ${systems.length} systems`, 10);

    // Clear existing data
    progress('Clearing old cache...', 15);
    gameOps.deleteAll();
    systemOps.deleteAll();

    // Process each system
    let totalGames = 0;
    const accessibleSystems = systems.filter(s => s.accessible);

    for (let i = 0; i < accessibleSystems.length; i++) {
      const system = accessibleSystems[i];
      const pct = Math.floor(20 + (i / accessibleSystems.length) * 70);

      progress(`Scanning ${system.fullname}...`, pct);

      try {
        // Parse gamelist for this system
        const games = await parseGamelist(system.resolvedPath || system.path, system.name);

        // Store games in database
        if (games.length > 0) {
          gameOps.upsertMany(games);
        }

        // Update system with game count
        system.gameCount = games.length;
        systemOps.upsert(system);

        totalGames += games.length;
        console.log(`  ${system.name}: ${games.length} games`);
      } catch (error) {
        console.error(`Error scanning ${system.name}:`, error.message);
        system.gameCount = 0;
        systemOps.upsert(system);
      }
    }

    // Also store inaccessible systems (with 0 games)
    const inaccessibleSystems = systems.filter(s => !s.accessible);
    for (const system of inaccessibleSystems) {
      system.gameCount = 0;
      systemOps.upsert(system);
    }

    // Rebuild full-text search index
    progress('Building search index...', 95);
    gameOps.rebuildFTS();

    const duration = Date.now() - startTime;
    lastScanTime = new Date();

    progress('Scan complete!', 100);
    console.log(`Scan complete: ${totalGames} games from ${accessibleSystems.length} systems in ${duration}ms`);

    // Log scan result
    logScan('full', null, 'success', duration, totalGames);

    return {
      success: true,
      duration,
      systemCount: systems.length,
      accessibleSystemCount: accessibleSystems.length,
      gameCount: totalGames
    };
  } catch (error) {
    console.error('Scan failed:', error);
    logScan('full', null, 'error', Date.now() - startTime, 0, error.message);
    throw error;
  } finally {
    scanInProgress = false;
  }
}

/**
 * Scan a single system
 * @param {string} systemId - System ID to scan
 * @returns {Object} Scan results
 */
async function scanSystem(systemId) {
  const startTime = Date.now();

  const system = systemOps.getById(systemId) || systemOps.getByName(systemId);
  if (!system) {
    throw new Error(`System not found: ${systemId}`);
  }

  try {
    // Delete existing games for this system
    gameOps.deleteBySystem(system.id);

    // Parse gamelist
    const games = await parseGamelist(system.resolvedPath || system.path, system.name);

    // Store games
    if (games.length > 0) {
      gameOps.upsertMany(games);
    }

    // Update system game count
    systemOps.updateGameCount(system.id, games.length);

    // Rebuild FTS index
    gameOps.rebuildFTS();

    const duration = Date.now() - startTime;
    logScan('system', systemId, 'success', duration, games.length);

    return {
      success: true,
      duration,
      gameCount: games.length
    };
  } catch (error) {
    logScan('system', systemId, 'error', Date.now() - startTime, 0, error.message);
    throw error;
  }
}

/**
 * Log a scan operation
 */
function logScan(type, target, status, duration, gamesFound, errors = null) {
  try {
    const stmt = getDb().prepare(`
      INSERT INTO scan_log (type, target, status, duration_ms, games_found, errors)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(type, target, status, duration, gamesFound, errors);
  } catch (error) {
    console.error('Failed to log scan:', error.message);
  }
}

// Public API for getting data

/**
 * Get all systems
 * @param {boolean} accessibleOnly - Only return accessible systems
 * @returns {Array} Systems array
 */
function getSystems(accessibleOnly = false) {
  return accessibleOnly ? systemOps.getAccessible() : systemOps.getAll();
}

/**
 * Get a single system by ID
 * @param {string} id - System ID
 * @returns {Object|null} System object or null
 */
function getSystem(id) {
  return systemOps.getById(id) || systemOps.getByName(id);
}

/**
 * Get games for a system
 * @param {string} systemId - System ID
 * @param {Object} options - Query options
 * @returns {Object} Games with pagination info
 */
function getGames(systemId, options = {}) {
  const { page = 1, limit = 50, sortBy = 'name', order = 'asc' } = options;
  const config = loadConfig();
  const showHidden = config.showHiddenGames || false;

  const offset = (page - 1) * limit;
  const games = gameOps.getBySystem(systemId, {
    limit,
    offset,
    showHidden,
    sortBy,
    order
  });

  const totalCount = gameOps.getCount(systemId, showHidden);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    games,
    page,
    pageSize: limit,
    totalCount,
    totalPages
  };
}

/**
 * Get a single game by ID
 * @param {string} id - Game ID
 * @returns {Object|null} Game object or null
 */
function getGame(id) {
  return gameOps.getById(id);
}

/**
 * Search for games
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Matching games
 */
function searchGames(query, options = {}) {
  const config = loadConfig();
  return gameOps.search(query, {
    ...options,
    showHidden: config.showHiddenGames || false
  });
}

/**
 * Get favorite games
 * @returns {Array} Favorite games
 */
function getFavorites() {
  const config = loadConfig();
  return gameOps.getFavorites({ showHidden: config.showHiddenGames || false });
}

/**
 * Get recently played games
 * @param {number} days - Number of days to look back
 * @returns {Array} Recently played games
 */
function getRecentlyPlayed(days = 30) {
  return gameOps.getRecent(days);
}

/**
 * Get random game(s)
 * @param {string} systemId - Optional system filter
 * @param {number} count - Number of games
 * @returns {Array} Random games
 */
function getRandomGames(systemId = null, count = 1) {
  return gameOps.getRandom(systemId, count);
}

/**
 * Get scan status
 * @returns {Object} Scan status info
 */
function getScanStatus() {
  return {
    inProgress: scanInProgress,
    lastScan: lastScanTime
  };
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  const systems = systemOps.getAll();
  const totalGames = gameOps.getCount();
  const favorites = gameOps.getFavorites().length;

  return {
    systemCount: systems.length,
    accessibleSystemCount: systems.filter(s => s.accessible).length,
    totalGames,
    favorites,
    lastScan: lastScanTime,
    scanInProgress
  };
}

module.exports = {
  initCache,
  fullScan,
  scanSystem,
  getSystems,
  getSystem,
  getGames,
  getGame,
  searchGames,
  getFavorites,
  getRecentlyPlayed,
  getRandomGames,
  getScanStatus,
  getCacheStats
};
