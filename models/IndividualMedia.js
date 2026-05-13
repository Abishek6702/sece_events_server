const mongoose = require("mongoose");

const fileReferenceSchema = new mongoose.Schema(
  {
    fileUrl: String,
    fileName: String,
  },
  { _id: false },
);

const sizeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Width", "Height", "Sticker", "Banner"],
    },

    value: {
      type: Number,
    },
  },
  { _id: false },
);

const individualMediaSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    dayIndex: {
      type: Number,
      default: 1,
    },

    typeOfMedia: [
      {
        type: String,
        enum: ["Poster", "Video"],
      },
    ],

    // =========================
    // POSTER SECTION
    // =========================
    poster: {
      posterContent: {
        type: String,
      },

      referencePosterFiles: [fileReferenceSchema],

      certificateContent: {
        type: String,
      },

      referenceCertificateFiles: [fileReferenceSchema],

      trophyContent: {
        type: String,
      },

      displayNeeded: [
        {
          type: String,
          enum: [
            "Digital Signage",
            "Standee",
            "Printing Banner",
            "TV Display",
            "Social Media",
            "Website Slider",
          ],
        },
      ],

      sizes: [sizeSchema],

      deliveryDate: {
        type: Date,
      },

      priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Urgent"],
        default: "Medium",
      },

      specialRequirements: {
        type: String,
      },
    },

    // =========================
    // VIDEO SECTION
    // =========================
    video: {
      videoContent: {
        type: String,
      },

      preEventVideos: [
        {
          type: String,
        },
      ],

      eventCoverage: [
        {
          type: String,
        },
      ],

      postEventVideos: [
        {
          type: String,
        },
      ],

      specialVideos: [
        {
          type: String,
        },
      ],

      referenceFiles: [fileReferenceSchema],

      deliveryDate: {
        type: Date,
      },

      priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Urgent"],
        default: "Medium",
      },

      specialRequirements: {
        type: String,
      },
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("IndividualMedia", individualMediaSchema);
