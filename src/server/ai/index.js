/**
 * RetroWebLauncher - AI Module
 * Optional AI features for natural language search and smart collections
 * Disabled by default - enable in config
 */

const config = require('../config');

// Provider implementations
let provider = null;

/**
 * Initialize AI module if enabled
 */
async function init() {
  const aiConfig = config.get('ai');

  if (!aiConfig?.enabled) {
    console.log('AI features disabled');
    return false;
  }

  const providerName = aiConfig.provider || 'ollama';

  try {
    switch (providerName) {
      case 'ollama':
        provider = require('./providers/ollama');
        break;
      case 'openai':
        provider = require('./providers/openai');
        break;
      default:
        console.warn(`Unknown AI provider: ${providerName}`);
        return false;
    }

    await provider.init(aiConfig);
    console.log(`AI initialized with provider: ${providerName}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize AI:', error.message);
    provider = null;
    return false;
  }
}

/**
 * Check if AI is available
 */
function isAvailable() {
  return provider !== null;
}

/**
 * Parse natural language search query into structured filters
 * @param {string} query - User's natural language query
 * @returns {Object} Structured search filters
 *
 * Example inputs:
 * - "2 player games from the 90s"
 * - "racing games on snes"
 * - "hidden gems on genesis"
 * - "best shooters"
 */
async function parseSearchQuery(query) {
  if (!provider) {
    return { text: query }; // Fallback to basic text search
  }

  try {
    return await provider.parseSearchQuery(query);
  } catch (error) {
    console.error('AI search parsing failed:', error.message);
    return { text: query };
  }
}

/**
 * Generate smart collection suggestions
 * @param {Array} games - Array of game objects
 * @returns {Array} Suggested collections
 */
async function suggestCollections(games) {
  if (!provider) {
    return [];
  }

  try {
    return await provider.suggestCollections(games);
  } catch (error) {
    console.error('AI collection suggestion failed:', error.message);
    return [];
  }
}

/**
 * Get similar games based on a reference game
 * @param {Object} game - Reference game
 * @param {Array} allGames - Pool of games to search
 * @param {number} limit - Max results
 * @returns {Array} Similar games
 */
async function findSimilarGames(game, allGames, limit = 10) {
  if (!provider) {
    return [];
  }

  try {
    return await provider.findSimilarGames(game, allGames, limit);
  } catch (error) {
    console.error('AI similar games failed:', error.message);
    return [];
  }
}

/**
 * Generate a game description/summary
 * @param {Object} game - Game object
 * @returns {string} Generated description
 */
async function generateDescription(game) {
  if (!provider) {
    return null;
  }

  try {
    return await provider.generateDescription(game);
  } catch (error) {
    console.error('AI description generation failed:', error.message);
    return null;
  }
}

module.exports = {
  init,
  isAvailable,
  parseSearchQuery,
  suggestCollections,
  findSimilarGames,
  generateDescription
};
