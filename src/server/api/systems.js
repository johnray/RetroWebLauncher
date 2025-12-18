/**
 * RetroWebLauncher - Systems API Routes
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');

/**
 * GET /api/systems
 * List all systems with game counts
 */
router.get('/', (req, res) => {
  try {
    const accessibleOnly = req.query.accessible !== 'false';
    const systems = cache.getSystems(accessibleOnly);

    // Format for response
    const formatted = systems.map(s => ({
      id: s.id,
      name: s.name,
      fullname: s.fullname,
      manufacturer: s.manufacturer,
      release: s.release,
      hardware: s.hardware,
      platform: s.platform,
      theme: s.theme,
      gameCount: s.gameCount,
      accessible: s.accessible
    }));

    res.json({
      systems: formatted,
      totalCount: formatted.length
    });
  } catch (error) {
    console.error('Error getting systems:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/systems/:id
 * Get a single system by ID
 */
router.get('/:id', (req, res) => {
  try {
    const system = cache.getSystem(req.params.id);

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    res.json(system);
  } catch (error) {
    console.error('Error getting system:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/systems/:id/games
 * Get games for a system with pagination
 */
router.get('/:id/games', (req, res) => {
  try {
    const system = cache.getSystem(req.params.id);

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 50, 200),
      sortBy: req.query.sort || 'name',
      order: req.query.order || 'asc'
    };

    const result = cache.getGames(system.id, options);

    res.json({
      system: {
        id: system.id,
        name: system.name,
        fullname: system.fullname
      },
      games: result.games,
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/systems/:id/rescan
 * Rescan a single system
 */
router.post('/:id/rescan', async (req, res) => {
  try {
    const result = await cache.scanSystem(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error rescanning system:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
