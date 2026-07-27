const express = require('express');
const router = express.Router();

const {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  importVenuesFromExcel,
  getVenueOptions,
  getVenueBookingCounts
} = require('../controllers/venueController');

const upload = require('../middleware/upload'); 
const protect = require("../middleware/protect");




// ➤ Create all
router.post('/import',protect, upload.single('file'), importVenuesFromExcel);

// ➤ Create
router.post('/',protect, createVenue);

// ➤ Get all
router.get('/',protect, getAllVenues);

// ➤ Get venue options
router.get('/options',protect, getVenueOptions);
router.get('/booking-counts',protect, getVenueBookingCounts);

// ➤ Get by ID (IMPORTANT: keep AFTER other GET routes)
router.get('/:id',protect, getVenueById);

// ➤ Update
router.put('/:id',protect, updateVenue);

// ➤ Delete
router.delete('/:id',protect, deleteVenue);




module.exports = router;
