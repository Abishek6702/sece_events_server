const mongoose = require("mongoose");

const accommodationRoomSchema = new mongoose.Schema(
  {
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

accommodationRoomSchema.index({ venue: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model("AccommodationRoom", accommodationRoomSchema);
