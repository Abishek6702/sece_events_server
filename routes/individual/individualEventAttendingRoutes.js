const express = require("express");
const protect = require("../../middleware/protect");
const controller = require("../../controllers/individual/individualEventAttendingController");

const router = express.Router();

router.use(protect);
router.post("/", controller.create);
router.get("/", controller.getMine);
router.get("/:id", controller.getById);

module.exports = router;
