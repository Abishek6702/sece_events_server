const mongoose = require("mongoose");

const supportingDocumentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  { _id: false },
);

const expenditureApprovalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    rejectedAt: { type: Date, default: null },
    remarks: { type: String, default: "" },
  },
  { _id: false },
);

const expenditureItemSchema = new mongoose.Schema(
  {
    expenseName: { type: String, required: true, trim: true },
    billNo: { type: String, trim: true, default: "" },
    billDate: { type: Date, default: null },
    vendorOrGuestName: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    supportingDocument: { type: supportingDocumentSchema, default: null },
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
      enum: ["food", "transport", "media", "purchase", "others", "combined"],
      required: true,
    },
    expenseName: { type: String, required: function () { return this.module !== "combined"; }, trim: true },
    billNo: { type: String, trim: true, default: "" },
    billDate: { type: Date, default: null },
    vendorOrGuestName: { type: String, trim: true, default: "" },
    amount: { type: Number, required: function () { return this.module !== "combined"; }, min: 0 },
    food: { type: [expenditureItemSchema], default: undefined },
    transport: { type: [expenditureItemSchema], default: undefined },
    purchase: { type: [expenditureItemSchema], default: undefined },
    media: { type: [expenditureItemSchema], default: undefined },
    others: { type: [expenditureItemSchema], default: undefined },
    supportingDocument: { type: supportingDocumentSchema, default: null },
    remarks: { type: String, trim: true, default: "" },
    superAdmin1Approval: { type: expenditureApprovalSchema, default: () => ({}) },
    superAdmin2Approval: { type: expenditureApprovalSchema, default: () => ({}) },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IndividualExpenditure", expenditureSchema);
