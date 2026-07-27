const express = require("express");

const {
  importExcelFaculty,
  addIndividualFaculty,
  getFaculties,
  getFacultyId,
  deleteFaculty,
  editFaculty,
  uploadProfileImage,
  deleteProfileImage,
  searchFaculty,
} = require("../controllers/facultyController");
const protect = require("../middleware/protect");

const upload = require("../middleware/upload");
const uploadCloudinary = require("../middleware/multerConfig.js");

const router = express.Router();

router.post("/import-faculty", upload.single("faculties"), importExcelFaculty);

router.post("/", protect, addIndividualFaculty);

router.get("/", protect, getFaculties);

router.get("/search", protect, searchFaculty);

router.get("/:id", protect, getFacultyId);

router.delete("/:id", protect, deleteFaculty);

router.put("/:id", protect, editFaculty);

router.patch(
  "/:id/profile-image",
  protect,
  uploadCloudinary.single("profileImage"),
  uploadProfileImage,
);

router.delete("/:id/profile-image", protect, deleteProfileImage);

module.exports = router;
