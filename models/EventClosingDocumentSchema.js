const mongoose = require("mongoose");

const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const EventClosingDocumentSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },

    documents: [
      {
        key: {
          type: String,
          required: true,
        },

        label: {
          type: String,
          required: true,
        },

        file: {
          type: fileReferenceSchema,
          required: true,
        },
      },
    ],
    editRemark: {
      type: String,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "EventClosingDocument",
  EventClosingDocumentSchema
);