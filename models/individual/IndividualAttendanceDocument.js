const mongoose = require("mongoose");

const documentNames = [
  "Jio Tag Required Document",
  "Report Required Document",
  "Certificate Required Document",
];

const isValidDocumentUrl = (value) => {
  if (value === "") return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const attendanceDocumentSchema = new mongoose.Schema(
  {
    documentName: {
      type: String,
      required: true,
      enum: documentNames,
    },
    documentUrl: {
      type: String,
      default: "",
      validate: {
        validator: isValidDocumentUrl,
        message: "documentUrl must be empty or a valid HTTP(S) URL.",
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["Submitted", "Not Submitted"],
    },
  },
  { _id: false },
);

attendanceDocumentSchema.pre("validate", function setSubmissionStatus() {
  this.status = this.documentUrl ? "Submitted" : "Not Submitted";
});

const individualAttendanceDocumentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IndividualEventAttending",
      required: true,
      unique: true,
    },
    documents: {
      type: [attendanceDocumentSchema],
      required: true,
      validate: {
        validator: (documents) =>
          documents.length === documentNames.length &&
          documentNames.every((name) =>
            documents.some((document) => document.documentName === name),
          ),
        message: "Exactly one record for each required attendance document is required.",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "IndividualAttendanceDocument",
  individualAttendanceDocumentSchema,
);
