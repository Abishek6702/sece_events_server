const express = require("express");

const router = express.Router();

const {
  createFeedback,
  getFeedbackByEvent,
  getFeedbackById,
  deleteFeedback,
} = require("../controllers/feedbackController");

router.post("/", createFeedback);

router.get("/event/:eventId", getFeedbackByEvent);

router.get("/:feedbackId", getFeedbackById);

router.delete("/:feedbackId", deleteFeedback);

module.exports = router;
