const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");
const {
  getDashboardStats,
  getDepartmentWiseStats,
  getDepartmentWiseFacultyCount,
  getFacultyDashboardEventsCount,
} = require("../controllers/dashboardController");

router.get("/stats", getDashboardStats);
router.get("/department-wise", getDepartmentWiseStats);
router.get("/department-wise-faculty", getDepartmentWiseFacultyCount);

// faculty dashboard events count stats card

router.get("/faculty-dashboard-events-count", getFacultyDashboardEventsCount);

module.exports = router;
