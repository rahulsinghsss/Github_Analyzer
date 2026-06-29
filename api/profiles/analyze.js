const { analyzeAndStoreProfile } = require('../../src/services/profileService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  try {
    const profile = await analyzeAndStoreProfile(username.trim());
    return res.status(200).json({ message: 'Profile analyzed and stored successfully.', profile });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'GitHub user not found.' });
    }

    console.error('Vercel analyze profile error:', error);
    return res.status(500).json({ error: 'Failed to analyze GitHub profile.' });
  }
};
