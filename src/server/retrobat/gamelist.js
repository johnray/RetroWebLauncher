/**
 * RetroWebLauncher - Gamelist Parser
 * Parses gamelist.xml files for each system
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { resolveGamePath, resolveMediaPath, isFileAccessible, pathToId, followSymlink } = require('./paths');
const { loadConfig } = require('../config');

/**
 * Parse a gamelist.xml file for a system
 * @param {string} romPath - Path to the ROM directory
 * @param {string} systemName - Name of the system
 * @returns {Promise<Array>} Array of game objects
 */
async function parseGamelist(romPath, systemName) {
  // Follow symlink to get real path
  const resolvedPath = followSymlink(romPath);
  const gamelistPath = path.join(resolvedPath, 'gamelist.xml');

  if (!fs.existsSync(gamelistPath)) {
    return [];
  }

  const config = loadConfig();
  const showHidden = config.showHiddenGames || false;

  let xmlContent;
  try {
    xmlContent = fs.readFileSync(gamelistPath, 'utf-8');
  } catch (err) {
    console.error(`Error reading gamelist for ${systemName}:`, err.message);
    return [];
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => {
      return ['game', 'folder', 'scrap'].includes(name);
    },
    commentPropName: false,
  });

  let result;
  try {
    result = parser.parse(xmlContent);
  } catch (err) {
    console.error(`Error parsing gamelist XML for ${systemName}:`, err.message);
    return [];
  }

  if (!result.gameList || !result.gameList.game) {
    return [];
  }

  const games = [];

  for (const gameData of result.gameList.game) {
    try {
      const game = parseGameEntry(gameData, resolvedPath, systemName);
      if (game) {
        // Filter hidden games unless showHidden is enabled
        if (game.hidden && !showHidden) {
          continue;
        }
        games.push(game);
      }
    } catch (err) {
      console.error(`Error parsing game entry in ${systemName}:`, err.message);
      // Continue with other games
    }
  }

  return games;
}

/**
 * Parse a single game entry
 * @param {Object} gameData - Raw game object from XML
 * @param {string} romDir - ROM directory path
 * @param {string} systemName - System name
 * @returns {Object|null} Parsed game object or null if invalid
 */
function parseGameEntry(gameData, romDir, systemName) {
  if (!gameData.path) {
    return null;
  }

  const gamePath = gameData.path;
  const fullPath = resolveGamePath(gamePath, romDir);
  const name = gameData.name || path.basename(gamePath, path.extname(gamePath));

  // Generate a unique ID from system and path
  const id = `${systemName}_${pathToId(gamePath)}`;

  // Parse media paths
  const imagePath = gameData.image ? resolveMediaPath(gameData.image, romDir) : '';
  const thumbnailPath = gameData.thumbnail ? resolveMediaPath(gameData.thumbnail, romDir) : '';
  const videoPath = gameData.video ? resolveMediaPath(gameData.video, romDir) : '';
  const marqueePath = gameData.marquee ? resolveMediaPath(gameData.marquee, romDir) : '';
  const fanartPath = gameData.fanart ? resolveMediaPath(gameData.fanart, romDir) : '';
  const manualPath = gameData.manual ? resolveMediaPath(gameData.manual, romDir) : '';

  // Parse release date (format: YYYYMMDDTHHMMSS)
  const releaseDate = parseDate(gameData.releasedate);

  // Parse last played date
  const lastPlayed = parseDate(gameData.lastplayed);

  // Parse rating (0.0 to 1.0, but some files use 0-5)
  let rating = parseFloat(gameData.rating) || 0;
  if (rating > 1) {
    rating = rating / 5; // Normalize to 0-1
  }

  // Parse boolean fields
  const hidden = parseBool(gameData.hidden);
  const favorite = parseBool(gameData.favorite);
  const kidGame = parseBool(gameData.kidgame);

  return {
    id: id,
    systemId: systemName,
    path: gamePath,
    fullPath: fullPath,
    name: name,
    description: gameData.desc || '',
    developer: gameData.developer || '',
    publisher: gameData.publisher || '',
    releaseDate: releaseDate,
    releaseYear: releaseDate ? releaseDate.getFullYear() : null,
    genre: gameData.genre || '',
    players: parsePlayersString(gameData.players),
    playersString: gameData.players || '',
    rating: rating,
    playCount: parseInt(gameData.playcount) || 0,
    lastPlayed: lastPlayed,
    gameTime: parseInt(gameData.gametime) || 0, // minutes
    hidden: hidden,
    favorite: favorite,
    kidGame: kidGame,
    lang: gameData.lang || '',
    hash: gameData.md5 || '',

    // Media paths
    image: imagePath,
    thumbnail: thumbnailPath,
    video: videoPath,
    marquee: marqueePath,
    fanart: fanartPath,
    manual: manualPath,

    // File info
    fileExists: isFileAccessible(fullPath)
  };
}

/**
 * Parse a date string in format YYYYMMDDTHHMMSS
 * @param {string} dateStr - Date string
 * @returns {Date|null} Parsed date or null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Format: YYYYMMDDTHHMMSS
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
    if (match) {
      const [, year, month, day, hour, min, sec] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      );
    }

    // Try simple year format
    if (/^\d{4}$/.test(dateStr)) {
      return new Date(parseInt(dateStr), 0, 1);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a boolean value from XML (string "true"/"false" or empty)
 * @param {string|boolean} value - Value to parse
 * @returns {boolean}
 */
function parseBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
}

/**
 * Parse players string like "1", "1-2", "1-4", etc.
 * @param {string} playersStr - Players string
 * @returns {Object} { min: number, max: number }
 */
function parsePlayersString(playersStr) {
  if (!playersStr) return { min: 1, max: 1 };

  const match = playersStr.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (match) {
    const min = parseInt(match[1]) || 1;
    const max = parseInt(match[2]) || min;
    return { min, max };
  }

  return { min: 1, max: 1 };
}

/**
 * Get game count for a system
 * @param {string} romPath - Path to ROM directory
 * @returns {Promise<number>} Number of games
 */
async function getGameCount(romPath) {
  const games = await parseGamelist(romPath, 'temp');
  return games.length;
}

/**
 * Get games filtered by various criteria
 * @param {Array} games - Array of game objects
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered games
 */
function filterGames(games, filters = {}) {
  let result = [...games];

  // Filter by favorites
  if (filters.favoritesOnly) {
    result = result.filter(g => g.favorite);
  }

  // Filter by kid-friendly
  if (filters.kidFriendly) {
    result = result.filter(g => g.kidGame);
  }

  // Filter by genre
  if (filters.genre) {
    const genre = filters.genre.toLowerCase();
    result = result.filter(g => g.genre.toLowerCase().includes(genre));
  }

  // Filter by year range
  if (filters.yearMin) {
    result = result.filter(g => g.releaseYear && g.releaseYear >= filters.yearMin);
  }
  if (filters.yearMax) {
    result = result.filter(g => g.releaseYear && g.releaseYear <= filters.yearMax);
  }

  // Filter by min players
  if (filters.minPlayers) {
    result = result.filter(g => g.players.max >= filters.minPlayers);
  }

  // Filter by max players
  if (filters.maxPlayers) {
    result = result.filter(g => g.players.min <= filters.maxPlayers);
  }

  // Filter by min rating
  if (filters.minRating) {
    result = result.filter(g => g.rating >= filters.minRating);
  }

  // Filter by developer
  if (filters.developer) {
    const dev = filters.developer.toLowerCase();
    result = result.filter(g => g.developer.toLowerCase().includes(dev));
  }

  // Filter by publisher
  if (filters.publisher) {
    const pub = filters.publisher.toLowerCase();
    result = result.filter(g => g.publisher.toLowerCase().includes(pub));
  }

  // Text search
  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(g =>
      g.name.toLowerCase().includes(search) ||
      g.description.toLowerCase().includes(search) ||
      g.genre.toLowerCase().includes(search) ||
      g.developer.toLowerCase().includes(search) ||
      g.publisher.toLowerCase().includes(search)
    );
  }

  return result;
}

/**
 * Sort games by various criteria
 * @param {Array} games - Array of game objects
 * @param {string} sortBy - Field to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted games
 */
function sortGames(games, sortBy = 'name', order = 'asc') {
  const result = [...games];
  const multiplier = order === 'desc' ? -1 : 1;

  result.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'year':
        aVal = a.releaseYear || 0;
        bVal = b.releaseYear || 0;
        break;
      case 'rating':
        aVal = a.rating;
        bVal = b.rating;
        break;
      case 'playCount':
        aVal = a.playCount;
        bVal = b.playCount;
        break;
      case 'lastPlayed':
        aVal = a.lastPlayed ? a.lastPlayed.getTime() : 0;
        bVal = b.lastPlayed ? b.lastPlayed.getTime() : 0;
        break;
      case 'gameTime':
        aVal = a.gameTime;
        bVal = b.gameTime;
        break;
      case 'random':
        return Math.random() - 0.5;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }

    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });

  return result;
}

module.exports = {
  parseGamelist,
  getGameCount,
  filterGames,
  sortGames
};
