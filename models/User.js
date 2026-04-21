const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String },

    isFirstTimeLogin: { type: Boolean, default: false },

    hasAccess: { type: Boolean, default: true },

    facultyId: {
      type: mongoose.Types.ObjectId,
      ref: "Faculty",
      unique: true,
      required: true,
    },
    
    resetOtp: String,
    resetOtpExpiry: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
