const IndividualFood = require("../models/individual/IndividualFood");
const IndividualPurchase = require("../models/individual/IndividualPurchase");
const IndividualMedia = require("../models/individual/IndividualMedia");
const IndividualTransport = require("../models/individual/IndividualTransport");

const INDIVIDUAL_MODULE_CONFIG = {
  food: { model: IndividualFood, label: "FOOD" },
  purchase: { model: IndividualPurchase, label: "PURCHASE" },
  media: { model: IndividualMedia, label: "MEDIA" },
  transport: { model: IndividualTransport, label: "TRANSPORT" },
};

const normalizeIndividualModule = (moduleName = "") => String(moduleName || "").trim().toLowerCase();

const normalizeDashboardRole = (role = "") =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

const isAdminLikeRole = (role = "") => {
  const normalizedRole = normalizeDashboardRole(role);

  return [
    "superadmin1",
    "superadmin2",
    "superadmin",
    "admin",
    "administrator",
  ].includes(normalizedRole);
};

const getAllowedModuleRole = (moduleName = "") => {
  const normalizedModule = normalizeIndividualModule(moduleName);

  return {
    food: "food head",
    purchase: "purchase head",
    media: "media head",
    transport: "transport head",
  }[normalizedModule] || "";
};

exports.isAllowedIndividualDashboardRole = (role = "", moduleName = "") => {
  const normalizedRole = normalizeDashboardRole(role);
  const allowedModuleRole = normalizeDashboardRole(getAllowedModuleRole(moduleName));

  if (isAdminLikeRole(normalizedRole)) {
    return true;
  }

  if (normalizedRole === allowedModuleRole) {
    return true;
  }

  if (normalizedRole === "head") {
    const department = String(moduleName || "").trim().toLowerCase();
    return ["food", "purchase", "media", "transport"].includes(department);
  }

  return false;
};

const getIndividualModuleStats = async (Model) => {
  const total = await Model.countDocuments();

  const pending = await Model.countDocuments({
    $or: [
      { finalStatus: "Pending" },
      { finalStatus: { $exists: false } },
      { finalStatus: null },
    ],
  });

  const approved = await Model.countDocuments({ finalStatus: "Approved" });
  const rejected = await Model.countDocuments({ finalStatus: "Rejected" });
  const completed = await Model.countDocuments({
    $or: [{ finalStatus: "Completed" }, { finalStatus: "Closed" }],
  });

  return {
    total,
    pending,
    approved,
    rejected,
    completed,
  };
};

exports.getIndividualDashboardStats = async (req, res) => {
  try {
    const moduleName = normalizeIndividualModule(req.query.module);

    if (!moduleName) {
      return res.status(400).json({
        success: false,
        message: "module query parameter is required",
      });
    }

    const moduleConfig = INDIVIDUAL_MODULE_CONFIG[moduleName];

    if (!moduleConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid module",
      });
    }

    const role = String(req.user?.role || "");

    if (!exports.isAllowedIndividualDashboardRole(role, moduleName)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const stats = await getIndividualModuleStats(moduleConfig.model);

    return res.status(200).json({
      success: true,
      module: moduleConfig.label,
      stats,
    });
  } catch (error) {
    console.error("Individual dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
