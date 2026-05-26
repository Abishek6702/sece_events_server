const express = require("express");

const router = express.Router();

const {
  createTransportInventory,
  getAllTransportInventory,
  getTransportInventoryById,
  updateTransportInventory,
  deleteTransportInventory,
} = require(
  "../controllers/transportInventoryController"
);


// CREATE
router.post(
  "/",
  createTransportInventory
);


// GET ALL
router.get(
  "/",
  getAllTransportInventory
);


// GET SINGLE
router.get(
  "/:id",
  getTransportInventoryById
);


// UPDATE
router.put(
  "/:id",
  updateTransportInventory
);


// DELETE
router.delete(
  "/:id",
  deleteTransportInventory
);

module.exports = router;