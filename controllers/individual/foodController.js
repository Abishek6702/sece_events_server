// controllers/foodController.js

const Food = require("../../models/individual/IndividualFood");
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

const parseJsonField = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

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

const normalizeFoodTypes = (rawFoodTypes) => {
  if (!Array.isArray(rawFoodTypes)) return [];

  return rawFoodTypes.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;

    if (entry.type && (entry.refreshmentCount !== undefined || entry.participants || entry.vipGuests || Array.isArray(entry.foodTypes))) {
      return {
        type: entry.type,
        refreshmentCount: Number.isFinite(Number(entry.refreshmentCount)) ? Number(entry.refreshmentCount) : 0,
        participants: entry.participants || { vegCount: 0, nonVegCount: 0 },
        vipGuests: entry.vipGuests || { vegCount: 0, nonVegCount: 0 },
        foodTypes: Array.isArray(entry.foodTypes) ? entry.foodTypes : (entry.type ? [{ type: entry.type }] : []),
      };
    }

    const firstFoodType = Array.isArray(entry.foodTypes) && entry.foodTypes.length > 0 ? entry.foodTypes[0] : null;
    return {
      type: firstFoodType?.type || entry.type || "",
      refreshmentCount: Number.isFinite(Number(entry.refreshmentCount)) ? Number(entry.refreshmentCount) : 0,
      participants: entry.participants || { vegCount: 0, nonVegCount: 0 },
      vipGuests: entry.vipGuests || { vegCount: 0, nonVegCount: 0 },
      foodTypes: Array.isArray(entry.foodTypes) ? entry.foodTypes : (firstFoodType ? [firstFoodType] : []),
    };
  }).filter((entry) => entry && typeof entry === "object");
};

// ==========================================
// CREATE FOOD
// ==========================================
exports.createFood = async (req, res) => {
  
  try {
//     console.log("BODY =>", req.body);
//     console.log("FILES =>", req.files);
//     console.log("Finance Required:", req.body.financeRequired);
// console.log("Advance Amount:", req.body.advanceAmount);
// console.log("Advance Purpose:", req.body.advancePurpose);

    const parsedFoodTypes = Array.isArray(req.body.foodTypes)
      ? req.body.foodTypes
      : (typeof req.body.foodTypes === "string" ? JSON.parse(req.body.foodTypes) : []);

    const foodData = {
      ...req.body,
      employee: req.user?.facultyId || req.body.employee || req.user?._id,
      advanceToBeReceviedWithin: parseNumberField(
        req.body.advanceToBeReceviedWithin
      ),

      resourcePersonType: req.body.resourcePersonType
        ? JSON.parse(req.body.resourcePersonType)
        : [],

      accompanyingStaff: req.body.accompanyingStaff
        ? JSON.parse(req.body.accompanyingStaff)
        : [],

      foodTypes: normalizeFoodTypes(parsedFoodTypes),

      // Finance fields - default handling will be validated below
      financeRequired: normalizeFinanceValue(
        req.body.financeRequired,
      ),
      advanceAmount: parseNumberField(req.body.advanceAmount),
      estimatedAmount: parseNumberField(req.body.estimatedAmount),
      advancePurpose: parseStringField(req.body.advancePurpose),
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
      foodData.financeRequired = "Yes";
      foodData.advanceAmount = financeFields.advanceAmount;
      foodData.estimatedAmount = financeFields.estimatedAmount;
      foodData.advancePurpose = financeFields.advancePurpose;
      foodData.workflowStage = "Submitted";
    } else {
      foodData.financeRequired = "No";
      foodData.advanceAmount = null;
      foodData.estimatedAmount = null;
      foodData.advancePurpose = "";
      foodData.workflowStage = "Submitted";
    }

    const file =
      req.files?.principalApprovalForm?.[0];

    if (file) {
      foodData.uploadedFile = {
        url: file.path,
        publicId: file.filename,
        fileName: file.originalname,
      };
    }

    foodData.status = "Pending";
    foodData.finalStatus = "Pending";
    foodData.workflowStage = "Submitted";

    const requestNumbering = await generateIndividualRequestNumber(
      "FOOD",
      req.user?.department || req.body.department || "UNKNOWN",
      null,
      { returnDetails: true }
    );

    if (!requestNumbering?.requestNo || !String(requestNumbering.requestNo).trim()) {
      throw new Error("Request number could not be generated.");
    }

    foodData.requestNo = requestNumbering.requestNo;
    foodData.module = requestNumbering.moduleName;
    foodData.financialYear = requestNumbering.financialYear;
    foodData.departmentCode = requestNumbering.departmentCode;
    foodData.requestSequence = requestNumbering.requestSequence;
    foodData.departmentSequence = requestNumbering.departmentSequence;
    foodData.approvalHistory = [
      {
        role: "faculty",
        approvedBy: foodData.employee,
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

    const food = await Food.create(foodData);
    const facultyDoc = await Faculty.findById(foodData.employee)
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
        ...food.toObject(),
        employeeDetail,
        employeeEmail: requesterEmail,
        email: requesterEmail,
      },
      moduleName: "food",
      action: "submitted",
      actorName: req.user?.name || req.body?.employeeName || "The requester",
      roleHint: "super-admin",
    });

    res.status(201).json({
      success: true,
      message: "Food request created successfully",
      data: {
        ...food.toObject(),
        empId: facultyDoc?.empId || null,
        requestNo: food.requestNo,
      },
    });
  } catch (error) {
    console.log(error);

    if (error?.code === 11000 && /requestNo/i.test(error.message)) {
      return res.status(409).json({
        success: false,
        message: "A request number collision occurred. Please try again.",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create food request",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL FOOD REQUESTS
// ==========================================
exports.getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch food requests",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE FOOD REQUEST
// ==========================================
exports.getFoodById = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate("employee");

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: food,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch food request",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE FOOD REQUEST
// ==========================================
exports.updateFood = async (req, res) => {
  try {
    // preserve existing non-admin update behavior
    const role = String(req.user?.role || "").toLowerCase().replace(/\s+/g, " ");
    const isSuperAdmin = ["super admin 1", "super admin 2"].includes(role);
    const isAdminLike = [
      "super admin 1",
      "super admin 2",
      "superadmin1",
      "superadmin2",
      "superadmin",
      "admin",
      "administrator",
    ].includes(role);

    if (!isAdminLike) {
      const updateBody = { ...req.body };
      ["resourcePersonType", "accompanyingStaff"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updateBody, key)) {
          updateBody[key] = parseJsonField(updateBody[key]);
        }
      });

      if (Object.prototype.hasOwnProperty.call(updateBody, "foodTypes")) {
        updateBody.foodTypes = normalizeFoodTypes(parseJsonField(updateBody.foodTypes));
      }

      const financeFieldsPresent = ["financeRequired", "estimatedAmount", "advanceAmount", "advancePurpose"].some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key));

      if (financeFieldsPresent) {
        const financeFields = buildFinanceFields(req.body);
        const validation = validateFinanceFields(financeFields);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
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

      const food = await Food.findByIdAndUpdate(req.params.id, updateBody, { new: true, runValidators: true });
      if (!food) return res.status(404).json({ success: false, message: "Food request not found" });
      return res.status(200).json({ success: true, message: "Food request updated successfully", data: food });
    }

    // Admin edit flow - update only allowed fields and reset acknowledgement when needed
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, message: "Food request not found" });

    const allowed = new Set(["date","advanceToBeReceviedWithin","resourcePersonType","numberOfResourcePersons","numberOfInternalAccompanyingStaff","accompanyingStaff","foodTypes","specialRequirements","financeRequired","advanceAmount","estimatedAmount","advancePurpose","uploadedFile"]);

    const financeFieldsPresent2 = ["financeRequired","estimatedAmount","advanceAmount","advancePurpose"].some((k) => Object.prototype.hasOwnProperty.call(req.body || {}, k));
    if (financeFieldsPresent2) {
      const financeFields = buildFinanceFields(req.body);
      const validation = validateFinanceFields(financeFields);
      if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });
      food.financeRequired = financeFields.financeRequired;
      if (financeFields.financeRequired === "Yes") {
        food.advanceAmount = financeFields.advanceAmount;
        food.estimatedAmount = financeFields.estimatedAmount;
        food.advancePurpose = financeFields.advancePurpose;
      } else {
        food.advanceAmount = null;
        food.estimatedAmount = null;
        food.advancePurpose = "";
      }
    }

    Object.keys(req.body).forEach((key) => {
      if (!allowed.has(key)) return;
      if (["resourcePersonType","accompanyingStaff"].includes(key)) {
        try {
          food[key] = typeof req.body[key] === "string" ? JSON.parse(req.body[key]) : req.body[key];
        } catch (e) {
          food[key] = req.body[key];
        }
        return;
      }
      if (key === "foodTypes") {
        food[key] = normalizeFoodTypes(typeof req.body[key] === "string" ? JSON.parse(req.body[key]) : req.body[key]);
        return;
      }
      food[key] = req.body[key];
    });

    const file = req.files?.principalApprovalForm?.[0] || req.files?.uploadedFile?.[0];
    if (file) food.uploadedFile = { url: file.path, publicId: file.filename, fileName: file.originalname };

    const headApprovalWasCompleted =
      isSuperAdmin && String(food.headApproval?.status || "").trim() === "Completed";

    if (headApprovalWasCompleted) {
      food.headApproval.status = "Pending";
      food.headApproval.approvedBy = null;
      food.headApproval.approvedAt = null;
    // Preserve the existing acknowledgement reset behavior.
    } else if (food.headApproval && String(food.headApproval.status || "").trim() === "Acknowledged") {
      food.headApproval.status = "Pending";
      if (Object.prototype.hasOwnProperty.call(food.headApproval, "approvedBy")) food.headApproval.approvedBy = null;
      if (Object.prototype.hasOwnProperty.call(food.headApproval, "approvedAt")) food.headApproval.approvedAt = null;
      if (Object.prototype.hasOwnProperty.call(food.headApproval, "updatedAt")) food.headApproval.updatedAt = null;
      if (Object.prototype.hasOwnProperty.call(food, "acknowledgedBy")) food.acknowledgedBy = null;
      if (Object.prototype.hasOwnProperty.call(food, "acknowledgedAt")) food.acknowledgedAt = null;
    }

    if (Object.prototype.hasOwnProperty.call(food, "finalStatus")) food.finalStatus = "Pending";
    if (Object.prototype.hasOwnProperty.call(food, "status")) food.status = "Pending";

    if (Array.isArray(food.approvalHistory)) {
      if (headApprovalWasCompleted) {
        food.approvalHistory.push({ role: "food head", approvedBy: null, action: "Pending", remarks: "Waiting for Head approval", actionDate: null });
      } else {
        const idx = food.approvalHistory.findIndex((h) => String(h.role || "").toLowerCase().includes("food head"));
        if (idx >= 0) food.approvalHistory[idx] = { ...food.approvalHistory[idx], action: "Pending", approvedBy: null, actionDate: null };
        else food.approvalHistory.push({ role: "food head", approvedBy: null, action: "Pending", remarks: "Waiting for Head approval", actionDate: null });
      }
    }

    await food.save();
    return res.status(200).json({ success: true, message: "Request updated successfully and sent back to Pending", data: food });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update food request",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE FOOD REQUEST
// ==========================================
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(
      req.params.id
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Food request deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete food request",
      error: error.message,
    });
  }
};

// ==========================================
// PATCH FOOD REQUEST
// ==========================================
exports.patchFood = async (req, res) => {
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

    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    const financeFieldsPresent = [
      "financeRequired",
      "estimatedAmount",
      "advanceAmount",
      "advancePurpose",
    ].some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key));

    if (financeFieldsPresent) {
      const financeFields = buildFinanceFields(req.body);
      const validation = validateFinanceFields(financeFields);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      food.financeRequired = financeFields.financeRequired;

      if (financeFields.financeRequired === "Yes") {
        food.advanceAmount = financeFields.advanceAmount;
        food.estimatedAmount = financeFields.estimatedAmount;
        food.advancePurpose = financeFields.advancePurpose;
      } else {
        food.advanceAmount = null;
        food.estimatedAmount = null;
        food.advancePurpose = "";
      }
    }

    // UPDATE ONLY SENT FIELDS
    Object.keys(req.body).forEach((key) => {
      food[key] = req.body[key];
    });

    await food.save();

    res.status(200).json({
      success: true,
      message: "Food request patched successfully",
      data: food,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to patch food request",
      error: error.message,
    });
  }
};

// controllers/foodDashboardController.js


exports.getFoodDashboard = async (
  req,
  res
) => {
  try {
    // ==============================
    // CARD COUNTS
    // ==============================

    const totalRequests =
      await Food.countDocuments();

    const completedRequests =
      await Food.countDocuments({
        status: "Completed",
      });

    const acknowledgedRequests =
      await Food.countDocuments({
        status: "Approved",
      });

    const pendingAcknowledgementRequests =
      await Food.countDocuments({
        status: "Pending",
      });

    // ==============================
    // DEPARTMENT WISE
    // ==============================

    const departmentWise =
      await Food.aggregate([
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
      await Food.find()
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