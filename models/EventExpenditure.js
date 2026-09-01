const mongoose = require("mongoose");

const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

// Individual expenditure row
const expenditureRowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    billNo: {
      type: String,
    },

    date: {
      type: Date,
    },

    guestName: {
      type: String,
    },

    billAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    supportingDocuments: {
      type: [fileReferenceSchema],
      default: [],
    },
  },
  { _id: true },
);

// Income
const incomeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },

    details: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

const EventExpenditureSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },

    basicDetails: {
      eventName: {
        type: String,
      },

      guestDetails: [
        {type: String},
      ],

      organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
      },

      iqacNumber: {
        type: String,
      },
      advanceAmount: {
        type: Number,
      },
      dateOfAdvanceTaken: {
        type: Date,
      },
      purposeOfAdvanceTaken: {
        type: String,
      },
    },

    income: {
      type: [incomeSchema],
      default: [],
    },

    expenditure: {
      food: {
        type: [expenditureRowSchema],
        default: [],
      },

      accommodation: {
        type: [expenditureRowSchema],
        default: [],
      },

      transport: {
        type: [expenditureRowSchema],
        default: [],
      },

      remuneration: {
        type: [expenditureRowSchema],
        default: [],
      },

      gifts: {
        type: [expenditureRowSchema],
        default: [],
      },
      kits: {
        type: [expenditureRowSchema],
        default: [],
      },

      miscellaneous: {
        type: [expenditureRowSchema],
        default: [],
      },
      totalAmount: {
        type: Number,
      },
      remarks:{
        type:String
      }
    },

    primarySdg: {
      type: String,
    },

    secondarySdg: [
      {
        type: String,
      },
    ],
    aboutProgram: {
      type: String,
    },

    participants: {
      male: {
        withinState: {
          type: Number,
          default: 0,
        },

        outsideState: {
          type: Number,
          default: 0,
        },
      },

      female: {
        withinState: {
          type: Number,
          default: 0,
        },

        outsideState: {
          type: Number,
          default: 0,
        },
      },
    },
    editRemark: {
      type: String,
    },
    editedAt: {
      type: Date,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("EventExpenditure", EventExpenditureSchema);
