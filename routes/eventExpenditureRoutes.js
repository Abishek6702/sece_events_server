const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");
const upload = require("../middleware/multerConfig");

const {
  createEventExpenditure,
  getEventExpenditures,
  getEventExpenditureById,
  getEventExpenditureByEventId,
  getEventExpendituresByFacultyId,
  updateEventExpenditure,
} = require("../controllers/eventExpenditureController");

// Use upload.any() to handle dynamically named files in the payload for multiple sections
router.post("/", protect, upload.any(), createEventExpenditure);
router.get("/", protect, getEventExpenditures);
router.get("/faculty/:facultyId", getEventExpendituresByFacultyId);
router.get("/event/:eventId", protect, getEventExpenditureByEventId);
router.get("/:id", protect, getEventExpenditureById);
router.put("/:id", protect, upload.any(), updateEventExpenditure);

module.exports = router;
