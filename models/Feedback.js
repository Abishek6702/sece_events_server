const mongoose = require("mongoose");

const feedbackSectionSchema = new mongoose.Schema(
  {
    sectionKey: {
      type: String,
      required: true,
      trim: true,
    },

    sectionTitle: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    ratingLabel: {
      type: String,
      enum: ["Poor", "Minor Issues", "Neutral", "Positive", "Excellent"],
    },

    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const feedbackSchema = new mongoose.Schema(
  {
    // relations
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },

    // dynamic sections
    sections: {
      type: [feedbackSectionSchema],
      validate: (v) => v.length > 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
feedbackSchema.index({
  eventId: 1,
  organizerId: 1,
});

module.exports = mongoose.model("Feedback", feedbackSchema);
