const express = require("express");
const protect = require("../middleware/protect");
const {
  createRoomType,
  getRoomTypes,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
  getRoomAvailability,

} = require("../controllers/roomController");

const router = express.Router();


router.post("/", protect, createRoomType);
router.get("/", protect, getRoomTypes);


router.get("/:roomTypeId", protect, getRoomTypeById);
router.put("/:roomTypeId", protect, updateRoomType)

router.delete("/:roomTypeId", protect, deleteRoomType);

module.exports = router;
