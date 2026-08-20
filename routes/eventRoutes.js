const express = require("express");
const router = express.Router();

const upload = require("../middleware/multerConfig.js");
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  submitEvent,
  deleteEvent,
  getFilteredEvents,
  updateEventStatus,
  getRequirementDetails,
  getUserDraftEvents,
  checkVenueAvailability,
  updateDocumentExpenditureApproval,
  getBasicEvents,
  getEventRequiredDocuments,
} = require("../controllers/eventController.js");
const protect = require("../middleware/protect");

const uploadFields = upload.fields([
  { name: "principalApprovalDocument", maxCount: 1 },
  { name: "previousEventDocumentation", maxCount: 1 },
  { name: "referencePosterFiles", maxCount: 5 },
  { name: "referenceCertificateFiles", maxCount: 5 },
  { name: "referenceFiles", maxCount: 5 },
]);

router.post("/", protect, uploadFields, createEvent);
router.get("/", protect, getAllEvents);
router.get("/basic/:id", getBasicEvents);
router.get("/filter", protect, getFilteredEvents);
router.post( "/check-venue-availability",protect,checkVenueAvailability,);
router.get("/requirements/:id", protect, getRequirementDetails);
router.get("/documents/:id",protect, getEventRequiredDocuments);
router.get("/draft/:organizerId", protect, getUserDraftEvents);
router.patch("/:id/document-expenditure-approval", protect, updateDocumentExpenditureApproval);
router.patch("/:id/status", protect, updateEventStatus);
router.put("/:id", protect, uploadFields, updateEvent);
router.patch("/:id/submit", protect, uploadFields, submitEvent);
router.delete("/:id", protect, deleteEvent);
router.get("/:id", protect, getEventById);
module.exports = router;
