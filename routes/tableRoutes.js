const express = require("express");

const router = express.Router();

const {
  getDashboardTable,
  getFacultyDashboardTable,
} = require("../controllers/tableController");

// Dashboard Table
router.get("/dashboard-table", getDashboardTable);

// faculty dashboard table
router.get("/faculty-dashboard-table", getFacultyDashboardTable);

module.exports = router;
