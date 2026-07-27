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
const protect = require("../middleware/protect");


router.post("/",protect, createEventType);

router.get("/",protect, getAllEventTypes);

router.get("/:id",protect, getEventType);

router.put("/:id",protect, updateEventType);

router.delete("/:id",protect, deleteEventType);

router.delete("/:eventId/document/:documentId",protect, deleteDocument);

router.patch("/:eventId/document/:documentId/toggle",protect, toggleDocumentStatus);

module.exports = router;