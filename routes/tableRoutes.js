const express = require("express");

const router = express.Router();

const {
  getDashboardTable,
} = require("../controllers/tableController");

// Dashboard Table
router.get(
  "/dashboard-table",
  getDashboardTable
);

module.exports = router;