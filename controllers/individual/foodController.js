// controllers/foodController.js

const Food = require("../../models/individual/IndividualFood");

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
      advanceAmount:
        req.body.advanceAmount !== undefined &&
        req.body.advanceAmount !== null &&
        String(req.body.advanceAmount).trim() !== ""
          ? Number(req.body.advanceAmount)
          : null,
      advancePurpose:
        req.body.advancePurpose !== undefined &&
        req.body.advancePurpose !== null
          ? String(req.body.advancePurpose).trim()
          : "",
    };

    // ======== Finance validation & workflowStage =========
    const fin = String(foodData.financeRequired || "No");

    if (fin === "Yes") {
      const amt = req.body.advanceAmount;
      const purpose = req.body.advancePurpose;

      if (
        amt === undefined ||
        amt === null ||
        String(amt).trim() === "" ||
        purpose === undefined ||
        purpose === null ||
        String(purpose).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Advance Amount and Purpose of Advance are required when Finance Required is Yes.",
        });
      }

      foodData.financeRequired = "Yes";
      foodData.advanceAmount = Number(amt);
      foodData.advancePurpose = String(purpose).trim();
      foodData.workflowStage = "Submitted";
    } else {
      foodData.financeRequired = "No";
      foodData.advanceAmount = null;
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

    res.status(201).json({
      success: true,
      message: "Food request created successfully",
      data: food,
    });
  } catch (error) {
    console.log(error);

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
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    console.log("BODY =>", req.body);

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