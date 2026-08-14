const express = require("express");
const protect = require("../middleware/protect");
const upload = require("../middleware/upload");
const {
  createDocumentName,
  getAllDocumentNames,
  getDocumentNameById,
  updateDocumentName,
  toggleDocumentStatus,
  deleteDocumentName,
  importDocumentNamesFromExcel,
} = require("../controllers/documentNameController");

const router = express.Router();

router.post("/", protect, createDocumentName);
router.post("/import", protect, upload.single("file"), importDocumentNamesFromExcel);
router.get("/", protect, getAllDocumentNames);
router.get("/:id", protect, getDocumentNameById);
router.put("/:id", protect, updateDocumentName);
router.patch("/:id/toggle-status", protect, toggleDocumentStatus);
router.delete("/:id", protect, deleteDocumentName);

module.exports = router;
