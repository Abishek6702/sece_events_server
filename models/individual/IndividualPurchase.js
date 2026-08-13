// models/purchase/Purchase.js

const mongoose = require("mongoose");

const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

// ==============================
// STATUS SCHEMA
// ==============================
const departmentStatusSchema = new mongoose.Schema(
  {
    admin: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    accounts: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    purchase: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { _id: false },
);

// ==============================
// REQUIREMENT
// ==============================
const requirementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Certificate", "ID Card"],
    },

    hardCount: Number,

    softCount: Number,
  },
  { _id: false },
);

// ==============================
// TROPHY
// ==============================
const trophySchema = new mongoose.Schema(
  {
    trophyType: {
      type: String,
      enum: ["Basic", "Elite"],
    },

    quantity: Number,
  },
  { _id: false },
);

// ==============================
// VOUCHER
// ==============================
const voucherSchema = new mongoose.Schema(
  {
    voucherWorth: {
      type: String,
      enum: ["500", "1000", "2000", "5000"],
    },

    quantity: Number,
  },
  { _id: false },
);

// ==============================
// GIFT ITEM
// ==============================
const giftItemSchema = new mongoose.Schema(
  {
    giftType: {
      type: String,
      enum: ["Trophy", "Glass Cup", "Voucher"],
    },

    trophy: [trophySchema],

    cashPrizeAmount: Number,

    voucher: [voucherSchema],
  },
  { _id: false },
);

// ==============================
// PERSON
// ==============================
const personSchema = new mongoose.Schema(
  {
    giftItems: [giftItemSchema],

    registrationKitNeeded: Boolean,

    registrationKitQty: Number,

    specialRequirements: String,
  },
  { _id: false },
);

// ==============================
// PURCHASE ITEM
// ==============================
const purchaseItemSchema = new mongoose.Schema(
  {
    dayIndex: {
      type: Number,
      required: true,
    },

    deliveryDate: {
      type: Date,
      required: true,
    },

    requirementNeeded: [requirementSchema],

    requiredFor: [String],

    students: personSchema,

    guests: personSchema,
  },
  { _id: false },
);

// ==============================
// MAIN PURCHASE SCHEMA
// ==============================
const purchaseSchema = new mongoose.Schema(
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

    module: {
      type: String,
      required: true,
      default: "PURCHASE",
    },

    financialYear: {
      type: String,
      required: true,
      default: "",
    },

    departmentCode: {
      type: String,
      required: true,
      default: "",
    },

    requestSequence: {
      type: Number,
      default: 0,
    },

    departmentSequence: {
      type: Number,
      default: 0,
    },

    advanceToBeReceviedWithin: {
      type: Number,
    },

    purchases: [purchaseItemSchema],

    referenceFiles: [fileReferenceSchema],
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

    overallStatus: {
      type: String,
      enum: [
        "Pending",
        "AdminApproved",
        "DepartmentReview",
        "Approved",
        "Rejected",
        "Completed",
      ],
      default: "Pending",
    },

    status: {
      type: departmentStatusSchema,
      default: () => ({
        admin: "Pending",
        accounts: "Pending",
        purchase: "Pending",
      }),
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

    estimatedAmount: {
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

purchaseSchema.index({ employee: 1, createdAt: -1 });
purchaseSchema.index({ overallStatus: 1, createdAt: -1 });
purchaseSchema.index({ "status.admin": 1, createdAt: -1 });

module.exports = mongoose.model("IndividualPurchase", purchaseSchema);
