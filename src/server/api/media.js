/**
 * RetroWebLauncher - Media API Routes
 * Serves images, videos, and manuals from ROM directories
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const cache = require('../cache');
const { followSymlink } = require('../retrobat/paths');

// MIME types for media files
const MIME_TYPES = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',

  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',

  // Documents
  '.pdf': 'application/pdf'
};

/**
 * Validate that a path is within allowed directories
 * @param {string} requestedPath - Requested file path
 * @param {string} basePath - Base directory path
 * @returns {boolean}
 */
function isPathSafe(requestedPath, basePath) {
  const resolved = path.resolve(requestedPath);
  const base = path.resolve(basePath);
  return resolved.startsWith(base);
}

/**
 * GET /api/media/image/:systemId/*
 * Serve an image file
 */
router.get('/image/:systemId/*', (req, res) => {
  serveMedia(req, res, 'image');
});

/**
 * GET /api/media/video/:systemId/*
 * Serve a video file with range request support
 */
router.get('/video/:systemId/*', (req, res) => {
  serveMedia(req, res, 'video');
});

/**
 * GET /api/media/manual/:systemId/*
 * Serve a PDF manual
 */
router.get('/manual/:systemId/*', (req, res) => {
  serveMedia(req, res, 'manual');
});

/**
 * Generic media serving function
 */
function serveMedia(req, res, type) {
  try {
    const systemId = req.params.systemId;
    const filePath = req.params[0];

    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    // Get system to find ROM path
    const system = cache.getSystem(systemId);
    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Resolve the full path
    const basePath = followSymlink(system.resolvedPath || system.path);
    const fullPath = path.join(basePath, decodeURIComponent(filePath));

    // Security check - ensure path is within system directory
    if (!isPathSafe(fullPath, basePath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.setHeader('Content-Type', mimeType);

    // Handle range requests for video streaming
    if (type === 'video' && req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);

      const stream = fs.createReadStream(fullPath, { start, end });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(fullPath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/media/game/:gameId/:type
 * Get media for a specific game by type
 */
router.get('/game/:gameId/:type', (req, res) => {
  try {
    const { gameId, type } = req.params;

    const game = cache.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get the appropriate media path
    let mediaPath;
    switch (type) {
      case 'image':
        mediaPath = game.image;
        break;
      case 'thumbnail':
        mediaPath = game.thumbnail || game.image;
        break;
      case 'video':
        mediaPath = game.video;
        break;
      case 'marquee':
        mediaPath = game.marquee;
        break;
      case 'fanart':
        mediaPath = game.fanart;
        break;
      case 'manual':
        mediaPath = game.manual;
        break;
      default:
        return res.status(400).json({ error: 'Invalid media type' });
    }

    if (!mediaPath) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Check if file exists
    if (!fs.existsSync(mediaPath)) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const stat = fs.statSync(mediaPath);
    const ext = path.extname(mediaPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);

    // Handle range requests for video
    if (type === 'video' && req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);

      const stream = fs.createReadStream(mediaPath, { start, end });
      stream.pipe(res);
    } else {
      fs.createReadStream(mediaPath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving game media:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
