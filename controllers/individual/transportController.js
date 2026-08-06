// controllers/transportController.js

const Transport = require("../../models/individual/IndividualTransport");
const Faculty = require("../../models/Faculty");
const generateIndividualRequestNumber = require("../../utils/generateIndividualRequestNumber");
const { notifyIndividualRequest } = require("../../utils/individualNotifications");

const normalizeFinanceValue = (financeRequired) => {
  if (typeof financeRequired === "string") {
    return ["yes", "true"].includes(
      financeRequired.trim().toLowerCase(),
    )
      ? "Yes"
      : "No";
  }

  return financeRequired === true ? "Yes" : "No";
};

const parseNumberField = (value) =>
  value !== undefined &&
  value !== null &&
  String(value).trim() !== ""
    ? Number(value)
    : null;

const parseStringField = (value) =>
  value !== undefined && value !== null
    ? String(value).trim()
    : "";

const buildFinanceFields = (body) => ({
  financeRequired: normalizeFinanceValue(body.financeRequired),
  advanceAmount: parseNumberField(body.advanceAmount),
  estimatedAmount: parseNumberField(body.estimatedAmount),
  advancePurpose: parseStringField(body.advancePurpose),
});

const validateFinanceFields = ({
  financeRequired,
  estimatedAmount,
  advanceAmount,
  advancePurpose,
}) => {
  if (String(financeRequired) === "Yes") {
    if (
      estimatedAmount === null ||
      estimatedAmount === undefined ||
      Number.isNaN(estimatedAmount)
    ) {
      return {
        valid: false,
        message:
          "Estimated Amount is required when Finance Required is Yes.",
      };
    }

    if (
      advanceAmount === null ||
      advanceAmount === undefined ||
      Number.isNaN(advanceAmount) ||
      advancePurpose === ""
    ) {
      return {
        valid: false,
        message:
          "Advance Amount and Purpose of Advance are required when Finance Required is Yes.",
      };
    }
  }

  return { valid: true };
};

const normalizeFileReference = (file) => {
  if (!file) return null;

  return {
    url: file.path || file.secure_url || file.url || "",
    publicId: file.filename || file.public_id || "",
  };
};

// ==============================
// CREATE TRANSPORT
// ==============================
exports.createTransport = async (req, res) => {
  
  try {
    // console.log("BODY =>", req.body);
    // console.log("FILES =>", req.files);

    const body = {
      ...req.body,
      employee: req.user?.facultyId || req.body.employee || req.user?._id,

      financeRequired: normalizeFinanceValue(
        req.body.financeRequired,
      ),
      advanceAmount: parseNumberField(req.body.advanceAmount),
      estimatedAmount: parseNumberField(req.body.estimatedAmount),
      advancePurpose: parseStringField(req.body.advancePurpose),
      

      // Parse multipart/form-data JSON fields
      checkpoints: req.body.checkpoints
        ? JSON.parse(req.body.checkpoints)
        : [],

      vehicles: req.body.vehicles
        ? JSON.parse(req.body.vehicles)
        : [],

      accompanyingStaff: req.body.accompanyingStaff
        ? JSON.parse(req.body.accompanyingStaff)
        : [],

      totalPassengers: Number(
        req.body.totalPassengers
      ),

      numberOfBusNeeded: Number(
        req.body.numberOfBusNeeded
      ),

      numberOfAccompanyingStaff: Number(
        req.body.numberOfAccompanyingStaff
      ),
    };

    // ======== Finance validation & workflowStage =========
    const financeFields = buildFinanceFields(req.body);
    const validation = validateFinanceFields(financeFields);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    if (financeFields.financeRequired === "Yes") {
      body.financeRequired = "Yes";
      body.advanceAmount = financeFields.advanceAmount;
      body.estimatedAmount = financeFields.estimatedAmount;
      body.advancePurpose = financeFields.advancePurpose;
      body.workflowStage = "Submitted";
    } else {
      body.financeRequired = "No";
      body.advanceAmount = null;
      body.estimatedAmount = null;
      body.advancePurpose = "";
      body.workflowStage = "Submitted";
    }

    // =====================================
    // PRINCIPAL APPROVAL FORM
    // =====================================

    if (
      req.files?.principalApprovalForm?.length
    ) {
      const file =
        req.files.principalApprovalForm[0];

      body.principalApprovalForm =
        normalizeFileReference(file);
    }

    // =====================================
    // REFERENCE FILES
    // =====================================

    const uploadedFiles =
      req.files?.referenceFiles ||
      req.files?.files ||
      req.files?.attachments;

    if (
      uploadedFiles &&
      uploadedFiles.length > 0
    ) {
      body.referenceFiles =
        uploadedFiles
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    body.status = "Pending";
    body.finalStatus = "Pending";
    body.workflowStage = "Submitted";
    const requestNumbering = await generateIndividualRequestNumber(
      "TRANSPORT",
      req.user?.department || req.body.department || "UNKNOWN",
      null,
      { returnDetails: true }
    );
    body.requestNo = requestNumbering.requestNo;
    body.module = requestNumbering.moduleName;
    body.financialYear = requestNumbering.financialYear;
    body.departmentCode = requestNumbering.departmentCode;
    body.requestSequence = requestNumbering.requestSequence;
    body.departmentSequence = requestNumbering.departmentSequence;
    body.approvalHistory = [
      {
        role: "faculty",
        approvedBy: body.employee,
        action: "Submitted",
        remarks: "Request Submitted",
        actionDate: new Date(),
      },
      {
        role: "hod",
        approvedBy: null,
        action: "Pending",
        remarks: "Waiting for HOD approval",
        actionDate: null,
      },
    ];

    const transport =
      await Transport.create(body);
    const facultyDoc = await Faculty.findById(body.employee)
      .select("empId name email")
      .lean();

    const requesterEmail = req.user?.email || req.body.employeeEmail || req.body.email || null;
    const employeeDetail = facultyDoc
      ? {
          name: facultyDoc.name || req.user?.name || req.body?.employeeName || "The requester",
          email: facultyDoc.email || requesterEmail,
        }
      : {
          name: req.user?.name || req.body?.employeeName || "The requester",
          email: requesterEmail,
        };

    await notifyIndividualRequest({
      request: {
        ...transport.toObject(),
        employeeDetail,
        employeeEmail: requesterEmail,
        email: requesterEmail,
      },
      moduleName: "transport",
      action: "submitted",
      actorName: req.user?.name || req.body?.employeeName || "The requester",
      roleHint: body.financeRequired === "Yes" ? "super-admin2" : "super-admin1",
    });

    res.status(201).json({
      success: true,
      message:
        "Transport created successfully",
      data: {
        ...transport.toObject(),
        empId: facultyDoc?.empId || null,
        requestNo: transport.requestNo,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ALL TRANSPORTS
// ==============================
exports.getAllTransports = async (req, res) => {
  try {
    const transports = await Transport.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transports.length,
      data: transports,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE TRANSPORT
// ==============================
exports.getSingleTransport = async (req, res) => {
  try {
    const transport = await Transport.findById(
      req.params.id
    ).populate("employee");

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transport,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE TRANSPORT
// ==============================
exports.updateTransport = async (req, res) => {
  try {
    const updateBody = { ...req.body };
    const financeFieldsPresent = [
      "financeRequired",
      "estimatedAmount",
      "advanceAmount",
      "advancePurpose",
    ].some((key) => req.body.hasOwnProperty(key));

    if (financeFieldsPresent) {
      const financeFields = buildFinanceFields(req.body);
      const validation = validateFinanceFields(financeFields);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      updateBody.financeRequired = financeFields.financeRequired;

      if (financeFields.financeRequired === "Yes") {
        updateBody.advanceAmount = financeFields.advanceAmount;
        updateBody.estimatedAmount = financeFields.estimatedAmount;
        updateBody.advancePurpose = financeFields.advancePurpose;
      } else {
        updateBody.advanceAmount = null;
        updateBody.estimatedAmount = null;
        updateBody.advancePurpose = "";
      }
    }

    const transport =
      await Transport.findByIdAndUpdate(
        req.params.id,
        updateBody,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Transport updated successfully",
      data: transport,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DELETE TRANSPORT
// ==============================
exports.deleteTransport = async (req, res) => {
  try {
    const transport =
      await Transport.findByIdAndDelete(
        req.params.id
      );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Transport deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// PATCH TRANSPORT
// ==============================
exports.patchTransport = async (req, res) => {
  try {
    // console.log("BODY =>", req.body);

    if (
      !req.body ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
      });
    }

    const transport = await Transport.findById(
      req.params.id
    );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    const financeFieldsPresent = [
      "financeRequired",
      "estimatedAmount",
      "advanceAmount",
      "advancePurpose",
    ].some((key) => req.body.hasOwnProperty(key));

    if (financeFieldsPresent) {
      const financeFields = buildFinanceFields(req.body);
      const validation = validateFinanceFields(financeFields);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      transport.financeRequired = financeFields.financeRequired;

      if (financeFields.financeRequired === "Yes") {
        transport.advanceAmount = financeFields.advanceAmount;
        transport.estimatedAmount = financeFields.estimatedAmount;
        transport.advancePurpose = financeFields.advancePurpose;
      } else {
        transport.advanceAmount = null;
        transport.estimatedAmount = null;
        transport.advancePurpose = "";
      }
    }

    // UPDATE ONLY SENT FIELDS
    Object.keys(req.body).forEach((key) => {
      transport[key] = req.body[key];
    });

    await transport.save();

    res.status(200).json({
      success: true,
      message:
        "Transport patched successfully",
      data: transport,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// controllers/dashboardController.js

exports.getTransportDashboard = async (req, res) => {
  try {
    // ==============================
    // CARD COUNTS
    // ==============================

    const totalRequests =
      await Transport.countDocuments();

    const completedRequests =
      await Transport.countDocuments({
        status: "Completed",
      });

    const acknowledgedRequests =
      await Transport.countDocuments({
        status: "Approved",
      });

    const pendingAcknowledgementRequests =
      await Transport.countDocuments({
        status: "Pending",
      });

    // ==============================
    // DEPARTMENT WISE
    // ==============================

    const departmentWise =
      await Transport.aggregate([
        {
          $lookup: {
            from: "faculties",
            localField: "employee",
            foreignField: "_id",
            as: "facultyData",
          },
        },

        {
          $unwind: "$facultyData",
        },

        {
          $group: {
            _id: "$facultyData.department",
            total: { $sum: 1 },
          },
        },

        {
          $project: {
            _id: 0,
            department: "$_id",
            total: 1,
          },
        },
      ]);

    // ==============================
    // LATEST REQUESTS
    // ==============================

    const latestRequests =
      await Transport.find()
        .populate("employee")
        .sort({ createdAt: -1 })
        .limit(10);

    // ==============================
    // RESPONSE
    // ==============================

    res.status(200).json({
      success: true,

      cards: {
        totalRequests,
        completedRequests,
        acknowledgedRequests,
        pendingAcknowledgementRequests,
      },

      departmentWise,

      latestRequests,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};