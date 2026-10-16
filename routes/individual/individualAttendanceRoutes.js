const express = require("express");
const protect = require("../../middleware/protect");
const upload = require("../../middleware/multerConfig");
const controller = require("../../controllers/individual/individualAttendanceDocumentController");

const router = express.Router();

router.post("/documents", protect, upload.any(), controller.createDocuments);
router.get("/documents", protect, controller.getDocuments);
router.get("/documents/:eventId", protect, controller.getDocumentsByEvent);
router.put("/documents/:eventId", protect, controller.updateDocuments);
router.delete("/documents/:eventId", protect, controller.deleteDocuments);

module.exports = router;
