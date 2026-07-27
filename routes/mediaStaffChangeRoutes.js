const express = require("express");
const router = express.Router();

const {
  requestMediaStaffChange,
  staffChangeAction,
} = require("../controllers/mediaStaffChangeController");
const protect = require("../middleware/protect");

router.put("/:id/staff-change-request", protect, requestMediaStaffChange);

router.put("/:id/staff-change-action", protect, staffChangeAction);

module.exports = router;
