const { pool, dialect, aivenPool, dualStorageEnabled } = require('../config/db');

async function insertOrUpdateProfile(profile) {
  const mysqlQuery = `
      INSERT INTO profiles (
        username,
        name,
        company,
        blog,
        location,
        email,
        bio,
        public_repos,
        public_gists,
        followers,
        following,
        profile_type,
        github_created_at,
        github_updated_at,
        profile_url,
        avatar_url,
        popularity_score,
        analysis_date,
        raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        company = VALUES(company),
        blog = VALUES(blog),
        location = VALUES(location),
        email = VALUES(email),
        bio = VALUES(bio),
        public_repos = VALUES(public_repos),
        public_gists = VALUES(public_gists),
        followers = VALUES(followers),
        following = VALUES(following),
        profile_type = VALUES(profile_type),
        github_created_at = VALUES(github_created_at),
        github_updated_at = VALUES(github_updated_at),
        profile_url = VALUES(profile_url),
        avatar_url = VALUES(avatar_url),
        popularity_score = VALUES(popularity_score),
        analysis_date = VALUES(analysis_date),
        raw_data = VALUES(raw_data);
    `;

  const postgresQuery = `
      INSERT INTO profiles (
        username,
        name,
        company,
        blog,
        location,
        email,
        bio,
        public_repos,
        public_gists,
        followers,
        following,
        profile_type,
        github_created_at,
        github_updated_at,
        profile_url,
        avatar_url,
        popularity_score,
        analysis_date,
        raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (username) DO UPDATE SET
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        blog = EXCLUDED.blog,
        location = EXCLUDED.location,
        email = EXCLUDED.email,
        bio = EXCLUDED.bio,
        public_repos = EXCLUDED.public_repos,
        public_gists = EXCLUDED.public_gists,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,
        profile_type = EXCLUDED.profile_type,
        github_created_at = EXCLUDED.github_created_at,
        github_updated_at = EXCLUDED.github_updated_at,
        profile_url = EXCLUDED.profile_url,
        avatar_url = EXCLUDED.avatar_url,
        popularity_score = EXCLUDED.popularity_score,
        analysis_date = EXCLUDED.analysis_date,
        raw_data = EXCLUDED.raw_data;
    `;

  const values = [
    profile.username,
    profile.name,
    profile.company,
    profile.blog,
    profile.location,
    profile.email,
    profile.bio,
    profile.public_repos,
    profile.public_gists,
    profile.followers,
    profile.following,
    profile.profile_type,
    profile.github_created_at,
    profile.github_updated_at,
    profile.profile_url,
    profile.avatar_url,
    profile.popularity_score,
    profile.analysis_date,
    profile.raw_data
  ];

  // Store to local MySQL
  const result = await pool.query(mysqlQuery, values);

  // If dual storage is enabled, also store to Aiven PostgreSQL
  if (dualStorageEnabled && aivenPool) {
    aivenPool.query(postgresQuery, values).catch(() => {});
  }

  return result;
}

function normalizeProfileRow(row) {
  if (!row) {
    return null;
  }

  if (row.raw_data && typeof row.raw_data === 'string') {
    try {
      row.raw_data = JSON.parse(row.raw_data);
    } catch (_) {
      // keep original string if parsing fails
    }
  }

  return row;
}

async function getProfileByUsername(username) {
  const result = await pool.query('SELECT * FROM profiles WHERE username = $1', [username]);
  return normalizeProfileRow(result.rows[0]) || null;
}

async function getAllProfiles() {
  const result = await pool.query('SELECT * FROM profiles ORDER BY analysis_date DESC');
  return result.rows.map(normalizeProfileRow);
}

module.exports = {
  insertOrUpdateProfile,
  getProfileByUsername,
  getAllProfiles
};
