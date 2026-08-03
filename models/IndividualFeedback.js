const mongoose = require("mongoose");

const individualFeedbackSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      index: true,
    },

    requestNo: {
      type: String,
      required: true,
    },

    module: {
      type: String,
      required: true,
      enum: ["FOOD", "PURCHASE", "MEDIA", "TRANSPORT"],
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    facultyName: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

individualFeedbackSchema.index({ requestId: 1, module: 1 }, { unique: true });

module.exports = mongoose.model("IndividualFeedback", individualFeedbackSchema);
