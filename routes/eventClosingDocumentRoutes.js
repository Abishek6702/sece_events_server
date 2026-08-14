const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");
const upload = require("../middleware/multerConfig");

const {
  createEventClosingDocument,
  getEventClosingDocuments,
  getEventClosingDocumentById,
  getEventClosingDocumentByEventId,
  updateEventClosingDocument,
} = require("../controllers/eventClosingDocumentController");

// Use upload.any() to handle dynamically named files in the payload
router.post("/", protect, upload.any(), createEventClosingDocument);
router.get("/", protect, getEventClosingDocuments);
router.get("/event/:eventId", protect, getEventClosingDocumentByEventId);
router.get("/:id", protect, getEventClosingDocumentById);
router.put("/:id", protect, upload.any(), updateEventClosingDocument);

module.exports = router;
