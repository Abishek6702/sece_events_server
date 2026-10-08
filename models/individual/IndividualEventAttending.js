const mongoose = require("mongoose");
const { toIstIndividualEventAttendingResponse } = require("../../utils/individualEventAttendingDateTime");

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1 },
    organization: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const externalTransportSchema = new mongoose.Schema(
  {
    travelOption: { type: String, required: true, trim: true },
    travelDate: { type: Date, required: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    classOrBerth: { type: String, required: true, trim: true },
    passengers: { type: [passengerSchema], required: true },
  },
  { _id: true },
);

const referenceFileSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

const approvalSchema = {
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  reason: {
    type: String,
    default: "",
  },
  updatedAt: {
    type: Date,
    default: null,
  },
};

const userApprovalSchema = {
  ...approvalSchema,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
};

const individualEventAttendingSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestNo: {
      type: String,
      required: true,
      unique: true,
    },
    module: {
      type: String,
      required: true,
      default: "EVENTATTENDING",
    },
    financialYear: {
      type: String,
      required: true,
    },
    departmentCode: {
      type: String,
      required: true,
    },
    requestSequence: {
      type: Number,
      required: true,
    },
    departmentSequence: {
      type: Number,
      required: true,
    },
    requestType: { type: String, default: "individualEventAttending", immutable: true },
    programType: { type: String, required: true, trim: true },
    programName: { type: String, required: true, trim: true },
    numberOfParticipants: { type: Number, required: true, min: 1 },
    participants: { type: [participantSchema], required: true, default: [] },
    expectedOutcome: { type: String, required: true, trim: true },
    programFromDate: { type: Date, required: true },
    programToDate: { type: Date, required: true },
    onDutyFrom: { type: Date },
    onDutyTo: { type: Date},
    offCampusFrom: { type: Date, default: null },
    offCampusTo: { type: Date, default: null },
    specialRequirement: { type: String, trim: true, default: "" },
    otherRequirements: { type: String, trim: true, default: "" },
    accommodation: { type: String, trim: true, default: "" },
    accommodationRequired: { type: Boolean, default: false },
    accommodationAmount: { type: Number, default: null },
    food: { type: String, trim: true, default: "" },
    foodRequired: { type: Boolean, default: false },
    foodAmount: { type: Number, default: null },
    transport: { type: String, trim: true, default: "" },
    transportRequired: { type: Boolean, default: false },
    transportAmount: { type: Number, default: null },
    principalApprovalFormName: { type: String, trim: true, default: "" },
    externalTransportRequired: { type: Boolean, default: false },
    externalTransport: { type: [externalTransportSchema], default: [] },
    workflowStage: {
      type: String,
      enum: [
        "Submitted",
        "SuperAdmin1",
        "SuperAdmin2",
        "AdminApproved",
        "DepartmentReview",
        "Approved",
        "Rejected",
        "Completed",
      ],
      default: "Submitted",
    },
    adminApproval: approvalSchema,
    hodApproval: approvalSchema,
    departmentApproval: approvalSchema,
    superAdmin1Approval: userApprovalSchema,
    superAdmin2Approval: userApprovalSchema,
    superAdminApproval: userApprovalSchema,
    headApproval: {
      ...userApprovalSchema,
      status: {
        type: String,
        enum: ["Pending", "Acknowledged", "Completed", "Approved", "Rejected"],
        default: "Pending",
      },
    },
    finalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed", "Closed"],
      default: "Pending",
    },
    approvalHistory: [
      {
        role: String,
        approvedBy: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        action: {
          type: String,
          enum: ["Submitted", "Pending", "Approved", "Rejected", "Acknowledged", "Completed"],
        },
        remarks: {
          type: String,
          default: "",
        },
        actionDate: {
          type: Date,
          default: null,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },
    financeRequired: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    advanceAmount: {
      type: Number,
      default: null,
    },
    advanceToBeReceivedWithin: {
      type: Number,
      default: null,
    },
    estimatedAmount: {
      type: Number,
      default: null,
    },
    advancePurpose: {
      type: String,
      trim: true,
      default: "",
    },
    referenceFiles: { type: [referenceFileSchema], default: [] },
  },
  { timestamps: true },
);

individualEventAttendingSchema.set("toJSON", {
  transform: (_document, returned) => toIstIndividualEventAttendingResponse(returned),
});

individualEventAttendingSchema.pre("validate", async function validateTransport() {
  if (!this.externalTransportRequired) {
    this.externalTransport = [];
    return;
  }

  if (!this.externalTransport.length) {
    throw new Error("externalTransport is required when externalTransportRequired is true.");
  }

  const missingPassengers = this.externalTransport.find((entry) => !entry.passengers?.length);
  if (missingPassengers) {
    throw new Error("Each external transport must include at least one passenger.");
  }
});

module.exports = mongoose.model("IndividualEventAttending", individualEventAttendingSchema);
