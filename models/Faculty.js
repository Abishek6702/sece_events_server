const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    empId: { type: String, required: true, Unique: true },
    email: { type: String, required: true, Unique: true },
    phone: { type: Number, required: true, Unique: true },
    department: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true, enum: ["Male", "Female", "Other"] },
    doj: { type: Date, required: true },
    designation: { type: String, required: true },
    employeeCategory: {
      type: String,
      required: true,
      enum: ["Teaching", "Non-Teaching"],
    },
    employmentStatus: { type: Boolean, default: true },
    location: { type: String, required: true },
    profileImage: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Faculty", facultySchema);
