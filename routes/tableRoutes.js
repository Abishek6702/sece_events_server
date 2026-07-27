const express = require("express");

const router = express.Router();

const {
  getDashboardTable,
  getFacultyDashboardTable,
} = require("../controllers/tableController");
const protect = require("../middleware/protect");

// Dashboard Table
router.get("/dashboard-table", protect, getDashboardTable);

// faculty dashboard table
router.get("/faculty-dashboard-table", protect, getFacultyDashboardTable);

module.exports = router;
