const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = require("../../middleware/multerConfig");

const {
  createIndividualMedia,
  getAllIndividualMedia,
  getSingleIndividualMedia,
  updateIndividualMedia,
  deleteIndividualMedia,
  patchIndividualMedia,
} = require("../../controllers/individual/mediaController");



// ============================
// CREATE
// ============================
router.post(
  "/create",
  upload.fields([
    { name: "referencePosterFiles", maxCount: 10 },
    { name: "referenceCertificateFiles", maxCount: 10 },
    { name: "referenceFiles", maxCount: 10 },
  ]),
  createIndividualMedia
);

// GET ALL
router.get("/", getAllIndividualMedia);

// GET SINGLE
router.get("/:id", getSingleIndividualMedia);

// UPDATE
router.put("/:id", updateIndividualMedia);

// DELETE
router.delete("/:id", deleteIndividualMedia);

// PATCH
router.patch("/:id", patchIndividualMedia);

module.exports = router;