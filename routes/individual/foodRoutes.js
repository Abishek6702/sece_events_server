// routes/foodRoutes.js

const express = require("express");

const router = express.Router();

const foodController = require("../../controllers/individual/foodController");

// CREATE
router.post(
  "/",
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