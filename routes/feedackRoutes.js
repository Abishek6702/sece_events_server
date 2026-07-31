const express = require("express");

const router = express.Router();

const {
  createFeedback,
  getFeedbackByEvent,
  getFeedbackById,
  deleteFeedback,
  getDepartmentFeedbacks,
  getDepartmentOverallRating,
  getDepartmentSatisfactionSummary,
} = require("../controllers/feedbackController");
const protect = require("../middleware/protect");

router.post("/", protect, createFeedback);

router.get("/event/:eventId", protect, getFeedbackByEvent);

router.get("/department/:department/feedbacks", protect, getDepartmentFeedbacks);

router.get("/department/:department/overall-rating", protect, getDepartmentOverallRating);

router.get(
  "/department/:department/satisfaction-summary",
  protect,
  getDepartmentSatisfactionSummary,
);

router.get("/:feedbackId", protect, getFeedbackById);

router.delete("/:feedbackId", protect, deleteFeedback);

module.exports = router;
