const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

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
      const facultyRole =
        data.role?.toLowerCase() === "hod"
          ? "hod"
          : (data.role ? String(data.role).trim().toLowerCase() : "faculty");

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
        role: facultyRole,
      };

      const exists = await Faculty.findOne({
        $or: [{ email: facultyData.email }, { empId: facultyData.empId }, { phone: facultyData.phone }],
      });

      if (exists) continue;

      const faculty = await Faculty.create(facultyData);

      const password = "Sece@123";
      const hashed = await bcrypt.hash(password, 10);

      await User.create({
        name: `${faculty.salutation || ""} ${faculty.firstName} ${faculty.lastName}`.trim(),
        email: facultyData.email,
        phone: String(facultyData.phone),
        password: hashed,
        department: faculty.department,
        role: facultyRole,
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

    const assignedRole =
      typeof role === "string" && role.toLowerCase() === "hod"
        ? "hod"
        : (role || "faculty");

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
      role: assignedRole,
      profileImage,
    });

    // ✅ Generate password (consistent with Excel)
    const password = "Sece@123";
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create login
    await User.create({
      name: `${salutation || ""} ${firstName} ${lastName}`.trim(),
      email,
      phone: String(phone),
      password: hashed,
      department: faculty.department,
      role: assignedRole,
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
    const faculties = await Faculty.find().sort({ createdAt: -1 }).lean();
    const facultyIds = faculties.map((f) => f._id);
    const emails = faculties.map((f) => f.email).filter(Boolean);

    const users = await User.find({
      $or: [
        { facultyId: { $in: facultyIds } },
        { email: { $in: emails } },
      ],
    })
      .select("facultyId email role department")
      .lean();

    const userByFacultyId = new Map();
    const userByEmail = new Map();
    for (const u of users) {
      if (u.facultyId) {
        userByFacultyId.set(String(u.facultyId), u);
      }
      if (u.email) {
        userByEmail.set(u.email.toLowerCase(), u);
      }
    }

    const data = faculties.map((faculty) => {
      const linkedUser =
        userByFacultyId.get(String(faculty._id)) ||
        (faculty.email ? userByEmail.get(faculty.email.toLowerCase()) : null);

      return {
        ...faculty,
        role: linkedUser?.role || faculty.role || "faculty",
      };
    });

    res.status(200).json(data);
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
        "_id salutation firstName lastName empId designation department phone email role",
      )
      .limit(10)
      .lean();

    const result = faculties.map((faculty) => ({
      facultyId: faculty._id,
      empId: faculty.empId,
      name: `${faculty.salutation || ""} ${faculty.firstName} ${faculty.lastName}`.trim(),
      designation: faculty.designation,
      phone: faculty.phone,
      email: faculty.email,
      department: faculty.department,
      role: faculty.role || "faculty",
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

    const faculty = await Faculty.findById(id).lean();

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const linkedUser = await User.findOne({
      $or: [{ facultyId: id }, { email: faculty.email }],
    })
      .select("role department email")
      .lean();

    res.status(200).json({
      ...faculty,
      role: linkedUser?.role || faculty.role || "faculty",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= EDIT =================
exports.editFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existingFaculty = await Faculty.findById(id);
    if (!existingFaculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Check for unique conflict if email is changed
    if (data.email && data.email !== existingFaculty.email) {
      const emailExistsInFaculty = await Faculty.findOne({
        _id: { $ne: id },
        email: data.email,
      });
      const emailExistsInUser = await User.findOne({
        facultyId: { $ne: id },
        email: data.email,
      });
      if (emailExistsInFaculty || emailExistsInUser) {
        return res.status(400).json({
          message: "A user/faculty with this email already exists",
        });
      }
    }

    // Check for unique conflict if empId is changed
    if (data.empId && data.empId !== existingFaculty.empId) {
      const empIdExists = await Faculty.findOne({
        _id: { $ne: id },
        empId: data.empId,
      });
      if (empIdExists) {
        return res.status(400).json({
          message: "Faculty with this Employee ID already exists",
        });
      }
    }

    // Check for unique conflict if phone is changed
    if (data.phone !== undefined && String(data.phone) !== String(existingFaculty.phone)) {
      const phoneExistsInFaculty = await Faculty.findOne({
        _id: { $ne: id },
        phone: data.phone,
      });
      const phoneExistsInUser = await User.findOne({
        facultyId: { $ne: id },
        phone: String(data.phone),
      });
      if (phoneExistsInFaculty || phoneExistsInUser) {
        return res.status(400).json({
          message: "A user/faculty with this phone number already exists",
        });
      }
    }

    // Determine role update
    let roleToSet;
    if (data.role !== undefined && data.role !== null && data.role !== "") {
      roleToSet =
        typeof data.role === "string" && data.role.toLowerCase() === "hod"
          ? "hod"
          : data.role;
      data.role = roleToSet;
    }

    const faculty = await Faculty.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    // Build user update object
    const userUpdate = {};

    // Sync name
    const salutation =
      data.salutation !== undefined
        ? data.salutation
        : (faculty.salutation || "");
    const firstName =
      data.firstName !== undefined
        ? data.firstName
        : (faculty.firstName || "");
    const lastName =
      data.lastName !== undefined
        ? data.lastName
        : (faculty.lastName || "");
    const nameParts = [salutation, firstName, lastName]
      .map((s) => (s ? String(s).trim() : ""))
      .filter(Boolean);
    if (nameParts.length > 0) {
      userUpdate.name = nameParts.join(" ");
    }

    // Sync email
    if (data.email || faculty.email) {
      userUpdate.email = data.email || faculty.email;
    }

    // Sync phone
    if (data.phone !== undefined || faculty.phone !== undefined) {
      userUpdate.phone = String(
        data.phone !== undefined ? data.phone : faculty.phone,
      );
    }

    // Sync department
    if (data.department || faculty.department) {
      userUpdate.department = data.department || faculty.department;
    }

    // Sync role
    if (roleToSet !== undefined) {
      userUpdate.role = roleToSet;
    }

    // Update user linked by facultyId or fallback to old email
    let updatedUser = await User.findOneAndUpdate(
      { facultyId: id },
      { $set: userUpdate },
      { new: true },
    );

    if (!updatedUser && existingFaculty.email) {
      updatedUser = await User.findOneAndUpdate(
        { email: existingFaculty.email },
        { $set: { ...userUpdate, facultyId: faculty._id } },
        { new: true },
      );
    }

    res.status(200).json({
      message: "Faculty updated successfully",
      data: {
        ...(faculty.toObject ? faculty.toObject() : faculty),
        role: updatedUser?.role || faculty.role || roleToSet || "faculty",
      },
    });
  } catch (err) {
    console.error("Edit faculty error:", err);
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
    await User.findOneAndDelete({
      $or: [{ facultyId: id }, { email: faculty.email }],
    });

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
      try {
        const safeFilename = path.basename(faculty.profileImage.publicId);
        const filePath = path.join(__dirname, "../uploads/profiles", safeFilename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        } else {
          await cloudinary.uploader.destroy(faculty.profileImage.publicId);
        }
      } catch (err) {
        console.error("Failed to delete old profile image:", err);
      }
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

    try {
      const safeFilename = path.basename(faculty.profileImage.publicId);
      const filePath = path.join(__dirname, "../uploads/profiles", safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else {
        await cloudinary.uploader.destroy(faculty.profileImage.publicId);
      }
    } catch (err) {
      console.error("Failed to delete profile image:", err);
    }

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
