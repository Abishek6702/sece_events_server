const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");
const {
  getDashboardStats,
  getDepartmentWiseStats,
  getDepartmentWiseFacultyCount,
  getFacultyDashboardEventsCount,
  getPosterHeadDashboard,
  getVideoHeadDashboard,
} = require("../controllers/dashboardController");




router.get("/stats",protect, getDashboardStats);
router.get("/department-wise",protect, getDepartmentWiseStats);
router.get("/department-wise-faculty",protect, getDepartmentWiseFacultyCount);

// faculty dashboard events count stats card
router.get("/faculty-dashboard-events-count", protect, getFacultyDashboardEventsCount);

// media head dashboards (poster & video)
router.get("/poster-dashboard",protect, getPosterHeadDashboard);
router.get("/video-dashboard",protect, getVideoHeadDashboard);

module.exports = router;
