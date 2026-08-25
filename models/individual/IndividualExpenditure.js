const mongoose = require("mongoose");

const supportingDocumentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  { _id: false },
);

const expenditureSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    module: {
      type: String,
      enum: ["food", "transport", "media", "purchase"],
      required: true,
    },
    expenseName: { type: String, required: true, trim: true },
    billNo: { type: String, trim: true, default: "" },
    billDate: { type: Date, default: null },
    vendorOrGuestName: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    supportingDocument: { type: supportingDocumentSchema, default: null },
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IndividualExpenditure", expenditureSchema);
