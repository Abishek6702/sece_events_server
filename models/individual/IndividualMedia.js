const mongoose = require("mongoose");

// const fileReferenceSchema = new mongoose.Schema(
//   {
//     fileUrl: String,
//     fileName: String,
//   },
//   { _id: false },
// );
const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

const sizeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Width",
        "Height",
        "Sticker",
        "Banner",
        "Flex",
        "Digital Signage",
        "Standee",
        "Printing Banner",
        "TV Display",
        "Social Media",
        "Website Banner",
        "A type Standee",
        "Id card",
        "Plug card",
        "Momento card",
        "Glass Sticker",
      ],
    },

    value: {
      type: String,
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

    requestNo: {
      type: String,
      required: true,
      unique: true,
    },

    module: {
      type: String,
      required: true,
      default: "MEDIA",
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

    dayIndex: {
      type: Number,
      default: 1,
    },

    files: [fileReferenceSchema],

    typeOfMedia: [
      {
        type: String,
        enum: ["Poster", "Video"],
      },
    ],
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

    superAdmin1Approval: {
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

    superAdmin2Approval: {
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

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
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
            "Website Banner",
            "Flex",
            "A type Standee",
            "Id card",
            "Plug card",
            "Momento card",
            "Glass Sticker"
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

individualMediaSchema.index({ employee: 1, createdAt: -1 });
individualMediaSchema.index({ workflowStage: 1, createdAt: -1 });
individualMediaSchema.index({ "adminApproval.status": 1, createdAt: -1 });

module.exports = mongoose.model("IndividualMedia", individualMediaSchema);
