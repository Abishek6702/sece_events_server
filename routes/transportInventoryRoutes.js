const express = require("express");

const router = express.Router();

const {
  createTransportInventory,
  getAllTransportInventory,
  getTransportInventoryById,
  updateTransportInventory,
  deleteTransportInventory,
  getTransportAvailability,
} = require("../controllers/transportInventoryController");
const protect = require("../middleware/protect");

// CREATE
router.post("/", protect, createTransportInventory);

// GET ALL
router.get("/", protect, getAllTransportInventory);

router.get("/available", protect, getTransportAvailability);
// GET SINGLE
router.get("/:id", protect, getTransportInventoryById);

// UPDATE
router.put("/:id", protect, updateTransportInventory);

// DELETE
router.delete("/:id", protect, deleteTransportInventory);

module.exports = router;
