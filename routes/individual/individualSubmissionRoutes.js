const express = require("express");
const {
  getAllIndividualSubmissions,
  getIndividualSubmissionById,
  getRequestByFacultyModule,
  hodApproval,
  superAdminApproval,
  headApproval,
  closeIndividualSubmission,
} = require("../../controllers/individual/individualSubmissionController");

const protect = require("../../middleware/protect");

const router = express.Router();

router.use(protect);

// Faculty: GET /api/individual-submissions
// HOD/Head: GET /api/individual-submissions?module=food
// Admin: GET /api/individual-submissions?module=transport
router.get("/", getAllIndividualSubmissions);

// Module-specific reviewer endpoint
// Example: GET /api/individual-submissions/getrequest?module=food
// Example: GET /api/individual-submissions/getrequest/:id?module=food
router.get("/getrequest", getRequestByFacultyModule);
router.get("/getrequest/:id", protect, getRequestByFacultyModule); 

// Individual submission by ID
router.get("/:id", getIndividualSubmissionById);
router.put("/:id/close", closeIndividualSubmission);

// Approval workflow endpoints
router.put("/:id/hod-approval", hodApproval);
router.put("/:id/super-admin-approval", superAdminApproval);
router.put("/:id/head-approval", headApproval);

module.exports = router;
