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
  getPosterHeadStats,
  getVideoHeadStats,
  getPosterDepartmentStats,
  getVideoDepartmentStats,
} = require("../controllers/dashboardController");
const {
  getIndividualDashboardStats,
  getIndividualFacultyWiseStats,
  getIndividualDepartmentWiseStats,
  getIndividualSuperAdminWiseStats,
} = require("../controllers/individualDashboardController");




router.get("/stats",protect, getDashboardStats);
router.get("/department-wise",protect, getDepartmentWiseStats);
router.get("/department-wise-faculty",protect, getDepartmentWiseFacultyCount);

// faculty dashboard events count stats card
router.get("/faculty-dashboard-events-count", protect, getFacultyDashboardEventsCount);

// media head dashboards (poster & video)
router.get("/poster-dashboard",protect, getPosterHeadDashboard);
router.get("/poster-head-stats", protect, getPosterHeadStats);
router.get("/video-dashboard",protect, getVideoHeadDashboard);
router.get("/video-head-stats", protect, getVideoHeadStats);
router.get("/poster-dashboard/department-stats",protect, getPosterDepartmentStats);
router.get("/video-dashboard/department-stats",protect, getVideoDepartmentStats);

router.get("/individual-stats", protect, getIndividualDashboardStats);
router.get("/individual-faculty-wise-stats", protect, getIndividualFacultyWiseStats);
router.get("/individual-department-wise-stats", protect, getIndividualDepartmentWiseStats);
router.get("/individual-superadmin-wise-stats", protect, getIndividualSuperAdminWiseStats);

module.exports = router;
