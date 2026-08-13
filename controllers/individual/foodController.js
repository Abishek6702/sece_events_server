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

      foodTypes: req.body.foodTypes
        ? JSON.parse(req.body.foodTypes)
        : [],

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
      roleHint: foodData.financeRequired === "Yes" ? "super-admin2" : "super-admin1",
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

    const food = await Food.findByIdAndUpdate(
      req.params.id,
      updateBody,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Food request updated successfully",
      data: food,
    });
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