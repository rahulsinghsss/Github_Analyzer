const {
  analyzeAndStoreProfile,
  getStoredProfiles,
  getStoredProfile
} = require('../services/profileService');

async function analyzeProfile(req, res) {
  try {
    const username = (req.body.username || req.query.username || req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'GitHub username is required.' });
    }

    const profile = await analyzeAndStoreProfile(username);
    res.status(200).json({ message: 'Profile analyzed and stored successfully.', profile });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'GitHub user not found.' });
    }

    console.error('Analyze profile error:', error);
    res.status(500).json({ error: 'Failed to analyze GitHub profile.' });
  }
}

async function fetchAllProfiles(req, res) {
  try {
    const profiles = await getStoredProfiles();
    res.json({ profiles });
  } catch (error) {
    console.error('Fetch all profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch stored profiles.' });
  }
}

async function fetchProfile(req, res) {
  try {
    const username = req.params.username;
    const profile = await getStoredProfile(username);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
}

module.exports = {
  analyzeProfile,
  fetchAllProfiles,
  fetchProfile
};
