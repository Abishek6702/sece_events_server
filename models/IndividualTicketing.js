const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1 },
    organization: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const approvalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    reason: { type: String, default: "" },
  },
  { _id: false },
);

const ticketHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    role: { type: String, default: "" },
    details: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const individualTicketingSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    travelOption: { type: String, required: true, trim: true },
    travelDate: { type: Date, required: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    flightNumber: { type: String, default: "", trim: true },
    travelClass: { type: String, required: true, trim: true },
    numberOfPassengers: { type: Number, required: true, min: 1 },
    specialRequirements: { type: String, default: "", trim: true },
    passengers: { type: [passengerSchema], required: true, default: [] },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Acknowledged", "Completed", "Rejected"],
      default: "Pending",
    },
    superAdmin1Approval: { type: approvalSchema, default: () => ({ status: "Pending" }) },
    superAdmin2Approval: { type: approvalSchema, default: () => ({ status: "Pending" }) },
    history: { type: [ticketHistorySchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IndividualTicketing", individualTicketingSchema);
