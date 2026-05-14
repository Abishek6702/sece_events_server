// routes/purchase/purchaseRoutes.js

const express = require("express");

const router = express.Router();

const {
  createPurchase,
  getAllPurchase,
  getSinglePurchase,
  updatePurchase,
  deletePurchase,patchPurchase
} = require("../../controllers/individual/purchaseController");

// CREATE
router.post("/create", createPurchase);

// GET ALL
router.get("/", getAllPurchase);

// GET SINGLE
router.get("/:id", getSinglePurchase);

// UPDATE
router.put("/:id", updatePurchase);

// DELETE
router.delete("/:id", deletePurchase);

// PATCH
router.patch("/:id", patchPurchase);

module.exports = router;