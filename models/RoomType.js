const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    singleRoomCount: {
      type: Number,
      required: true,
      min: 0,
    },
    doubleRoomCount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalRoomCount: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

roomTypeSchema.pre("validate", function setTotalRoomCount(next) {
  this.totalRoomCount = (this.singleRoomCount || 0) + (this.doubleRoomCount || 0);
  next();
});

module.exports = mongoose.model("RoomType", roomTypeSchema);
