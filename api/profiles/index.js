const { getStoredProfiles } = require('../../src/services/profileService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profiles = await getStoredProfiles();
    return res.status(200).json({ profiles });
  } catch (error) {
    console.error('Vercel fetch all profiles error:', error);
    return res.status(500).json({ error: 'Failed to fetch stored profiles.' });
  }
};
