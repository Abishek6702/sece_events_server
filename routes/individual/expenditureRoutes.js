const express = require("express");
const upload = require("../../middleware/multerConfig");
const protect = require("../../middleware/protect");
const {
  createExpenditure,
  getExpenditure,
  updateExpenditure,
} = require("../../controllers/individual/expenditureController");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  upload.single("supportingDocument"),
  createExpenditure,
);

router.get("/:requestId", getExpenditure);

router.put(
  "/:requestId",
  upload.single("supportingDocument"),
  updateExpenditure,
);

module.exports = router;
