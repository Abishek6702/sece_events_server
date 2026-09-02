const express = require("express");
const protect = require("../middleware/protect");
const {
  createTicketingRequest,
  getFacultyTicketingRequests,
  getSuperAdminTicketingRequests,
  editTicketingRequest,
  approveTicketingRequest,
  rejectTicketingRequest,
  getHeadTicketingRequests,
  acknowledgeTicketingRequest,
  completeTicketingRequest,
  getTicketingRequestById,
} = require("../controllers/individualTicketingController");

const router = express.Router();
router.use(protect);

router.post("/", createTicketingRequest);
router.get("/faculty", getFacultyTicketingRequests);
router.get("/superadmin", getSuperAdminTicketingRequests);
router.get("/head", getHeadTicketingRequests);
router.get("/:id", getTicketingRequestById);
router.put("/:id/edit", editTicketingRequest);
router.put("/:id/approve", approveTicketingRequest);
router.put("/:id/reject", rejectTicketingRequest);
router.put("/:id/acknowledge", acknowledgeTicketingRequest);
router.put("/:id/complete", completeTicketingRequest);

module.exports = router;
