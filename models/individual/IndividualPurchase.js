// models/purchase/Purchase.js

const mongoose = require("mongoose");

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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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

    purchases: [purchaseItemSchema],

    status: {
      type: departmentStatusSchema,
      default: () => ({
        admin: "Pending",
        accounts: "Pending",
        purchase: "Pending",
      }),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("IndividualPurchase", purchaseSchema);