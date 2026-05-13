const mongoose = require("mongoose");

const checkpointSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
});

const transportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    pickupDateTime: {
      type: Date,
      required: true,
    },

    dropDateTime: {
      type: Date,
      required: true,
    },

    pickupLocation: {
      type: String,
      required: true,
    },

    checkpoints: [checkpointSchema],

    dropLocation: {
      type: String,
      required: true,
    },

    totalPassengers: {
      type: Number,
      required: true,
    },

    vehicles: [
      {
        type: { type: String },
        count: Number,
      },
    ],

    numberOfBusNeeded: {
      type: Number,
      required: true,
    },

    numberOfAccompanyingStaff: {
      type: Number,
      required: true,
    },

    accompanyingStaff: [
      {
        name: { type: String, trim: true },
        mobile: { type: Number },
      },
    ],

    specialRequirements: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Transport", transportSchema);
