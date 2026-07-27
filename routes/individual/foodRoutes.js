// routes/foodRoutes.js

const express = require("express");

const router = express.Router();

const upload = require("../../middleware/multerConfig");
const protect = require("../../middleware/protect");
const foodController = require("../../controllers/individual/foodController");

router.use(protect);

// CREATE
router.post(
  "/",
  upload.fields([
    { name: "principalApprovalForm", maxCount: 1 },
  ]),
  foodController.createFood
);

// GET ALL
router.get(
  "/",
  foodController.getAllFoods
);

// GET SINGLE
router.get(
  "/:id",
  foodController.getFoodById
);

// UPDATE
router.put(
  "/:id",
  foodController.updateFood
);

// DELETE
router.delete(
  "/:id",
  foodController.deleteFood
);
//patch
router.patch("/:id", foodController.patchFood);

//dashboard
router.get("/", foodController.getFoodDashboard);

module.exports = router;