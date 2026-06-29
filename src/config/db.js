const fs = require('fs');
const path = require('path');

try { require('dotenv').config({ path: path.join(__dirname, '../../.env') }); } catch (_) {}

const dualStorageEnabled = process.env.DUAL_STORAGE === 'true';
const useAiven = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL.includes('postgres');
const dialect = dualStorageEnabled ? 'mysql' : (useAiven ? 'postgres' : 'mysql');
let pool;
let basePool;
let aivenPool;
let usingFallback = false;

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const dataDir = isVercel ? '/tmp' : path.join(__dirname, '../data');
const fallbackFile = path.join(dataDir, 'profiles.json');

function ensureFallbackStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(fallbackFile)) {
    fs.writeFileSync(fallbackFile, '[]', 'utf8');
  }
}

function readFallbackProfiles() {
  ensureFallbackStore();
  try {
    return JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeFallbackProfiles(profiles) {
  ensureFallbackStore();
  fs.writeFileSync(fallbackFile, JSON.stringify(profiles, null, 2), 'utf8');
}

function buildProfileFromParams(params) {
  return {
    username: params[0],
    name: params[1],
    company: params[2],
    blog: params[3],
    location: params[4],
    email: params[5],
    bio: params[6],
    public_repos: params[7],
    public_gists: params[8],
    followers: params[9],
    following: params[10],
    profile_type: params[11],
    github_created_at: params[12],
    github_updated_at: params[13],
    profile_url: params[14],
    avatar_url: params[15],
    popularity_score: params[16],
    analysis_date: params[17],
    raw_data: params[18]
  };
}

function normalizeFallbackResult(text, params = []) {
  const lower = (text || '').trim().toLowerCase();
  const profiles = readFallbackProfiles();

  if (lower.includes('select 1') || lower.includes('select 1;')) {
    return { rows: [{ status: 'ok' }] };
  }

  if (lower.includes('where username')) {
    const username = params[0];
    const profile = profiles.find((entry) => entry.username === username);
    return { rows: profile ? [profile] : [] };
  }

  if (lower.startsWith('select')) {
    return { rows: [...profiles].sort((a, b) => new Date(b.analysis_date || 0) - new Date(a.analysis_date || 0)) };
  }

  if (lower.startsWith('insert')) {
    const profile = buildProfileFromParams(params);
    const index = profiles.findIndex((entry) => entry.username === profile.username);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    writeFallbackProfiles(profiles);
    return { rowCount: 1 };
  }

  if (lower.startsWith('create')) {
    return { rowCount: 0 };
  }

  return { rowCount: 0 };
}

function createMysqlPool() {
  try {
    const mysql = require('mysql2/promise');
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'github_profile_analyzer',
      waitForConnections: true,
      connectionLimit: 10,
      timezone: 'Z'
    };
    return mysql.createPool(poolConfig);
  } catch (error) {
    return null;
  }
}

function createPostgresPool() {
  try {
    const pg = require('pg');
    const { Pool } = pg;
    const connectionString = (process.env.DATABASE_URL || '').replace(/([&?])sslmode=require/, '');
    return new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10
    });
  } catch (error) {
    return null;
  }
}

if (dualStorageEnabled) {
  basePool = global.__sqlPool || createMysqlPool();
  if (basePool && !global.__sqlPool) {
    global.__sqlPool = basePool;
  }
  aivenPool = global.__pgPool || createPostgresPool();
  if (aivenPool && !global.__pgPool) {
    global.__pgPool = aivenPool;
  }
} else if (useAiven) {
  basePool = global.__pgPool || createPostgresPool();
  if (basePool && !global.__pgPool) {
    global.__pgPool = basePool;
  }
} else {
  basePool = global.__sqlPool || createMysqlPool();
  if (basePool && !global.__sqlPool) {
    global.__sqlPool = basePool;
  }
}

function createPoolWrapper(targetPool) {
  return {
    async query(text, params = []) {
      if (usingFallback) {
        return normalizeFallbackResult(text, params);
      }

      if (!targetPool) {
        usingFallback = true;
        return normalizeFallbackResult(text, params);
      }

      try {
        if (dialect === 'mysql') {
          const [rows] = await targetPool.query(convertPlaceholders(text), params);
          return { rows };
        }
        return await targetPool.query(text, params);
      } catch (error) {
        console.error('DB query failed, falling back to JSON storage:', error.message);
        usingFallback = true;
        return normalizeFallbackResult(text, params);
      }
    },
    async connect() {
      if (usingFallback || !targetPool) {
        return {
          query: async (text, params = []) => normalizeFallbackResult(text, params),
          release: () => {}
        };
      }

      try {
        if (dialect === 'mysql') {
          const connection = await targetPool.getConnection();
          return {
            query: async (text, params = []) => {
              try {
                const [rows] = await connection.query(convertPlaceholders(text), params);
                return { rows };
              } catch (error) {
                usingFallback = true;
                return normalizeFallbackResult(text, params);
              }
            },
            release: () => connection.release()
          };
        }

        const client = await targetPool.connect();
        return {
          query: async (text, params = []) => {
            try {
              return await client.query(text, params);
            } catch (error) {
              usingFallback = true;
              return normalizeFallbackResult(text, params);
            }
          },
          release: () => client.release()
        };
      } catch (error) {
        usingFallback = true;
        return {
          query: async (text, params = []) => normalizeFallbackResult(text, params),
          release: () => {}
        };
      }
    },
    async getConnection() {
      if (usingFallback || !targetPool) {
        return {
          query: async (text, params = []) => normalizeFallbackResult(text, params),
          release: () => {}
        };
      }

      if (dialect === 'mysql') {
        return targetPool.getConnection();
      }

      return targetPool.connect();
    }
  };
}

pool = createPoolWrapper(basePool);

function convertPlaceholders(text) {
  return (text || '').replace(/\$\d+/g, '?');
}

async function query(text, params = []) {
  return pool.query(text, params);
}

async function connect() {
  if (usingFallback) {
    return {
      query: async (text, params = []) => normalizeFallbackResult(text, params),
      release: () => {}
    };
  }

  if (!pool) {
    usingFallback = true;
    return {
      query: async (text, params = []) => normalizeFallbackResult(text, params),
      release: () => {}
    };
  }

  try {
    if (dialect === 'mysql') {
      const connection = await pool.getConnection();
      return {
        query: async (text, params = []) => {
          try {
            const [rows] = await connection.query(convertPlaceholders(text), params);
            return { rows };
          } catch (error) {
            usingFallback = true;
            return normalizeFallbackResult(text, params);
          }
        },
        release: () => connection.release()
      };
    }

    const client = await pool.connect();
    return {
      query: async (text, params = []) => {
        try {
          return await client.query(text, params);
        } catch (error) {
          usingFallback = true;
          return normalizeFallbackResult(text, params);
        }
      },
      release: () => client.release()
    };
  } catch (error) {
    usingFallback = true;
    return {
      query: async (text, params = []) => normalizeFallbackResult(text, params),
      release: () => {}
    };
  }
}

async function initializeDb() {
  const mysqlTableSQL = `
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        company VARCHAR(255),
        blog VARCHAR(255),
        location VARCHAR(255),
        email VARCHAR(255),
        bio TEXT,
        public_repos INT DEFAULT 0,
        public_gists INT DEFAULT 0,
        followers INT DEFAULT 0,
        following INT DEFAULT 0,
        profile_type VARCHAR(50),
        github_created_at DATETIME,
        github_updated_at DATETIME,
        profile_url VARCHAR(255),
        avatar_url VARCHAR(255),
        popularity_score INT DEFAULT 0,
        analysis_date DATETIME,
        raw_data TEXT
      );
    `;

  const postgresTableSQL = `
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        company VARCHAR(255),
        blog VARCHAR(255),
        location VARCHAR(255),
        email VARCHAR(255),
        bio TEXT,
        public_repos INT DEFAULT 0,
        public_gists INT DEFAULT 0,
        followers INT DEFAULT 0,
        following INT DEFAULT 0,
        profile_type VARCHAR(50),
        github_created_at TIMESTAMP,
        github_updated_at TIMESTAMP,
        profile_url VARCHAR(255),
        avatar_url VARCHAR(255),
        popularity_score INT DEFAULT 0,
        analysis_date TIMESTAMP,
        raw_data JSONB
      );
    `;

  // Initialize local MySQL
  const localClient = await connect();
  try {
    await localClient.query('SELECT 1');
    await localClient.query(mysqlTableSQL);
  } catch (err) {
    console.error('Error initializing local MySQL:', err.message);
  } finally {
    localClient.release();
  }

  // Initialize Aiven PostgreSQL if dual storage is enabled
  if (dualStorageEnabled && aivenPool) {
    try {
      const aivenClient = await aivenPool.connect();
      try {
        await aivenClient.query('SELECT 1');
        await aivenClient.query(postgresTableSQL);
        console.log('Aiven PostgreSQL schema initialized.');
      } catch (err) {
        console.error('Error initializing Aiven PostgreSQL:', err.message);
      } finally {
        aivenClient.release();
      }
    } catch (err) {
      console.error('Failed to connect to Aiven:', err.message);
    }
  }
}

module.exports = {
  pool,
  aivenPool: dualStorageEnabled ? aivenPool : null,
  initializeDb,
  dialect,
  dualStorageEnabled,
  usingFallback: () => usingFallback
};
