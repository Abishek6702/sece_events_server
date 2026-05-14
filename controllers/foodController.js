// controllers/foodController.js

const Food = require("../models/IndividualFood");

// ==========================================
// CREATE FOOD
// ==========================================
exports.createFood = async (req, res) => {
  try {
    const food = await Food.create(req.body);

    res.status(201).json({
      success: true,
      message: "Food request created successfully",
      data: food,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create food request",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL FOOD REQUESTS
// ==========================================
exports.getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch food requests",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE FOOD REQUEST
// ==========================================
exports.getFoodById = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).populate("employee");

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: food,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch food request",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE FOOD REQUEST
// ==========================================
exports.updateFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Food request updated successfully",
      data: food,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update food request",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE FOOD REQUEST
// ==========================================
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Food request deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete food request",
      error: error.message,
    });
  }
};

// ==========================================
// PATCH FOOD REQUEST
// ==========================================
exports.patchFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    // update only sent fields
    Object.keys(req.body).forEach((key) => {
      food[key] = req.body[key];
    });

    await food.save();

    res.status(200).json({
      success: true,
      message: "Food request patched successfully",
      data: food,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to patch food request",
      error: error.message,
    });
  }
};