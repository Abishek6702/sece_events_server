const express = require("express");

const router = express.Router();

const {
  getDashboardTable,
  getFacultyDashboardTable,
  getHodDashboardTable,
} = require("../controllers/tableController");
const protect = require("../middleware/protect");

// Dashboard Table
router.get("/dashboard-table", protect, getDashboardTable);

// faculty dashboard table
router.get("/faculty-dashboard-table", protect, getFacultyDashboardTable);

// hod dashboard table
router.get("/hod-dashboard-table", getHodDashboardTable);

module.exports = router;
