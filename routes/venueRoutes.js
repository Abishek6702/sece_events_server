const express = require('express');
const router = express.Router();

const {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  importVenuesFromExcel,
  getVenueOptions
} = require('../controllers/venueController');

const upload = require('../middleware/upload'); 



// ➤ Create all
router.post('/import', upload.single('file'), importVenuesFromExcel);

// ➤ Create
router.post('/', createVenue);

// ➤ Get all
router.get('/', getAllVenues);

// ➤ Get venue options
router.get('/options', getVenueOptions);

// ➤ Get by ID (IMPORTANT: keep AFTER other GET routes)
router.get('/:id', getVenueById);

// ➤ Update
router.put('/:id', updateVenue);

// ➤ Delete
router.delete('/:id', deleteVenue);




module.exports = router;