const express = require("express");

const router = express.Router();

const {
  createFeedback,
  getFeedbackByEvent,
  getFeedbackById,
  deleteFeedback,
} = require("../controllers/feedbackController");
const protect = require("../middleware/protect");

router.post("/", protect, createFeedback);

router.get("/event/:eventId", protect, getFeedbackByEvent);

router.get("/:feedbackId", protect, getFeedbackById);

router.delete("/:feedbackId", protect, deleteFeedback);

module.exports = router;
