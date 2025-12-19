/**
 * RetroWebLauncher - Config API Routes
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const { loadConfig, updateConfig, validateConfig } = require('../config');
const cache = require('../cache');

/**
 * GET /api/config
 * Get current configuration (sensitive data masked)
 */
router.get('/', (req, res) => {
  try {
    const config = loadConfig();

    // Mask sensitive data
    const safeConfig = { ...config };
    if (safeConfig.authentication?.pin) {
      safeConfig.authentication = { ...safeConfig.authentication, pin: '****' };
    }
    if (safeConfig.ai?.apiKey) {
      safeConfig.ai = { ...safeConfig.ai, apiKey: safeConfig.ai.apiKey ? '****' : '' };
    }

    res.json({ config: safeConfig });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/config
 * Update configuration
 */
router.put('/', (req, res) => {
  try {
    const updates = req.body;

    // Don't allow changing sensitive fields via API
    delete updates.authentication?.pin;
    delete updates.ai?.apiKey;

    const newConfig = updateConfig(updates);

    // Validate the new config
    const validation = validateConfig(newConfig);

    res.json({
      success: true,
      config: newConfig,
      valid: validation.valid,
      errors: validation.errors
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/network
 * Get network info (IP addresses, URLs)
 */
router.get('/network', (req, res) => {
  try {
    const config = loadConfig();
    const port = config.port || 3000;

    // Get local IP addresses
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal and non-IPv4 addresses
        if (iface.internal || iface.family !== 'IPv4') continue;
        addresses.push(iface.address);
      }
    }

    // Use the first non-localhost IP, or localhost as fallback
    const ip = addresses[0] || '127.0.0.1';
    const url = `http://${ip}:${port}`;

    res.json({
      url,
      ip,
      port,
      allAddresses: addresses
    });
  } catch (error) {
    console.error('Error getting network info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get cache and library statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = cache.getCacheStats();
    const config = loadConfig();

    res.json({
      ...stats,
      arcadeName: config.arcadeName,
      theme: config.theme,
      aiEnabled: config.ai?.enabled || false
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/library/rescan
 * Trigger a full library rescan
 */
router.post('/library/rescan', async (req, res) => {
  try {
    // Start scan in background
    cache.fullScan().catch(err => {
      console.error('Background scan failed:', err);
    });

    res.json({
      success: true,
      message: 'Library scan started'
    });
  } catch (error) {
    console.error('Error starting rescan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/library/status
 * Get library scan status
 */
router.get('/library/status', (req, res) => {
  try {
    const status = cache.getScanStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting scan status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
