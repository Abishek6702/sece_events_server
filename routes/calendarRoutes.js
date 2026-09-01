const express = require("express");
const router = express.Router();
const { getVenues, getEvents, getAllVenuesEvents } = require("../controllers/calendarController");
const protect = require("../middleware/protect")

// GET /api/calendar/venues
router.get("/venues",protect, getVenues);

// GET /api/calendar/events?venue=Main+Board+Room&view=week&date=2026-10-04
router.get("/events",protect, getEvents);

// GET /api/calendar/all-venues-events?date=...
router.get("/all-venues-events", protect, getAllVenuesEvents);

module.exports = router;
