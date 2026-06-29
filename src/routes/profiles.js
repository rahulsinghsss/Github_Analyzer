const express = require('express');
const {
  analyzeProfile,
  fetchAllProfiles,
  fetchProfile
} = require('../controllers/profileController');

const router = express.Router();

router.post('/analyze', analyzeProfile);
router.get('/', fetchAllProfiles);
router.get('/:username', fetchProfile);

module.exports = router;
