const express = require('express');
const router = express.Router();

const { allocateAudioStaff } = require('../controllers/audioStaffAllocationController');
const protect = require('../middleware/protect');

router.put('/:id/allocate-audio-staff', allocateAudioStaff);

module.exports = router;
