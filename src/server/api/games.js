/**
 * RetroWebLauncher - Games API Routes
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');
const launcher = require('../retrobat/launcher');

/**
 * GET /api/games/list/favorites
 * Get favorite games
 * NOTE: This route MUST come before /:id to avoid 'list' being matched as an id
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
 * GET /api/games/list/recent
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
 * GET /api/games/list/random
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
    const gameId = req.params.id;

    // Validate game ID
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const game = cache.getGame(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Validate game file exists
    if (!game.fullPath) {
      return res.status(400).json({ error: 'Game file path not available' });
    }

    const options = {
      emulator: req.body.emulator || null,
      core: req.body.core || null
    };

    const result = await launcher.launchGame(game, options);

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('game:launched', { gameId: game.id, gameName: game.name });
    }

    res.json(result);
  } catch (error) {
    console.error('Error launching game:', error);
    res.status(500).json({ error: error.message || 'Failed to launch game' });
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
