/**
 * RetroWebLauncher - Search API Routes
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');

/**
 * GET /api/search
 * Search for games across all systems
 */
router.get('/', (req, res) => {
  try {
    const query = req.query.q || '';

    if (!query || query.length < 2) {
      return res.json({
        results: [],
        query,
        totalCount: 0
      });
    }

    const options = {
      limit: Math.min(parseInt(req.query.limit) || 50, 100),
      systemId: req.query.system || null
    };

    const games = cache.searchGames(query, options);

    // Group results by system
    const bySystem = {};
    for (const game of games) {
      if (!bySystem[game.systemId]) {
        bySystem[game.systemId] = [];
      }
      bySystem[game.systemId].push(game);
    }

    res.json({
      results: games,
      bySystem,
      query,
      totalCount: games.length
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
