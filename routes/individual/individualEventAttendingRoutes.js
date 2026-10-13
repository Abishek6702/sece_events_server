const express = require("express");
const protect = require("../../middleware/protect");
const upload = require("../../middleware/multerConfig");
const controller = require("../../controllers/individual/individualEventAttendingController");

const router = express.Router();

router.use(protect);
router.post(
  "/",
  upload.fields([{ name: "principalApprovalForm", maxCount: 1 }]),
  controller.create,
);
router.get("/", controller.getMine);
router.get("/:id", controller.getById);

module.exports = router;
