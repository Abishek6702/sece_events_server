const mongoose = require("mongoose");

const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

const checkpointSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
});

const transportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    requestNo: {
      type: String,
      required: true,
      unique: true,
    },
    principalApprovalForm: {
      url: {
        type: String,
      },

      publicId: {
        type: String,
      },

      fileName: {
        type: String,
      },
    },
    pickupDateTime: {
      type: Date,
      required: true,
    },

    dropDateTime: {
      type: Date,
      required: true,
    },

    pickupLocation: {
      type: String,
      required: true,
    },

    checkpoints: [checkpointSchema],

    dropLocation: {
      type: String,
      required: true,
    },

    totalPassengers: {
      type: Number,
      required: true,
    },

    vehicles: [
      {
        type: { type: String },
        count: Number,
      },
    ],

    numberOfBusNeeded: {
      type: Number,
      required: true,
    },

    numberOfAccompanyingStaff: {
      type: Number,
      required: true,
    },

    accompanyingStaff: [
      {
        name: { type: String, trim: true },
        mobile: { type: Number },
      },
    ],

    specialRequirements: {
      type: String,
    },

    referenceFiles: [fileReferenceSchema],

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

    adminApproval: {
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
    },

    hodApproval: {
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
    },

    departmentApproval: {
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
    },

    superAdminApproval: {
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
      },
      reason: {
        type: String,
        default: "",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },

    headApproval: {
      status: {
        type: String,
        enum: ["Pending", "Acknowledged", "Completed", "Approved", "Rejected"],
        default: "Pending",
      },
      reason: {
        type: String,
        default: "",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
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
      required: true,
      default: "No",
    },

    advanceAmount: {
      type: Number,
      default: null,
    },

    advancePurpose: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

transportSchema.index({ employee: 1, createdAt: -1 });
transportSchema.index({ workflowStage: 1, createdAt: -1 });
transportSchema.index({ "adminApproval.status": 1, createdAt: -1 });

module.exports = mongoose.model("IndividualTransport", transportSchema);
