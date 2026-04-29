const express = require("express");
const router = express.Router();

const upload = require("../middleware/multerConfig.js");

const Event = require("../models/Event.js");
const eventController = require("../controllers/eventController.js");

const uploadFields = upload.fields([
  { name: "previousEventDocumentation", maxCount: 1 },
  { name: "referencePosterFiles", maxCount: 5 },
  { name: "referenceCertificateFiles", maxCount: 5 },
  { name: "referenceFiles", maxCount: 5 },
]);

router.post("/", uploadFields, eventController.createEvent);
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.put("/:id", uploadFields, eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);
