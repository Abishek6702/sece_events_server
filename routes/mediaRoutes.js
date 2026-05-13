const express = require("express");
const router = express.Router();

const {
  createIndividualMedia,
  getAllIndividualMedia,
  getSingleIndividualMedia,
  updateIndividualMedia,
  deleteIndividualMedia,
  patchIndividualMedia
} = require("../controllers/mediaController");

// CREATE
router.post("/", createIndividualMedia);

// GET ALL
router.get("/", getAllIndividualMedia);

// GET SINGLE
router.get("/:id", getSingleIndividualMedia);

// UPDATE
router.put("/:id", updateIndividualMedia);

// DELETE
router.delete("/:id", deleteIndividualMedia);

//patch
router.patch(
  "/:id",
  patchIndividualMedia
);

module.exports = router;