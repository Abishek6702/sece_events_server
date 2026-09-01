const express = require("express");
const upload = require("../../middleware/multerConfig");
const protect = require("../../middleware/protect");
const {
  createExpenditure,
  getOverallExpenditure,
  getFacultyExpenditureList,
  getExpenditure,
  updateExpenditure,
  approveExpenditure,
  rejectExpenditure,
} = require("../../controllers/individual/expenditureController");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  upload.any(),
  createExpenditure,
);

router.get("/", getFacultyExpenditureList);
router.get("/overall", getOverallExpenditure);
router.get("/overall/:requestId", getOverallExpenditure);
router.get("/:requestId", getExpenditure);

router.put(
  "/:requestId",
  upload.any(),
  updateExpenditure,
);
router.put("/:expenditureId/approve", approveExpenditure);
router.put("/:expenditureId/reject", rejectExpenditure);
module.exports = router;
