const mongoose = require("mongoose");

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
    transportNumber: { type: String, required: true, trim: true },
    travelClass: { type: String, required: true, trim: true },
    numberOfPassengers: { type: Number, required: true, min: 1 },
    specialRequirements: { type: String, default: "", trim: true },
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
    onDutyFrom: { type: Date, required: true },
    onDutyTo: { type: Date, required: true },
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

individualEventAttendingSchema.pre("validate", async function validateTransport() {
  if (!this.externalTransportRequired) {
    this.externalTransport = [];
    return;
  }

  if (!this.externalTransport.length) {
    throw new Error("externalTransport is required when externalTransportRequired is true.");
  }

  const invalidEntry = this.externalTransport.find(
    (entry) => entry.passengers.length !== entry.numberOfPassengers,
  );
  if (invalidEntry) {
    throw new Error("numberOfPassengers must match the passengers array length.");
  }
});

module.exports = mongoose.model("IndividualEventAttending", individualEventAttendingSchema);
