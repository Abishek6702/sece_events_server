const express = require("express");
const router = express.Router();

const {
  allocateIctsStaff,
} = require("../controllers/ictsStaffAllocationController");
const protect = require("../middleware/protect");

router.put("/:id/allocate-icts-staff", allocateIctsStaff);

module.exports = router;
