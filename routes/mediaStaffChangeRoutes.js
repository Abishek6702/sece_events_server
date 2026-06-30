const express = require("express");
const router = express.Router();

const {
  requestMediaStaffChange,
  staffChangeAction
} = require("../controllers/mediaStaffChangeController");



router.put(
    "/:id/staff-change-request",
    requestMediaStaffChange
  );
  
  router.put(
    "/:id/staff-change-action",
    staffChangeAction
  );

module.exports = router;