const IndividualFeedback = require("../models/IndividualFeedback");
const IndividualFood = require("../models/individual/IndividualFood");
const IndividualPurchase = require("../models/individual/IndividualPurchase");
const IndividualMedia = require("../models/individual/IndividualMedia");
const IndividualTransport = require("../models/individual/IndividualTransport");

const MODULE_CONFIG = {
  food: { label: "FOOD", model: IndividualFood, modelName: "IndividualFood" },
  purchase: { label: "PURCHASE", model: IndividualPurchase, modelName: "IndividualPurchase" },
  media: { label: "MEDIA", model: IndividualMedia, modelName: "IndividualMedia" },
  transport: { label: "TRANSPORT", model: IndividualTransport, modelName: "IndividualTransport" },
  foodmodule: { label: "FOOD", model: IndividualFood, modelName: "IndividualFood" },
  purchasemodule: { label: "PURCHASE", model: IndividualPurchase, modelName: "IndividualPurchase" },
  mediamodule: { label: "MEDIA", model: IndividualMedia, modelName: "IndividualMedia" },
  transportmodule: { label: "TRANSPORT", model: IndividualTransport, modelName: "IndividualTransport" },
};

const normalizeModule = (moduleName = "") => String(moduleName || "").trim().toLowerCase().replace(/\s+/g, "");

const normalizeRole = (role = "") =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

const isAdminLikeRole = (role = "") => {
  const normalizedRole = normalizeRole(role);

  return ["superadmin1", "superadmin2", "superadmin", "admin", "administrator"].includes(normalizedRole);
};

const getModuleConfig = (moduleName = "") => {
  const normalizedModule = normalizeModule(moduleName);

  return MODULE_CONFIG[normalizedModule] || MODULE_CONFIG[normalizedModule.replace(/module$/, "")] || null;
};

const isFeedbackViewAllowed = (role = "", moduleName = "") => {
  const normalizedRole = normalizeRole(role);
  const moduleConfig = getModuleConfig(moduleName);

  if (!moduleConfig) {
    return false;
  }

  if (isAdminLikeRole(normalizedRole)) {
    return true;
  }

  const allowedRole = {
    food: "foodhead",
    purchase: "purchasehead",
    media: "mediahead",
    transport: "transporthead",
  }[normalizeModule(moduleName)];

  return normalizedRole === allowedRole || normalizedRole === "head";
};

const fetchRequestById = async (requestId) => {
  const requestModels = [
    IndividualFood,
    IndividualPurchase,
    IndividualMedia,
    IndividualTransport,
  ];

  for (const Model of requestModels) {
    const request = await Model.findById(requestId);
    if (request) {
      return request;
    }
  }

  return null;
};

const getRequestModule = (request) => {
  const moduleName = String(request?.module || "").trim().toUpperCase();

  if (["FOOD", "PURCHASE", "MEDIA", "TRANSPORT"].includes(moduleName)) {
    return moduleName;
  }

  return null;
};

const isCompletedRequestForFeedback = () => true;

const submitIndividualFeedback = async (req, res) => {
  try {
    const { requestId, rating, feedback } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (normalizeRole(user.role) !== "faculty") {
      return res.status(403).json({ success: false, message: "Only faculty can submit feedback" });
    }

    if (!requestId) {
      return res.status(400).json({ success: false, message: "requestId is required" });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const request = await fetchRequestById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const requestModule = getRequestModule(request);

    if (!requestModule) {
      return res.status(400).json({ success: false, message: "Unable to determine request module" });
    }

    const faculty = await require("../models/Faculty").findById(user.facultyId);
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const requestFaculty = await require("../models/Faculty").findById(request.employee);
    if (!requestFaculty) {
      return res.status(404).json({ success: false, message: "Request owner not found" });
    }

    if (!request.employee || String(request.employee) !== String(user.facultyId)) {
      return res.status(403).json({ success: false, message: "You can only submit feedback for your own request" });
    }

    const existingFeedback = await IndividualFeedback.findOne({ requestId });
    if (existingFeedback) {
      return res.status(409).json({ success: false, message: "Feedback already submitted for this request" });
    }

    const newFeedback = await IndividualFeedback.create({
      requestId: String(request._id),
      requestNo: request.requestNo,
      module: requestModule,
      facultyId: user.facultyId,
      facultyName: `${faculty.firstName} ${faculty.lastName}`.trim(),
      department: faculty.department || user.department,
      rating,
      feedback: feedback || "",
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      data: {
        requestNo: newFeedback.requestNo,
        module: newFeedback.module,
        rating: newFeedback.rating,
      },
    });
  } catch (error) {
    console.error("submitIndividualFeedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getIndividualFeedback = async (req, res) => {
  try {
    const moduleName = normalizeModule(req.query.module);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const moduleConfig = getModuleConfig(moduleName);

    if (!moduleConfig) {
      return res.status(400).json({ success: false, message: "Invalid module" });
    }

    if (!isFeedbackViewAllowed(user.role, moduleName)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const feedbacks = await IndividualFeedback.find({ module: moduleConfig.label })
      .sort({ submittedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      module: moduleConfig.label,
      count: feedbacks.length,
      data: feedbacks.map((item) => ({
        requestId: item.requestId,
        requestNo: item.requestNo,
        facultyName: item.facultyName,
        department: item.department,
        rating: item.rating,
        feedback: item.feedback,
        submittedAt: item.submittedAt,
      })),
    });
  } catch (error) {
    console.error("getIndividualFeedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  submitIndividualFeedback,
  getIndividualFeedback,
  getModuleConfig,
  isFeedbackViewAllowed,
  isCompletedRequestForFeedback,
};
