const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Faculty = require("../models/Faculty");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

const parseDate = (value) => {
  if (!value) return null;

  // Already a JS Date
  if (value instanceof Date) return value;

  // Excel serial number
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    return new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d
    );
  }

  // String
  if (typeof value === "string") {
    const str = value.trim();

    // DD-MM-YYYY or DD/MM/YYYY
    const parts = str.split(/[-/]/);

    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);

      return new Date(year, month - 1, day);
    }

    // fallback
    const d = new Date(str);
    if (!isNaN(d)) return d;
  }

  return null;
};
// ================= IMPORT EXCEL =================
const XLSX = require("xlsx");

exports.importExcelFaculty = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 👉 read excel buffer
    const workbook = XLSX.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 👉 convert to JSON
    const faculties = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(faculties)) {
      return res.status(400).json({ message: "Invalid Excel format" });
    }

    const created = [];

    for (let data of faculties) {
      // map column names (IMPORTANT)
      const facultyData = {
        salutation: data.salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        empId: data.empId,
        email: data.email,
        phone: data.phone,
        department: data.department,
        originalDepartment: data.originalDepartment,
        dob: parseDate(data.dob), 
        gender: data.gender,
        doj: parseDate(data.doj),
        designation: data.designation,
        employeeCategory: data.employeeCategory,
        location: data.location,
      };

      const exists = await Faculty.findOne({
        $or: [{ email: facultyData.email }, { empId: facultyData.empId },   { phone: facultyData.phone },],
      });

      if (exists) continue;

      const faculty = await Faculty.create(facultyData);

      const password = "Sece@123";
      const hashed = await bcrypt.hash(password, 10);

      await User.create({
        name: `${faculty.salutation} ${faculty.firstName} ${faculty.lastName}`,
        email: facultyData.email,
        phone: facultyData.phone,
        password: hashed,
        department: faculty.department,
        role: data.role?.toLowerCase() === "hod" ? "hod" : "faculty",
        isadmin: false,
        facultyId: faculty._id,
        isFirstTimeLogin: true,
      });

      created.push(faculty);
    }

    res.status(201).json({
      message: "Excel imported successfully",
      count: created.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
// ================= ADD SINGLE =================
exports.addIndividualFaculty = async (req, res) => {
  try {
    const {
      salutation,
      firstName,
      lastName,
      empId,
      email,
      phone,
      department,
      originalDepartment,
      dob,
      gender,
      doj,
      designation,
      employeeCategory,
      location,
      profileImage,
      role,
    } = req.body;

    // ✅ Validation
    if (
      !firstName ||
      !lastName ||
      !empId ||
      !email ||
      !phone ||
      !department ||
      !originalDepartment ||
      !dob ||
      !gender ||
      !doj ||
      !designation ||
      !employeeCategory ||
      !location
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // ✅ Duplicate check
    const exists = await Faculty.findOne({
      $or: [{ email }, { empId }, { phone }],
    });

    if (exists) {
      return res.status(400).json({
        message: "Faculty with same email/empId/phone already exists",
      });
    }

    // ✅ Create faculty
    const faculty = await Faculty.create({
      salutation,
      firstName,
      lastName,
      empId,
      email,
      phone,
      department,
      originalDepartment,
      dob: new Date(dob),
      gender,
      doj: new Date(doj),
      designation,
      employeeCategory,
      location,
      profileImage,
    });

    // ✅ Generate password (consistent with Excel)
    const password = "Sece@123";
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create login
    await User.create({
      name: `${salutation} ${firstName} ${lastName}`,
      email,
      phone,
      password: hashed,
      department: faculty.department,
      role: role === "hod" ? "hod" : "faculty",
      isadmin: false,
      facultyId: faculty._id,
      isFirstTimeLogin: true,
    });

    res.status(201).json({
      message: "Faculty added successfully",
      defaultPassword: password, // remove in production if needed
      data: faculty,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ================= GET ALL =================
exports.getFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find().sort({ createdAt: -1 });

    res.status(200).json(faculties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchFaculty = async (req, res) => {
  try {
    const { q = "" } = req.query;

    const faculties = await Faculty.find({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { empId: { $regex: q, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: ["$firstName", " ", "$lastName"],
              },
              regex: q,
              options: "i",
            },
          },
        },
      ],
    })
      .select(
        "_id salutation firstName lastName empId designation department phone email",
      )
      .limit(10);

    const result = faculties.map((faculty) => ({
      facultyId: faculty._id,
      empId: faculty.empId,
      name: `${faculty.salutation} ${faculty.firstName} ${faculty.lastName}`,
      designation: faculty.designation,
      phone: faculty.phone,
      email: faculty.email,
      department: faculty.department,
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GET ONE =================
exports.getFacultyId = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.status(200).json(faculty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= EDIT =================
exports.editFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const faculty = await Faculty.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // update user also (name/email sync)
    await User.findOneAndUpdate(
      { facultyId: id },
      {
        name: `${data.salutation} ${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        department: data.department,
      },
    );

    res.status(200).json({
      message: "Faculty updated successfully",
      data: faculty,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= DELETE =================
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findByIdAndDelete(id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // delete linked user
    await User.findOneAndDelete({ facultyId: id });

    res.status(200).json({
      message: "Faculty and login deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (faculty.profileImage?.publicId) {
      await cloudinary.uploader.destroy(faculty.profileImage.publicId);
    }

    faculty.profileImage = {
      url: req.file.path,
      publicId: req.file.filename,
    };

    await faculty.save();

    res.status(200).json({
      message: "Profile image uploaded successfully",
      data: faculty.profileImage,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (!faculty.profileImage?.publicId) {
      return res.status(400).json({ message: "No image to delete" });
    }

    await cloudinary.uploader.destroy(faculty.profileImage.publicId);

    faculty.profileImage = null;
    await faculty.save();

    res.status(200).json({
      message: "Profile image deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
