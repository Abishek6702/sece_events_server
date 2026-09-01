const express = require("express");
const protect = require("../middleware/protect");
const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
} = require("../controllers/accommodationRoomController");

const router = express.Router();

router.get("/availability", getRoomAvailability);

router.post("/", createRoom);
router.get("/", getRooms);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

module.exports = router;
