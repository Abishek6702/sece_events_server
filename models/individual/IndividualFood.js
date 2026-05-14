const mongoose = require("mongoose");

const accompanyingStaffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    mobile: {
      type: Number,
    },
  },
  { _id: false },
);

const foodTypeSchema = new mongoose.Schema(
  {
    foodTypes: [
      {
        type: { type: String },

        participants: {
          vegCount: Number,
          nonVegCount: Number,
        },

        vipGuests: {
          vegCount: Number,
          nonVegCount: Number,
        },
      },
    ],

    participants: {
      vegCount: {
        type: Number,
        default: 0,
      },

      nonVegCount: {
        type: Number,
        default: 0,
      },
    },

    vipGuests: {
      vegCount: {
        type: Number,
        default: 0,
      },

      nonVegCount: {
        type: Number,
        default: 0,
      },
    },
  },
  { _id: false },
);

const foodSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    resourcePersonType: [{ type: String, trim: true }],

    numberOfResourcePersons: {
      type: Number,
      required: true,
    },

    numberOfInternalAccompanyingStaff: {
      type: Number,
      required: true,
    },

    accompanyingStaff: [accompanyingStaffSchema],

    foodTypes: [foodTypeSchema],

    specialRequirements: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Food", foodSchema);
