const express = require("express");
const protect = require("../middleware/protect");
const {
  submitIndividualFeedback,
  getIndividualFeedback,
} = require("../controllers/individualFeedbackController");

const router = express.Router();

router.post("/individual", protect, submitIndividualFeedback);
router.get("/individual", protect, getIndividualFeedback);

module.exports = router;
