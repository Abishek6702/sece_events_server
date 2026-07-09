const express = require("express");
const router = express.Router();

const {
  createEventType,
  getAllEventTypes,
  getEventType,
  updateEventType,
  deleteEventType,
  deleteDocument,
  toggleDocumentStatus,
} = require("../controllers/eventTypeController");

router.post("/", createEventType);

router.get("/", getAllEventTypes);

router.get("/:id", getEventType);

router.put("/:id", updateEventType);

router.delete("/:id", deleteEventType);

router.delete("/:eventId/document/:documentId", deleteDocument);

router.patch("/:eventId/document/:documentId/toggle", toggleDocumentStatus);

module.exports = router;