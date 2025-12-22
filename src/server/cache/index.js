/**
 * RetroWebLauncher - Memory Cache Manager
 * In-memory cache for systems and games data
 * Data is loaded fresh from RetroBat XML files on each server start
 * Uses parallel processing for faster scanning
 */

const fs = require('fs');
const path = require('path');
const { parseSystems } = require('../retrobat/parser');
const { parseGamelist, parseGamelistFromFile, filterGames, sortGames } = require('../retrobat/gamelist');
const { loadConfig } = require('../config');
const { followSymlink } = require('../retrobat/paths');

// Local cache directory for gamelist.xml files (faster than network reads)
const GAMELIST_CACHE_DIR = path.join(__dirname, '..', '..', '..', 'data', 'gamelist-cache');

// Concurrency settings for parallel processing
const COPY_CONCURRENCY = 8;   // Parallel file copies (network I/O bound)
const PARSE_CONCURRENCY = 6;  // Parallel XML parsing (CPU + I/O bound)

/**
 * Run async tasks with limited concurrency
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max concurrent operations
 * @param {Function} task - Async function to run on each item
 * @returns {Array} Results from all tasks
 */
async function parallelLimit(items, concurrency, task) {
  const results = [];
  const executing = new Set();

  for (const [index, item] of items.entries()) {
    const promise = Promise.resolve().then(() => task(item, index));
    results.push(promise);
    executing.add(promise);

    const cleanup = () => executing.delete(promise);
    promise.then(cleanup, cleanup);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

/**
 * Clear the local gamelist cache directory
 */
function clearGamelistCache() {
  try {
    if (fs.existsSync(GAMELIST_CACHE_DIR)) {
      // Remove all files in the cache directory
      const files = fs.readdirSync(GAMELIST_CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(GAMELIST_CACHE_DIR, file));
      }
    } else {
      // Create the cache directory
      fs.mkdirSync(GAMELIST_CACHE_DIR, { recursive: true });
    }
    console.log('[Cache] Gamelist cache cleared');
  } catch (err) {
    console.error('[Cache] Error clearing gamelist cache:', err.message);
  }
}

/**
 * Copy gamelist.xml files from source directories to local cache (parallel)
 * @param {Array} systems - Array of system objects with paths
 * @returns {Map} Map of systemId -> cached file path
 */
async function cacheGamelists(systems) {
  const cachedPaths = new Map();
  let copied = 0;
  let skipped = 0;

  // Ensure cache directory exists
  if (!fs.existsSync(GAMELIST_CACHE_DIR)) {
    fs.mkdirSync(GAMELIST_CACHE_DIR, { recursive: true });
  }

  // Process systems in parallel with concurrency limit
  const results = await parallelLimit(systems, COPY_CONCURRENCY, async (system) => {
    try {
      const romPath = system.resolvedPath || system.path;
      const resolvedPath = followSymlink(romPath);
      const sourceGamelist = path.join(resolvedPath, 'gamelist.xml');

      // Check if gamelist.xml exists and is non-zero
      if (fs.existsSync(sourceGamelist)) {
        const stats = fs.statSync(sourceGamelist);
        if (stats.size > 0) {
          // Create unique filename using system ID
          const cachedFilename = `${system.id}.xml`;
          const cachedPath = path.join(GAMELIST_CACHE_DIR, cachedFilename);

          // Copy file to local cache (READ ONLY - never write back!)
          await fs.promises.copyFile(sourceGamelist, cachedPath);
          return { systemId: system.id, cachedPath, success: true };
        }
      }
      return { systemId: system.id, success: false };
    } catch (err) {
      // Silently skip systems with inaccessible gamelists
      return { systemId: system.id, success: false };
    }
  });

  // Collect results
  for (const result of results) {
    if (result.success) {
      cachedPaths.set(result.systemId, result.cachedPath);
      copied++;
    } else {
      skipped++;
    }
  }

  console.log(`[Cache] Copied ${copied} gamelists to local cache (${skipped} skipped) [${COPY_CONCURRENCY} parallel]`);
  return cachedPaths;
}

// Progress tracking removed - startup is fast enough now

// In-memory storage
let systemsMap = new Map();       // id -> system
let gamesMap = new Map();         // id -> game
let gamesBySystem = new Map();    // systemId -> [game, ...]
let allGames = [];                // flat array for search/filtering

let initialized = false;
let scanInProgress = false;
let lastScanTime = null;

/**
 * Initialize the cache system - performs fresh scan on startup
 */
async function initCache() {
  if (initialized) return;

  console.log('Initializing cache...');
  initialized = true;

  // Always do a fresh scan on startup
  console.log('No cached data found, performing initial scan...');
  await fullScan();
}

/**
 * Clear all in-memory data
 */
function clearCache() {
  systemsMap.clear();
  gamesMap.clear();
  gamesBySystem.clear();
  allGames = [];
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
    console.log('Starting library scan...');

    // Parse systems from es_systems.cfg
    const systems = await parseSystems();
    console.log(`Found ${systems.length} systems`);

    // Clear existing data and gamelist cache
    clearCache();
    clearGamelistCache();

    // Get accessible systems
    const accessibleSystems = systems.filter(s => s.accessible);

    // Copy gamelists from network to local cache (parallel)
    const cachedGamelists = await cacheGamelists(accessibleSystems);

    // Build a map of system ID to system object for quick lookup
    const systemMap = new Map();
    for (const system of systems) {
      systemMap.set(system.id, system);
    }

    // ONLY process systems that have cached gamelists (have games)
    const systemsWithGames = Array.from(cachedGamelists.keys());
    let totalGames = 0;

    console.log(`Parsing ${systemsWithGames.length} gamelists (${PARSE_CONCURRENCY} parallel)...`);

    // Parse gamelists in parallel from LOCAL CACHE (not network!)
    const parseResults = await parallelLimit(systemsWithGames, PARSE_CONCURRENCY, async (systemId) => {
      const system = systemMap.get(systemId);
      const cachedPath = cachedGamelists.get(systemId);

      try {
        // Parse from LOCAL CACHE only - never reads from network
        const games = await parseGamelistFromFile(cachedPath, system.resolvedPath || system.path, system.id);
        return { systemId, system, games, success: true };
      } catch (error) {
        console.error(`Error scanning ${system.id}:`, error.message);
        return { systemId, system, games: [], success: false };
      }
    });

    // Collect results into memory structures (must be sequential to avoid race conditions)
    for (const result of parseResults) {
      const { systemId, system, games, success } = result;

      if (success && games.length > 0) {
        const systemGames = [];
        for (const game of games) {
          gamesMap.set(game.id, game);
          systemGames.push(game);
          allGames.push(game);
        }
        gamesBySystem.set(systemId, systemGames);
        system.gameCount = games.length;
        totalGames += games.length;
        console.log(`  ${systemId}: ${games.length} games`);
      } else {
        system.gameCount = 0;
        gamesBySystem.set(systemId, []);
      }
      systemsMap.set(systemId, system);
    }

    // Store systems without games (not in cache) with gameCount = 0
    for (const system of systems) {
      if (!cachedGamelists.has(system.id)) {
        system.gameCount = 0;
        systemsMap.set(system.id, system);
        gamesBySystem.set(system.id, []);
      }
    }

    const duration = Date.now() - startTime;
    lastScanTime = new Date();

    console.log(`Scan complete: ${totalGames} games from ${accessibleSystems.length} systems in ${duration}ms`);

    return {
      success: true,
      duration,
      systemCount: systems.length,
      accessibleSystemCount: accessibleSystems.length,
      gameCount: totalGames
    };
  } catch (error) {
    console.error('Scan failed:', error);
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

  const system = systemsMap.get(systemId);
  if (!system) {
    throw new Error(`System not found: ${systemId}`);
  }

  try {
    // Remove existing games for this system from allGames
    const oldGames = gamesBySystem.get(systemId) || [];
    for (const game of oldGames) {
      gamesMap.delete(game.id);
    }
    allGames = allGames.filter(g => g.systemId !== systemId);

    // Parse gamelist
    const games = await parseGamelist(system.resolvedPath || system.path, system.id);

    // Store new games
    const systemGames = [];
    for (const game of games) {
      gamesMap.set(game.id, game);
      systemGames.push(game);
      allGames.push(game);
    }
    gamesBySystem.set(systemId, systemGames);

    // Update system game count
    system.gameCount = games.length;
    systemsMap.set(systemId, system);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      gameCount: games.length
    };
  } catch (error) {
    throw error;
  }
}

// Public API for getting data

/**
 * Get all systems
 * @param {boolean} accessibleOnly - Only return accessible systems
 * @returns {Array} Systems array
 */
function getSystems(accessibleOnly = false) {
  const systems = Array.from(systemsMap.values());
  if (accessibleOnly) {
    return systems.filter(s => s.accessible);
  }
  return systems.sort((a, b) => (a.fullname || a.name).localeCompare(b.fullname || b.name));
}

/**
 * Get a single system by ID
 * @param {string} id - System ID
 * @returns {Object|null} System object or null
 */
function getSystem(id) {
  // Try direct lookup first
  let system = systemsMap.get(id);
  if (system) return system;

  // Try case-insensitive match
  for (const [key, sys] of systemsMap) {
    if (key.toLowerCase() === id.toLowerCase() || sys.name.toLowerCase() === id.toLowerCase()) {
      return sys;
    }
  }
  return null;
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

  let games = gamesBySystem.get(systemId) || [];

  // Filter hidden if needed
  if (!showHidden) {
    games = games.filter(g => !g.hidden);
  }

  // Sort
  games = sortGames(games, sortBy, order);

  // Paginate
  const totalCount = games.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const pagedGames = games.slice(offset, offset + limit);

  return {
    games: pagedGames,
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
  return gamesMap.get(id) || null;
}

/**
 * Search for games
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Matching games
 */
function searchGames(query, options = {}) {
  const { limit = 50, systemId = null } = options;
  const config = loadConfig();
  const showHidden = config.showHiddenGames || false;

  const searchLower = query.toLowerCase();

  let results = allGames.filter(game => {
    // Filter by system if specified
    if (systemId && game.systemId !== systemId) {
      return false;
    }

    // Filter hidden
    if (!showHidden && game.hidden) {
      return false;
    }

    // Search in name, description, genre, developer, publisher
    return (
      game.name.toLowerCase().includes(searchLower) ||
      (game.description && game.description.toLowerCase().includes(searchLower)) ||
      (game.genre && game.genre.toLowerCase().includes(searchLower)) ||
      (game.developer && game.developer.toLowerCase().includes(searchLower)) ||
      (game.publisher && game.publisher.toLowerCase().includes(searchLower))
    );
  });

  // Sort by relevance (name match first, then alphabetically)
  results.sort((a, b) => {
    const aNameMatch = a.name.toLowerCase().includes(searchLower);
    const bNameMatch = b.name.toLowerCase().includes(searchLower);
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}

/**
 * Get favorite games
 * @returns {Array} Favorite games
 */
function getFavorites() {
  const config = loadConfig();
  const showHidden = config.showHiddenGames || false;

  return allGames
    .filter(g => g.favorite && (showHidden || !g.hidden))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get recently played games
 * @param {number} days - Number of days to look back
 * @returns {Array} Recently played games
 */
function getRecentlyPlayed(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return allGames
    .filter(g => g.lastPlayed && g.lastPlayed >= cutoff)
    .sort((a, b) => b.lastPlayed - a.lastPlayed);
}

/**
 * Get random game(s)
 * @param {string} systemId - Optional system filter
 * @param {number} count - Number of games
 * @returns {Array} Random games
 */
function getRandomGames(systemId = null, count = 1) {
  const config = loadConfig();
  const showHidden = config.showHiddenGames || false;

  let pool = systemId ? (gamesBySystem.get(systemId) || []) : allGames;

  if (!showHidden) {
    pool = pool.filter(g => !g.hidden);
  }

  if (pool.length === 0) return [];

  // Fisher-Yates shuffle for random selection
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
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
  const systems = Array.from(systemsMap.values());
  const favorites = allGames.filter(g => g.favorite).length;

  return {
    systemCount: systems.length,
    accessibleSystemCount: systems.filter(s => s.accessible).length,
    totalGames: allGames.length,
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
