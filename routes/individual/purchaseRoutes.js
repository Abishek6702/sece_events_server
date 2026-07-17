// routes/purchase/purchaseRoutes.js

const express = require("express");
const upload = require("../../middleware/multerConfig");

const router = express.Router();

const {
  createPurchase,
  getAllPurchase,
  getSinglePurchase,
  updatePurchase,
  deletePurchase,patchPurchase,getPurchaseDashboard
} = require("../../controllers/individual/purchaseController");

// CREATE
router.post(
  "/create",
  upload.fields([
    { name: "principalApprovalForm", maxCount: 10 },
    { name: "files", maxCount: 10 },
    { name: "attachments", maxCount: 10 },
  ]),
  createPurchase
);

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

//dashboard
router.get("/", getPurchaseDashboard);

module.exports = router;