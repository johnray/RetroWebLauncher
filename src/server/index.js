/**
 * RetroWebLauncher - Main Server Entry Point
 * A modern web-based frontend for Retrobat
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { loadConfig, validateConfig, getRetrobatPaths } = require('./config');
const cache = require('./cache');

// API Routes
const systemsRouter = require('./api/systems');
const gamesRouter = require('./api/games');
const searchRouter = require('./api/search');
const collectionsRouter = require('./api/collections');
const mediaRouter = require('./api/media');
const configRouter = require('./api/config');

// Load configuration
const config = loadConfig();
const validation = validateConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
  console.error('\nPlease update rwl.config.json and restart.');
}

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// API Routes
app.use('/api/systems', systemsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/search', searchRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/config', configRouter);

// Status endpoint
app.get('/api/status', (req, res) => {
  const paths = getRetrobatPaths();
  const stats = cache.getCacheStats();

  res.json({
    status: 'ok',
    version: '1.0.0',
    arcadeName: config.arcadeName,
    configValid: validation.valid,
    configErrors: validation.errors,
    paths: {
      retrobat: paths.root,
      configured: !!config.retrobatPath
    },
    library: {
      systems: stats.systemCount,
      games: stats.totalGames,
      lastScan: stats.lastScan
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial status
  const stats = cache.getCacheStats();
  socket.emit('status', {
    connected: true,
    arcadeName: config.arcadeName,
    version: '1.0.0',
    library: {
      systems: stats.systemCount,
      games: stats.totalGames
    }
  });

  // Handle library rescan request
  socket.on('library:rescan', async () => {
    console.log('Library rescan requested');
    try {
      const result = await cache.fullScan((progress) => {
        socket.emit('library:progress', progress);
      });
      io.emit('library:updated', result);
    } catch (error) {
      socket.emit('library:error', { message: error.message });
    }
  });

  // Handle game launch request
  socket.on('game:launch', async (data) => {
    const { gameId, options } = data;
    try {
      const game = cache.getGame(gameId);
      if (!game) {
        socket.emit('game:error', { message: 'Game not found' });
        return;
      }

      const launcher = require('./retrobat/launcher');
      const result = await launcher.launchGame(game, options);
      io.emit('game:launched', result);
    } catch (error) {
      socket.emit('game:error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Initialize cache and start server
async function start() {
  try {
    console.log('Initializing cache...');
    await cache.initCache();

    const PORT = config.port || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('=========================================');
      console.log(`  ${config.arcadeName}`);
      console.log('  RetroWebLauncher v1.0.0');
      console.log('=========================================');
      console.log('');
      console.log(`  Server running at:`);
      console.log(`  http://localhost:${PORT}`);
      console.log('');

      const stats = cache.getCacheStats();
      console.log(`  Library: ${stats.totalGames} games in ${stats.systemCount} systems`);
      console.log('');

      if (!validation.valid) {
        console.log('  WARNING: Configuration has errors');
        console.log('  Run setup or edit rwl.config.json');
        console.log('');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  const { closeDatabase } = require('./cache/database');
  closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  const { closeDatabase } = require('./cache/database');
  closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
start();

module.exports = { app, server, io };
