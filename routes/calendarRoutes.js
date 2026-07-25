const express = require("express");
const router = express.Router();
const { getVenues, getEvents } = require("../controllers/calendarController");

// GET /api/calendar/venues
router.get("/venues", getVenues);

// GET /api/calendar/events?venue=Main+Board+Room&view=week&date=2026-10-04
router.get("/events", getEvents);

module.exports = router;

/**
 * In your main app.js / server.js:
 *
 *   const calendarRoutes = require("./routes/calendarRoutes");
 *   app.use("/api/calendar", calendarRoutes);
 */
