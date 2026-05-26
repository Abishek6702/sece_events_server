const mongoose = require("mongoose");

const transportInventorySchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      required: true,
      unique: true,
      enum: ["Bus", "Van", "Car"],
    },

    totalCount: {
      type: Number,
      required: true,
      min: 0,
    },

    availableCount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TransportInventory",
  transportInventorySchema
);