const { getStoredProfile } = require('../../src/services/profileService');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  try {
    const profile = await getStoredProfile(username.trim());
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    return res.status(200).json({ profile });
  } catch (error) {
    console.error('Vercel fetch profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};
