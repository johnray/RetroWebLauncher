/**
 * RetroWebLauncher - Database Module
 * SQLite database for caching systems and games data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'rwl.db');

let db = null;

/**
 * Initialize the database connection and create tables
 * @returns {Database} Database instance
 */
function initDatabase() {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Create tables
  createTables();

  return db;
}

/**
 * Create database tables
 */
function createTables() {
  // Systems table
  db.exec(`
    CREATE TABLE IF NOT EXISTS systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fullname TEXT,
      manufacturer TEXT,
      release TEXT,
      hardware TEXT,
      path TEXT NOT NULL,
      resolved_path TEXT,
      extensions TEXT,
      platform TEXT,
      theme TEXT,
      accessible INTEGER DEFAULT 1,
      game_count INTEGER DEFAULT 0,
      last_scanned INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Games table
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      path TEXT NOT NULL,
      full_path TEXT,
      name TEXT NOT NULL,
      description TEXT,
      developer TEXT,
      publisher TEXT,
      release_date TEXT,
      release_year INTEGER,
      genre TEXT,
      players_min INTEGER DEFAULT 1,
      players_max INTEGER DEFAULT 1,
      players_string TEXT,
      rating REAL DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      last_played INTEGER,
      game_time INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      kid_game INTEGER DEFAULT 0,
      lang TEXT,
      hash TEXT,
      image TEXT,
      thumbnail TEXT,
      video TEXT,
      marquee TEXT,
      fanart TEXT,
      manual TEXT,
      file_exists INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (system_id) REFERENCES systems(id)
    )
  `);

  // Collections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'static',
      query TEXT,
      game_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Collection games junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collection_games (
      collection_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      added_at INTEGER DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (collection_id, game_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);

  // Scan log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      target TEXT,
      status TEXT,
      duration_ms INTEGER,
      games_found INTEGER,
      errors TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_system ON games(system_id);
    CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
    CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(favorite);
    CREATE INDEX IF NOT EXISTS idx_games_hidden ON games(hidden);
    CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played);
    CREATE INDEX IF NOT EXISTS idx_games_play_count ON games(play_count);
    CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating);
    CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
    CREATE INDEX IF NOT EXISTS idx_games_year ON games(release_year);
  `);

  // Create full-text search table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS games_fts USING fts5(
      name,
      description,
      developer,
      publisher,
      genre,
      content='games',
      content_rowid='rowid'
    )
  `);
}

/**
 * Get the database instance
 * @returns {Database}
 */
function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Prepared statements cache
const statements = {};

/**
 * Get or create a prepared statement
 * @param {string} name - Statement name
 * @param {string} sql - SQL query
 * @returns {Statement}
 */
function getStatement(name, sql) {
  if (!statements[name]) {
    statements[name] = getDb().prepare(sql);
  }
  return statements[name];
}

// System operations
const systemOps = {
  upsert: (system) => {
    const stmt = getStatement('upsertSystem', `
      INSERT INTO systems (id, name, fullname, manufacturer, release, hardware, path, resolved_path, extensions, platform, theme, accessible, game_count, last_scanned, updated_at)
      VALUES (@id, @name, @fullname, @manufacturer, @release, @hardware, @path, @resolved_path, @extensions, @platform, @theme, @accessible, @game_count, @last_scanned, strftime('%s', 'now'))
      ON CONFLICT(id) DO UPDATE SET
        name = @name,
        fullname = @fullname,
        manufacturer = @manufacturer,
        release = @release,
        hardware = @hardware,
        path = @path,
        resolved_path = @resolved_path,
        extensions = @extensions,
        platform = @platform,
        theme = @theme,
        accessible = @accessible,
        game_count = @game_count,
        last_scanned = @last_scanned,
        updated_at = strftime('%s', 'now')
    `);

    return stmt.run({
      id: system.id,
      name: system.name,
      fullname: system.fullname || '',
      manufacturer: system.manufacturer || '',
      release: system.release || '',
      hardware: system.hardware || 'console',
      path: system.path || '',
      resolved_path: system.resolvedPath || '',
      extensions: JSON.stringify(system.extensions || []),
      platform: JSON.stringify(system.platform || []),
      theme: system.theme || '',
      accessible: system.accessible ? 1 : 0,
      game_count: system.gameCount || 0,
      last_scanned: Math.floor(Date.now() / 1000)
    });
  },

  getAll: () => {
    const stmt = getStatement('getAllSystems', 'SELECT * FROM systems ORDER BY fullname');
    return stmt.all().map(deserializeSystem);
  },

  getAccessible: () => {
    const stmt = getStatement('getAccessibleSystems', 'SELECT * FROM systems WHERE accessible = 1 ORDER BY fullname');
    return stmt.all().map(deserializeSystem);
  },

  getById: (id) => {
    const stmt = getStatement('getSystemById', 'SELECT * FROM systems WHERE id = ?');
    const row = stmt.get(id);
    return row ? deserializeSystem(row) : null;
  },

  getByName: (name) => {
    const stmt = getStatement('getSystemByName', 'SELECT * FROM systems WHERE name = ?');
    const row = stmt.get(name);
    return row ? deserializeSystem(row) : null;
  },

  updateGameCount: (id, count) => {
    const stmt = getStatement('updateSystemGameCount', 'UPDATE systems SET game_count = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?');
    return stmt.run(count, id);
  },

  deleteAll: () => {
    const stmt = getStatement('deleteAllSystems', 'DELETE FROM systems');
    return stmt.run();
  }
};

// Game operations
const gameOps = {
  upsert: (game) => {
    const stmt = getStatement('upsertGame', `
      INSERT INTO games (id, system_id, path, full_path, name, description, developer, publisher, release_date, release_year, genre, players_min, players_max, players_string, rating, play_count, last_played, game_time, hidden, favorite, kid_game, lang, hash, image, thumbnail, video, marquee, fanart, manual, file_exists, updated_at)
      VALUES (@id, @system_id, @path, @full_path, @name, @description, @developer, @publisher, @release_date, @release_year, @genre, @players_min, @players_max, @players_string, @rating, @play_count, @last_played, @game_time, @hidden, @favorite, @kid_game, @lang, @hash, @image, @thumbnail, @video, @marquee, @fanart, @manual, @file_exists, strftime('%s', 'now'))
      ON CONFLICT(id) DO UPDATE SET
        system_id = @system_id,
        path = @path,
        full_path = @full_path,
        name = @name,
        description = @description,
        developer = @developer,
        publisher = @publisher,
        release_date = @release_date,
        release_year = @release_year,
        genre = @genre,
        players_min = @players_min,
        players_max = @players_max,
        players_string = @players_string,
        rating = @rating,
        play_count = @play_count,
        last_played = @last_played,
        game_time = @game_time,
        hidden = @hidden,
        favorite = @favorite,
        kid_game = @kid_game,
        lang = @lang,
        hash = @hash,
        image = @image,
        thumbnail = @thumbnail,
        video = @video,
        marquee = @marquee,
        fanart = @fanart,
        manual = @manual,
        file_exists = @file_exists,
        updated_at = strftime('%s', 'now')
    `);

    return stmt.run({
      id: game.id,
      system_id: game.systemId,
      path: game.path || '',
      full_path: game.fullPath || '',
      name: game.name || '',
      description: game.description || '',
      developer: game.developer || '',
      publisher: game.publisher || '',
      release_date: game.releaseDate ? game.releaseDate.toISOString() : null,
      release_year: game.releaseYear || null,
      genre: game.genre || '',
      players_min: game.players?.min || 1,
      players_max: game.players?.max || 1,
      players_string: game.playersString || '',
      rating: game.rating || 0,
      play_count: game.playCount || 0,
      last_played: game.lastPlayed ? Math.floor(game.lastPlayed.getTime() / 1000) : null,
      game_time: game.gameTime || 0,
      hidden: game.hidden ? 1 : 0,
      favorite: game.favorite ? 1 : 0,
      kid_game: game.kidGame ? 1 : 0,
      lang: game.lang || '',
      hash: game.hash || '',
      image: game.image || '',
      thumbnail: game.thumbnail || '',
      video: game.video || '',
      marquee: game.marquee || '',
      fanart: game.fanart || '',
      manual: game.manual || '',
      file_exists: game.fileExists ? 1 : 0
    });
  },

  upsertMany: (games) => {
    const upsert = getDb().transaction((games) => {
      for (const game of games) {
        gameOps.upsert(game);
      }
    });
    return upsert(games);
  },

  getBySystem: (systemId, options = {}) => {
    const { limit = 1000, offset = 0, showHidden = false, sortBy = 'name', order = 'asc' } = options;
    const validSorts = ['name', 'release_year', 'rating', 'play_count', 'last_played', 'game_time'];
    const sort = validSorts.includes(sortBy) ? sortBy : 'name';
    const dir = order === 'desc' ? 'DESC' : 'ASC';

    let sql = `SELECT * FROM games WHERE system_id = ?`;
    if (!showHidden) {
      sql += ' AND hidden = 0';
    }
    sql += ` ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`;

    const stmt = getDb().prepare(sql);
    return stmt.all(systemId, limit, offset).map(deserializeGame);
  },

  getById: (id) => {
    const stmt = getStatement('getGameById', 'SELECT * FROM games WHERE id = ?');
    const row = stmt.get(id);
    return row ? deserializeGame(row) : null;
  },

  search: (query, options = {}) => {
    const { limit = 50, showHidden = false } = options;

    // Use FTS for search
    let sql = `
      SELECT games.* FROM games_fts
      JOIN games ON games.rowid = games_fts.rowid
      WHERE games_fts MATCH ?
    `;
    if (!showHidden) {
      sql += ' AND games.hidden = 0';
    }
    sql += ` LIMIT ?`;

    const stmt = getDb().prepare(sql);
    return stmt.all(query + '*', limit).map(deserializeGame);
  },

  getFavorites: (options = {}) => {
    const { limit = 100, showHidden = false } = options;
    let sql = 'SELECT * FROM games WHERE favorite = 1';
    if (!showHidden) {
      sql += ' AND hidden = 0';
    }
    sql += ' ORDER BY name LIMIT ?';

    const stmt = getDb().prepare(sql);
    return stmt.all(limit).map(deserializeGame);
  },

  getRecent: (days = 30, limit = 50) => {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    const stmt = getDb().prepare(`
      SELECT * FROM games
      WHERE last_played > ? AND hidden = 0
      ORDER BY last_played DESC
      LIMIT ?
    `);
    return stmt.all(cutoff, limit).map(deserializeGame);
  },

  getRandom: (systemId = null, count = 1) => {
    let sql = 'SELECT * FROM games WHERE hidden = 0 AND file_exists = 1';
    const params = [];
    if (systemId) {
      sql += ' AND system_id = ?';
      params.push(systemId);
    }
    sql += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const stmt = getDb().prepare(sql);
    return stmt.all(...params).map(deserializeGame);
  },

  getCount: (systemId = null, showHidden = false) => {
    let sql = 'SELECT COUNT(*) as count FROM games';
    const conditions = [];
    const params = [];

    if (systemId) {
      conditions.push('system_id = ?');
      params.push(systemId);
    }
    if (!showHidden) {
      conditions.push('hidden = 0');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = getDb().prepare(sql);
    return stmt.get(...params).count;
  },

  deleteBySystem: (systemId) => {
    const stmt = getStatement('deleteGamesBySystem', 'DELETE FROM games WHERE system_id = ?');
    return stmt.run(systemId);
  },

  deleteAll: () => {
    const stmt = getStatement('deleteAllGames', 'DELETE FROM games');
    return stmt.run();
  },

  rebuildFTS: () => {
    getDb().exec(`
      DELETE FROM games_fts;
      INSERT INTO games_fts(rowid, name, description, developer, publisher, genre)
      SELECT rowid, name, description, developer, publisher, genre FROM games;
    `);
  }
};

// Helper to deserialize a system row
function deserializeSystem(row) {
  return {
    id: row.id,
    name: row.name,
    fullname: row.fullname,
    manufacturer: row.manufacturer,
    release: row.release,
    hardware: row.hardware,
    path: row.path,
    resolvedPath: row.resolved_path,
    extensions: JSON.parse(row.extensions || '[]'),
    platform: JSON.parse(row.platform || '[]'),
    theme: row.theme,
    accessible: !!row.accessible,
    gameCount: row.game_count,
    lastScanned: row.last_scanned ? new Date(row.last_scanned * 1000) : null,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  };
}

// Helper to deserialize a game row
function deserializeGame(row) {
  return {
    id: row.id,
    systemId: row.system_id,
    path: row.path,
    fullPath: row.full_path,
    name: row.name,
    description: row.description,
    developer: row.developer,
    publisher: row.publisher,
    releaseDate: row.release_date ? new Date(row.release_date) : null,
    releaseYear: row.release_year,
    genre: row.genre,
    players: { min: row.players_min, max: row.players_max },
    playersString: row.players_string,
    rating: row.rating,
    playCount: row.play_count,
    lastPlayed: row.last_played ? new Date(row.last_played * 1000) : null,
    gameTime: row.game_time,
    hidden: !!row.hidden,
    favorite: !!row.favorite,
    kidGame: !!row.kid_game,
    lang: row.lang,
    hash: row.hash,
    image: row.image,
    thumbnail: row.thumbnail,
    video: row.video,
    marquee: row.marquee,
    fanart: row.fanart,
    manual: row.manual,
    fileExists: !!row.file_exists,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  };
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  systemOps,
  gameOps
};
