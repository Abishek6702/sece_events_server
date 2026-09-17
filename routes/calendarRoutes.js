const express = require("express");
const router = express.Router();
const { getVenues, getEvents, getAllVenuesEvents, getAllRoomsEvents } = require("../controllers/calendarController");
const protect = require("../middleware/protect")

// GET /api/calendar/venues
router.get("/venues",protect, getVenues);

// GET /api/calendar/events?venue=Main+Board+Room&view=week&date=2026-10-04
router.get("/events",protect, getEvents);

// GET /api/calendar/all-venues-events?date=...
router.get("/all-venues-events", protect, getAllVenuesEvents);

// GET /api/calendar/all-rooms-events?date=...
router.get("/all-rooms-events", protect, getAllRoomsEvents);

module.exports = router;
