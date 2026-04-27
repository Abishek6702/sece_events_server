const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    block: {
      type: String,
      trim: true,
      default: "",
    },
    floor: {
      type: String,
      trim: true,
      default: "",
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },

    audio: {
      wiredMic: { type: Number, default: 0 },
      handMic: { type: Number, default: 0 },
      collarMic: { type: Number, default: 0 },
      handSpeaker: { type: Number, default: 0 },
      speakerWithMixer: { type: Number, default: 0 },
      paSystem: { type: Number, default: 0 },
      podiumWithMic: { type: Number, default: 0 },
    },

    seating: {
      withoutProctoring: { type: Number, default: 0 },
      withProctoring: { type: Number, default: 0 },
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Venue", venueSchema);
