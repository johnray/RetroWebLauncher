/**
 * RetroWebLauncher - Collections API Routes
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getRetrobatPaths, loadConfig } = require('../config');
const cache = require('../cache');

/**
 * GET /api/collections
 * List all collections
 */
router.get('/', (req, res) => {
  try {
    const collections = getAllCollections();
    res.json({
      collections,
      totalCount: collections.length
    });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/collections/:id
 * Get games in a collection
 */
router.get('/:id', (req, res) => {
  try {
    const collectionId = req.params.id;
    const collection = getCollection(collectionId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (error) {
    console.error('Error getting collection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all available collections
 * Includes both static (file-based) and dynamic collections
 */
function getAllCollections() {
  const collections = [];

  // Add dynamic collections (built-in)
  collections.push(
    {
      id: 'favorites',
      name: 'Favorites',
      type: 'dynamic',
      icon: 'heart',
      gameCount: cache.getFavorites().length
    },
    {
      id: 'recent',
      name: 'Recently Played',
      type: 'dynamic',
      icon: 'clock',
      gameCount: cache.getRecentlyPlayed(30).length
    }
  );

  // Read static collections from Retrobat
  const paths = getRetrobatPaths();
  const collectionsDir = paths.collections;

  if (fs.existsSync(collectionsDir)) {
    const files = fs.readdirSync(collectionsDir);

    for (const file of files) {
      if (file.endsWith('.cfg')) {
        const name = path.basename(file, '.cfg');
        const filePath = path.join(collectionsDir, file);

        // Count games in collection
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        collections.push({
          id: `custom_${name.toLowerCase().replace(/\s+/g, '_')}`,
          name: name,
          type: 'static',
          icon: 'folder',
          gameCount: lines.length,
          filePath: filePath
        });
      }
    }
  }

  return collections;
}

/**
 * Get a specific collection with its games
 */
function getCollection(collectionId) {
  // Handle dynamic collections
  if (collectionId === 'favorites') {
    const games = cache.getFavorites();
    return {
      id: 'favorites',
      name: 'Favorites',
      type: 'dynamic',
      games,
      gameCount: games.length
    };
  }

  if (collectionId === 'recent') {
    const games = cache.getRecentlyPlayed(30);
    return {
      id: 'recent',
      name: 'Recently Played',
      type: 'dynamic',
      games,
      gameCount: games.length
    };
  }

  // Handle static collections
  if (collectionId.startsWith('custom_')) {
    const name = collectionId.replace('custom_', '').replace(/_/g, ' ');
    const paths = getRetrobatPaths();
    const collectionsDir = paths.collections;

    // Find the collection file
    const files = fs.readdirSync(collectionsDir);
    for (const file of files) {
      if (file.endsWith('.cfg')) {
        const collName = path.basename(file, '.cfg');
        if (collName.toLowerCase().replace(/\s+/g, '_') === collectionId.replace('custom_', '')) {
          const filePath = path.join(collectionsDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());

          // TODO: Match lines to cached games
          // For now, just return the count
          return {
            id: collectionId,
            name: collName,
            type: 'static',
            games: [], // Would need to match ROM paths to cached games
            gameCount: lines.length
          };
        }
      }
    }
  }

  return null;
}

module.exports = router;
