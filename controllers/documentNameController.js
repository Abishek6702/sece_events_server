const xlsx = require("xlsx");
const DocumentName = require("../models/DocumentName");

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeDocumentName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

exports.createDocumentName = async (req, res) => {
  try {
    const name = normalizeDocumentName(req.body.name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Document name is required",
      });
    }

    const existing = await DocumentName.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Document name already exists",
      });
    }

    const documentName = await DocumentName.create({
      name,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Document name created successfully",
      data: documentName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllDocumentNames = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = active === "true" ? { isActive: true } : active === "false" ? { isActive: false } : {};

    const documentNames = await DocumentName.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: documentNames.length,
      data: documentNames,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDocumentNameById = async (req, res) => {
  try {
    const documentName = await DocumentName.findById(req.params.id);

    if (!documentName) {
      return res.status(404).json({
        success: false,
        message: "Document name not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: documentName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDocumentName = async (req, res) => {
  try {
    const documentName = await DocumentName.findById(req.params.id);

    if (!documentName) {
      return res.status(404).json({
        success: false,
        message: "Document name not found",
      });
    }

    if (req.body.name !== undefined) {
      const newName = normalizeDocumentName(req.body.name);

      if (!newName) {
        return res.status(400).json({
          success: false,
          message: "Document name cannot be empty",
        });
      }

      const duplicate = await DocumentName.findOne({
        _id: { $ne: documentName._id },
        name: { $regex: new RegExp(`^${escapeRegExp(newName)}$`, "i") },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Document name already exists",
        });
      }

      documentName.name = newName;
    }

    if (req.body.isActive !== undefined) {
      documentName.isActive = req.body.isActive;
    }

    await documentName.save();

    return res.status(200).json({
      success: true,
      message: "Document name updated successfully",
      data: documentName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.toggleDocumentStatus = async (req, res) => {
  try {
    const documentName = await DocumentName.findById(req.params.id);

    if (!documentName) {
      return res.status(404).json({
        success: false,
        message: "Document name not found",
      });
    }

    documentName.isActive = !documentName.isActive;
    await documentName.save();

    return res.status(200).json({
      success: true,
      message: `Document name ${documentName.isActive ? "activated" : "deactivated"} successfully`,
      data: documentName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteDocumentName = async (req, res) => {
  try {
    const documentName = await DocumentName.findByIdAndDelete(req.params.id);

    if (!documentName) {
      return res.status(404).json({
        success: false,
        message: "Document name not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document name deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.importDocumentNamesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No Excel file uploaded",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty or no data rows were found",
      });
    }

    const imported = [];
    const skipped = [];

    for (const row of rows) {
      const cleanRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [String(key).trim(), value]),
      );

      const name = normalizeDocumentName(
        cleanRow.Name ||
          cleanRow["Document Name"] ||
          cleanRow["document name"] ||
          cleanRow.Document ||
          cleanRow.documentName,
      );

      if (!name) {
        skipped.push({ row, reason: "Missing document name" });
        continue;
      }

      const existing = await DocumentName.findOne({
        name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, "i") },
      });

      if (existing) {
        skipped.push({ name, reason: "Already exists" });
        continue;
      }

      const documentName = await DocumentName.create({
        name,
        isActive:
          cleanRow.isActive !== undefined
            ? String(cleanRow.isActive).toLowerCase() !== "false"
            : true,
      });

      imported.push(documentName);
    }

    return res.status(201).json({
      success: true,
      message: "Document names imported successfully",
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      data: imported,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
