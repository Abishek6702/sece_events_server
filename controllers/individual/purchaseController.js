// controllers/purchase/purchaseController.js

const Purchase = require("../../models/individual/IndividualPurchase");
const Faculty = require("../../models/Faculty");
const generateIndividualRequestNumber = require("../../utils/generateIndividualRequestNumber");

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

const normalizeFileReference = (file) => {
  if (!file) return null;

  return {
    url: file.path || file.secure_url || file.url || "",
    publicId: file.filename || file.public_id || "",
  };
};

// ==============================
// CREATE
// ==============================
exports.createPurchase = async (req, res) => {
  try {
    console.log("BODY =>", req.body);
    console.log("FILES =>", req.files);

    const body = {
      ...req.body,
      employee: req.user?.facultyId || req.body.employee || req.user?._id,

      purchases: req.body.purchases
        ? JSON.parse(req.body.purchases)
        : [],

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
    const fin = String(body.financeRequired || "No");

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

      body.financeRequired = "Yes";
      body.advanceAmount = Number(amt);
      body.advancePurpose = String(purpose).trim();
      body.workflowStage = "Submitted";
    } else {
      body.financeRequired = "No";
      body.advanceAmount = null;
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

    body.status = {
      admin: "Pending",
      accounts: "Pending",
      purchase: "Pending",
    };
    body.finalStatus = "Pending";
    body.workflowStage = "Submitted";
    body.requestNo = await generateIndividualRequestNumber(
      "PURCHASE",
      req.user?.department || req.body.department || "UNKNOWN"
    );
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

    const purchase =
      await Purchase.create(body);
    const facultyDoc = await Faculty.findById(body.employee).select("empId").lean();

    res.status(201).json({
      success: true,
      message:
        "Purchase created successfully",
      data: {
        ...purchase.toObject(),
        empId: facultyDoc?.empId || null,
        requestNo: purchase.requestNo,
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
// GET ALL
// ==============================
exports.getAllPurchase = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
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
// GET SINGLE
// ==============================
exports.getSinglePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(
      req.params.id
    ).populate("employee");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      data: purchase,
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
// UPDATE
// ==============================
exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: purchase,
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
// DELETE
// ==============================
exports.deletePurchase = async (req, res) => {
  try {
    const purchase =
      await Purchase.findByIdAndDelete(
        req.params.id
      );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Purchase deleted successfully",
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
// PATCH
// ==============================
exports.patchPurchase = async (req, res) => {
  try {
    console.log("BODY =>", req.body);

    // EMPTY BODY CHECK
    if (
      !req.body ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
      });
    }

    const purchase = await Purchase.findById(
      req.params.id
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // UPDATE ONLY SENT FIELDS
    Object.keys(req.body).forEach((key) => {
      purchase[key] = req.body[key];
    });

    await purchase.save();

    res.status(200).json({
      success: true,
      message:
        "Purchase patched successfully",
      data: purchase,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// controllers/purchaseDashboardController.js

exports.getPurchaseDashboard =
  async (req, res) => {
    try {
      // ==============================
      // CARD COUNTS
      // ==============================

      const totalRequests =
        await Purchase.countDocuments();

      const completedRequests =
        await Purchase.countDocuments({
          status: "Completed",
        });

      const acknowledgedRequests =
        await Purchase.countDocuments({
          status: "Approved",
        });

      const pendingAcknowledgementRequests =
        await Purchase.countDocuments({
          status: "Pending",
        });

      // ==============================
      // DEPARTMENT WISE
      // ==============================

      const departmentWise =
        await Purchase.aggregate([
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
        await Purchase.find()
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