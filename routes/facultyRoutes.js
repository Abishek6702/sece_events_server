const express = require("express");

const {
  importExcelFaculty,
  addIndividualFaculty,
  getFaculties,
  getFacultyId,
  deleteFaculty,
  editFaculty,
} = require("../controllers/facultyController");
const { protect } = require("../middleware/protect");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/import-faculty", upload.single("faculties"), importExcelFaculty);

router.post("/", addIndividualFaculty);

router.get("/", getFaculties);

router.get("/:id", getFacultyId);

router.delete("/:id", deleteFaculty);

router.put("/:id", editFaculty);

module.exports = router;
