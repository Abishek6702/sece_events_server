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
} = require("../controllers/eventController.js");

const uploadFields = upload.fields([
  { name: "previousEventDocumentation", maxCount: 1 },
  { name: "referencePosterFiles", maxCount: 5 },
  { name: "referenceCertificateFiles", maxCount: 5 },
  { name: "referenceFiles", maxCount: 5 },
]);

router.post("/", uploadFields, createEvent);
router.get("/", getAllEvents);
router.get("/filter", getFilteredEvents);

router.get("/requirements/:id", getRequirementDetails);

router.patch("/:id/status", updateEventStatus);
router.put("/:id", uploadFields, updateEvent);
router.patch("/:id/submit", uploadFields, submitEvent);
router.delete("/:id", deleteEvent);
router.get("/:id", getEventById);


module.exports = router;
