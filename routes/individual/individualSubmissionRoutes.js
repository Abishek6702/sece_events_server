const express = require("express");
const {
  getAllIndividualSubmissions,
  getIndividualSubmissionById,
  getRequestByFacultyModule,
  getPosterRequests,
  getPosterRequestById,
  getVideoRequests,
  getVideoRequestById,
  getPosterHeadList,
  getVideoHeadList,
  interchangeMediaAssignment,
  hodApproval,
  hodReject,
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

// Media head review lists
router.get("/poster-head", getPosterHeadList);
router.get("/video-head", getVideoHeadList);

// Poster routes
router.get("/poster", getPosterRequests);
router.get("/poster/:id", getPosterRequestById);

// Video routes
router.get("/video", getVideoRequests);
router.get("/video/:id", getVideoRequestById);

// Individual submission by ID
router.get("/:id", getIndividualSubmissionById);
router.put("/:id/close", closeIndividualSubmission);
router.put("/:id/interchange", interchangeMediaAssignment);

// Approval workflow endpoints
router.put("/:id/hod-approval", hodApproval);
router.put("/:id/hod-reject", hodReject);
router.put("/:id/super-admin-approval", superAdminApproval);
router.put("/:id/head-approval", headApproval);

module.exports = router;
