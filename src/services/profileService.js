const axios = require('axios');
const {
  insertOrUpdateProfile,
  getProfileByUsername,
  getAllProfiles
} = require('../models/profileModel');

const GITHUB_API_BASE = 'https://api.github.com/users';

function calculatePopularityScore({ followers = 0, public_repos = 0, public_gists = 0 }) {
  return followers * 2 + public_repos + public_gists;
}

function buildProfileData(data) {
  return {
    username: data.login,
    name: data.name,
    company: data.company,
    blog: data.blog,
    location: data.location,
    email: data.email,
    bio: data.bio,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    followers: data.followers,
    following: data.following,
    profile_type: data.type,
    github_created_at: data.created_at ? new Date(data.created_at) : null,
    github_updated_at: data.updated_at ? new Date(data.updated_at) : null,
    profile_url: data.html_url,
    avatar_url: data.avatar_url,
    popularity_score: calculatePopularityScore(data),
    analysis_date: new Date(),
    raw_data: data
  };
}

async function fetchGithubProfile(username) {
  const headers = {
    'User-Agent': 'github-profile-analyzer',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await axios.get(`${GITHUB_API_BASE}/${encodeURIComponent(username)}`, { headers });
    return response.data;
  } catch (error) {
    console.error('GitHub API fetch error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    throw new Error(`Failed to fetch GitHub profile for ${username}: ${error.message}`);
  }
}

async function analyzeAndStoreProfile(username) {
  const githubData = await fetchGithubProfile(username);
  const profile = buildProfileData(githubData);
  await insertOrUpdateProfile(profile);
  return await getProfileByUsername(profile.username);
}

async function getStoredProfiles() {
  return await getAllProfiles();
}

async function getStoredProfile(username) {
  return await getProfileByUsername(username);
}

module.exports = {
  analyzeAndStoreProfile,
  getStoredProfiles,
  getStoredProfile
};
