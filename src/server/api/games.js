/**
 * RetroWebLauncher - Games API Routes
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');
const launcher = require('../retrobat/launcher');

/**
 * GET /api/games/:id
 * Get a single game by ID
 */
router.get('/:id', (req, res) => {
  try {
    const game = cache.getGame(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get the system info too
    const system = cache.getSystem(game.systemId);

    res.json({
      ...game,
      system: system ? {
        id: system.id,
        name: system.name,
        fullname: system.fullname
      } : null
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/games/:id/launch
 * Launch a game
 */
router.post('/:id/launch', async (req, res) => {
  try {
    const game = cache.getGame(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const options = {
      emulator: req.body.emulator,
      core: req.body.core
    };

    const result = await launcher.launchGame(game, options);

    res.json(result);
  } catch (error) {
    console.error('Error launching game:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/favorites
 * Get favorite games
 */
router.get('/list/favorites', (req, res) => {
  try {
    const games = cache.getFavorites();
    res.json({
      games,
      totalCount: games.length
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/recent
 * Get recently played games
 */
router.get('/list/recent', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const games = cache.getRecentlyPlayed(days);
    res.json({
      games,
      totalCount: games.length
    });
  } catch (error) {
    console.error('Error getting recent games:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/random
 * Get random game(s)
 */
router.get('/list/random', (req, res) => {
  try {
    const systemId = req.query.system || null;
    const count = Math.min(parseInt(req.query.count) || 1, 10);
    const games = cache.getRandomGames(systemId, count);
    res.json({
      games,
      totalCount: games.length
    });
  } catch (error) {
    console.error('Error getting random games:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/games/:id/favorite
 * Toggle favorite status for a game
 */
router.post('/:id/favorite', (req, res) => {
  try {
    const game = cache.getGame(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Toggle favorite status in database
    const { gameOps } = require('../cache/database');
    const db = require('../cache/database').getDb();

    const newStatus = game.favorite ? 0 : 1;
    const stmt = db.prepare('UPDATE games SET favorite = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?');
    stmt.run(newStatus, req.params.id);

    res.json({
      success: true,
      gameId: req.params.id,
      favorite: newStatus === 1
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
