const IndividualFood = require("../models/individual/IndividualFood");
const IndividualPurchase = require("../models/individual/IndividualPurchase");
const IndividualMedia = require("../models/individual/IndividualMedia");
const IndividualTransport = require("../models/individual/IndividualTransport");
const { buildIndividualDashboardBreakdowns } = require("../utils/individualDashboardStats");

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

const getIndividualScopeQuery = (req = {}) => {
  const role = normalizeDashboardRole(String(req?.user?.role || ""));

  if (role !== "faculty") {
    return {};
  }

  const employeeIds = [req?.user?.facultyId, req?.user?._id]
    .filter(Boolean)
    .map((value) => String(value));

  if (!employeeIds.length) {
    return {};
  }

  return {
    $or: employeeIds.map((employeeId) => ({ employee: employeeId })),
  };
};

exports.getIndividualScopeQuery = getIndividualScopeQuery;

const isDepartmentHeadRole = (role = "") => {
  const normalizedRole = normalizeDashboardRole(role);

  return ["hod", "departmenthead", "department_head", "head"].includes(normalizedRole);
};

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

const getHeadModule = (role = "") => {
  const normalizedRole = normalizeDashboardRole(role);

  return Object.keys(INDIVIDUAL_MODULE_CONFIG).find(
    (moduleName) => normalizeDashboardRole(getAllowedModuleRole(moduleName)) === normalizedRole,
  ) || "";
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

  if (isDepartmentHeadRole(normalizedRole)) {
    const department = String(moduleName || "").trim().toLowerCase();
    return ["food", "purchase", "media", "transport"].includes(department) || !department;
  }

  if (normalizedRole === "faculty") {
    return true;
  }

  return false;
};

const buildScopedQuery = (req, extraQuery = {}) => {
  const scopeQuery = getIndividualScopeQuery(req);

  if (!Object.keys(scopeQuery).length) {
    return extraQuery;
  }

  if (!Object.keys(extraQuery).length) {
    return scopeQuery;
  }

  return {
    $and: [scopeQuery, extraQuery],
  };
};

const getIndividualModuleStats = async (Model, req) => {
  const baseQuery = buildScopedQuery(req);

  const records = await Model.find(baseQuery)
    .select("finalStatus overallStatus status")
    .lean();

  const stats = records.reduce(
    (counts, record) => {
      const currentStatus = String(
        record.finalStatus || record.overallStatus || record.status || "Pending",
      )
        .trim()
        .toLowerCase();

      counts.total += 1;
      if (currentStatus === "approved") counts.approved += 1;
      else if (currentStatus === "rejected") counts.rejected += 1;
      else if (["completed", "closed"].includes(currentStatus)) counts.completed += 1;
      else counts.pending += 1;

      return counts;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
  );

  return stats;
};

const getIndividualSuperAdminStats = async (Model, req) => {
  const records = await Model.find(buildScopedQuery(req))
    .select("superAdminApproval workflowStage")
    .lean();

  return records.reduce(
    (counts, record) => {
      const currentStatus = String(record.superAdminApproval?.status || "Pending")
        .trim()
        .toLowerCase();

      counts.total += 1;
      if (currentStatus === "approved") counts.approved += 1;
      else if (currentStatus === "rejected") counts.rejected += 1;
      else if (currentStatus === "completed") counts.completed += 1;
      else counts.pending += 1;

      return counts;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
  );
};

const getIndividualHeadStats = async (Model, req) => {
  const query = {
    $and: [
      {
        $or: [
          { "superAdminApproval.status": "Approved" },
          { "superAdmin1Approval.status": "Approved" },
          { "superAdmin2Approval.status": "Approved" },
        ],
      },
      { "superAdminApproval.status": { $ne: "Rejected" } },
      { "superAdmin1Approval.status": { $ne: "Rejected" } },
      { "superAdmin2Approval.status": { $ne: "Rejected" } },
      {
        "headApproval.status": {
          $in: ["Pending", "Acknowledged", "Rejected", "Completed"],
        },
      },
    ],
  };

  const [total, pending, acknowledged, completed] = await Promise.all([
    Model.countDocuments(query),
    Model.countDocuments({ $and: [query, { "headApproval.status": "Pending" }] }),
    Model.countDocuments({ $and: [query, { "headApproval.status": "Acknowledged" }] }),
    Model.countDocuments({ $and: [query, { "headApproval.status": "Completed" }] }),
  ]);

  return {
    totalRequests: total,
    acknowledged,
    completed,
    pending,
  };
};

const getIndividualModuleBreakdowns = async (Model, req) => {
  const records = await Model.find(buildScopedQuery(req))
    .populate({ path: "employee", select: "name department email" })
    .populate({ path: "superAdminApproval.approvedBy", select: "name email" })
    .populate({ path: "headApproval.approvedBy", select: "name email" })
    .lean();

  return buildIndividualDashboardBreakdowns(records);
};

const getValidatedIndividualModule = (req) => {
  const moduleName = normalizeIndividualModule(req.query.module);

  if (!moduleName) {
    return null;
  }

  const moduleConfig = INDIVIDUAL_MODULE_CONFIG[moduleName];

  if (!moduleConfig) {
    throw Object.assign(new Error("Invalid module"), {
      statusCode: 400,
    });
  }

  return moduleConfig;
};

const validateIndividualDashboardAccess = (req, moduleName) => {
  const role = String(req.user?.role || "");

  if (!exports.isAllowedIndividualDashboardRole(role, moduleName)) {
    throw Object.assign(new Error("Access denied"), {
      statusCode: 403,
    });
  }
};

const sendIndividualDashboardError = (res, error) => {
  const statusCode = error?.statusCode || 500;
  const message = error?.message || "Server error";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const buildModuleSummary = async (key, config, breakdownKey, req) => {
  const [stats, breakdowns] = await Promise.all([
    getIndividualModuleStats(config.model, req),
    getIndividualModuleBreakdowns(config.model, req),
  ]);

  const summary = {
    label: config.label,
    stats,
  };

  if (breakdownKey) {
    summary[breakdownKey] = breakdowns[breakdownKey];
  } else {
    summary.breakdowns = breakdowns;
  }

  return { key, summary };
};

const getIndividualBreakdownPayload = async (
  req,
  res,
  breakdownKey,
  statsBuilder = getIndividualModuleStats,
) => {
  try {
    const moduleName = normalizeIndividualModule(req.query.module);
    const moduleConfig = getValidatedIndividualModule(req);

    if (moduleConfig) {
      validateIndividualDashboardAccess(req, moduleName);

      const stats = await statsBuilder(moduleConfig.model, req);
      const breakdowns = await getIndividualModuleBreakdowns(moduleConfig.model, req);

      const payload = {
        success: true,
        module: moduleConfig.label,
        stats,
      };

      if (breakdownKey) {
        payload[breakdownKey] = breakdowns[breakdownKey];
      }

      return res.status(200).json(payload);
    }

    const role = String(req.user?.role || "");
    if (!exports.isAllowedIndividualDashboardRole(role, "")) {
      throw Object.assign(new Error("Access denied"), { statusCode: 403 });
    }

    const moduleEntries = await Promise.all(
      Object.entries(INDIVIDUAL_MODULE_CONFIG).map(async ([key, config]) => {
        const [stats, breakdowns] = await Promise.all([
          statsBuilder(config.model, req),
          getIndividualModuleBreakdowns(config.model, req),
        ]);

        return {
          key,
          summary: {
            label: config.label,
            stats,
            [breakdownKey]: breakdowns[breakdownKey],
          },
        };
      }),
    );

    const modules = Object.fromEntries(
      moduleEntries.map(({ key, summary }) => [key, summary]),
    );

    const overall = Object.values(modules).reduce(
      (acc, moduleData) => {
        acc.total += moduleData.stats?.total || 0;
        acc.pending += moduleData.stats?.pending || 0;
        acc.approved += moduleData.stats?.approved || 0;
        acc.rejected += moduleData.stats?.rejected || 0;
        acc.completed += moduleData.stats?.completed || 0;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
    );

    return res.status(200).json({
      success: true,
      overall,
      modules,
    });
  } catch (error) {
    console.error("Individual dashboard breakdown error:", error);
    return sendIndividualDashboardError(res, error);
  }
};

exports.getIndividualDashboardStats = async (req, res) => {
  try {
    const moduleConfig = getValidatedIndividualModule(req);

    if (!moduleConfig) {
      const role = String(req.user?.role || "");
      if (!exports.isAllowedIndividualDashboardRole(role, "")) {
        throw Object.assign(new Error("Access denied"), { statusCode: 403 });
      }

      const moduleEntries = await Promise.all(
        Object.entries(INDIVIDUAL_MODULE_CONFIG).map(([key, config]) => buildModuleSummary(key, config, null, req)),
      );

      const modules = Object.fromEntries(
        moduleEntries.map(({ key, summary }) => [key, summary]),
      );

      return res.status(200).json({
        success: true,
        modules,
      });
    }

    validateIndividualDashboardAccess(req, moduleConfig.label.toLowerCase());

    const [stats, breakdowns] = await Promise.all([
      getIndividualModuleStats(moduleConfig.model, req),
      getIndividualModuleBreakdowns(moduleConfig.model, req),
    ]);

    return res.status(200).json({
      success: true,
      module: moduleConfig.label,
      stats,
      breakdowns,
    });
  } catch (error) {
    console.error("Individual dashboard stats error:", error);
    return sendIndividualDashboardError(res, error);
  }
};

exports.getIndividualFacultyWiseStats = async (req, res) => {
  return getIndividualBreakdownPayload(req, res, "facultyWise");
};

exports.getIndividualDepartmentWiseStats = async (req, res) => {
  return getIndividualBreakdownPayload(req, res, "departmentWise");
};

exports.getIndividualSuperAdminWiseStats = async (req, res) => {
  return getIndividualBreakdownPayload(
    req,
    res,
    "superadminWise",
    getIndividualSuperAdminStats,
  );
};

exports.getIndividualHeadWiseStats = async (req, res) => {
  try {
    const requestedModule = normalizeIndividualModule(req.query.module);
    const loggedInHeadModule = getHeadModule(req.user?.role);
    const moduleName = requestedModule || loggedInHeadModule;
    const moduleConfig = getValidatedIndividualModule({ query: { module: moduleName } });

    if (!moduleConfig || (loggedInHeadModule && moduleName !== loggedInHeadModule)) {
      throw Object.assign(new Error("Access denied"), { statusCode: 403 });
    }

    validateIndividualDashboardAccess(req, moduleName);

    return res.status(200).json({
      success: true,
      module: moduleConfig.label,
      stats: await getIndividualHeadStats(moduleConfig.model, req),
    });
  } catch (error) {
    console.error("Individual head dashboard stats error:", error);
    return sendIndividualDashboardError(res, error);
  }
};
