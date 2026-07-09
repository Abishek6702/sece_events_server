const mongoose = require("mongoose");

const eventRequirementSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    documents: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        isActive: {
          type: Boolean,
          default: true,
        },

        order: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("EventRequirement", eventRequirementSchema);
