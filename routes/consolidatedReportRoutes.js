const express = require("express");
const protect = require("../middleware/protect");
const {
  getConsolidatedFoodReport,
  getConsolidatedAccommodationReport,
} = require("../controllers/consolidatedReportController");

const router = express.Router();

router.get("/food", getConsolidatedFoodReport);
router.get("/accommodation", getConsolidatedAccommodationReport);

module.exports = router;
