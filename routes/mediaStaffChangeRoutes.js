const express = require("express");
const router = express.Router();

const {
  changeMediaStaff,
} = require("../controllers/mediaStaffChangeController");
const protect = require("../middleware/protect");

router.put("/:id/change-media-staff", changeMediaStaff);


module.exports = router;
