const mongoose = require("mongoose");
const IndividualFood = require("../../models/individual/IndividualFood");
const IndividualPurchase = require("../../models/individual/IndividualPurchase");
const IndividualTransport = require("../../models/individual/IndividualTransport");
const IndividualMedia = require("../../models/individual/IndividualMedia");
const Faculty = require("../../models/Faculty");
const User = require("../../models/User");

const resolveEmployee = async (employeeRef) => {
  if (!employeeRef) {
    return null;
  }

  if (typeof employeeRef === "object" && (employeeRef.name || employeeRef.email)) {
    return employeeRef;
  }

  const id = String(employeeRef);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const facultyDoc = await Faculty.findById(id).select("name email").lean();
  if (facultyDoc) {
    return facultyDoc;
  }

  return await User.findById(id).select("name email").lean();
};

const buildSubmissionItem = (item, formType, resolvedEmployee) => ({
  id: item._id,
  formType,
  employee: resolvedEmployee?.name || null,
  employeeEmail: resolvedEmployee?.email || null,
  employeeDetail: resolvedEmployee || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  status: item.finalStatus || item.overallStatus || item.status,
  workflowStage: item.workflowStage || null,
  data: item,
});

const normalizeRole = (role = "") => String(role).toLowerCase().trim();

const isReviewerRole = (role = "") => {
  const normalizedRole = normalizeRole(role);
  return [
    "hod",
    "head",
    "departmenthead",
    "department_head",
    "admin",
    "superadmin",
    "super admin 1",
    "super admin 2",
  ].includes(normalizedRole);
};

const isHodRole = (role = "") => {
  const normalizedRole = normalizeRole(role);
  return [
    "hod",
    "head",
    "departmenthead",
    "department_head",
  ].includes(normalizedRole);
};

const isSuperAdminRole = (role = "") => {
  const normalizedRole = normalizeRole(role);
  return ["super admin 1", "super admin 2"].includes(normalizedRole);
};

const buildApprovalEntry = (user, roleLabel, action, reason) => ({
  role: roleLabel,
  userId: user?._id,
  userName: user?.name || "",
  action: action === "approve" ? "Approved" : "Rejected",
  reason: reason ? String(reason).trim() : "",
  date: new Date(),
});

const buildApprovalHistoryEntry = ({
  role,
  approvedBy = null,
  action = "Pending",
  remarks = "",
  actionDate = null,
}) => ({
  role: String(role || "").trim(),
  approvedBy: approvedBy || null,
  action: String(action || "").trim(),
  remarks: String(remarks || "").trim(),
  actionDate: actionDate ? new Date(actionDate) : null,
});

const upsertApprovalHistoryEntry = (item, entry) => {
  if (!item || !entry) return;
  item.approvalHistory = item.approvalHistory || [];

  const existingIndex = item.approvalHistory.findIndex(
    (historyItem) => historyItem.role === entry.role,
  );

  if (existingIndex >= 0) {
    item.approvalHistory[existingIndex] = {
      ...item.approvalHistory[existingIndex],
      ...entry,
    };
  } else {
    item.approvalHistory.push(entry);
  }
};

const getModuleHeadRole = (model) => {
  if (model === IndividualFood) return "food head";
  if (model === IndividualPurchase) return "purchase head";
  if (model === IndividualTransport) return "transport head";
  if (model === IndividualMedia) return "media head";

  return "module head";
};

const getModuleKeyFromModel = (model) => {
  if (model === IndividualFood) return "food";
  if (model === IndividualPurchase) return "purchase";
  if (model === IndividualTransport) return "transport";
  if (model === IndividualMedia) return "media";
  return null;
};

const isModuleHeadRole = (role, model) => {
  const normalizedRole = normalizeRole(role);
  const expectedRole = getModuleHeadRole(model);
  return normalizedRole === expectedRole;
};

const setSubmissionStatus = (item, statusValue) => {
  const normalizedValue = String(statusValue || "").trim();
  if (item?.constructor?.modelName === "IndividualPurchase") {
    const mappedValue =
      normalizedValue === "Rejected"
        ? "Rejected"
        : normalizedValue === "Approved" || normalizedValue === "Completed"
          ? "Approved"
          : "Pending";

    item.status = {
      admin: mappedValue,
      accounts: mappedValue,
      purchase: mappedValue,
    };
    return;
  }

  item.status = normalizedValue;
};

const resolveSubmissionById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const models = [
    IndividualFood,
    IndividualPurchase,
    IndividualTransport,
    IndividualMedia,
  ];

  for (const Model of models) {
    const item = await Model.findById(id);
    if (item) {
      return { item, Model };
    }
  }

  return null;
};

const buildAdminApprovedFilter = (moduleKey = "") => {
  switch (moduleKey) {
    case "purchase":
      return {
        $or: [{ overallStatus: "AdminApproved" }, { "status.admin": "Approved" }],
      };
    case "food":
    case "transport":
    case "media":
    default:
      return {
        $or: [{ workflowStage: "AdminApproved" }, { "adminApproval.status": "Approved" }],
      };
  }
};

const getDepartmentFacultyIds = async (department) => {
  if (!department) {
    return [];
  }

  const facultyDocs = await Faculty.find({
    department: { $regex: new RegExp(`^${department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  })
    .select("_id")
    .lean();

  return facultyDocs.map((item) => item._id);
};

const buildSubmissionFilter = async ({
  facultyId,
  module,
  user,
  includeAll = false,
  applyReviewFilter = false,
}) => {
  const filter = {};

  // Debug: print incoming context for tracing
  console.log("buildSubmissionFilter user:", user);
  console.log("buildSubmissionFilter options:", { module, includeAll, applyReviewFilter });

  const role = normalizeRole(user?.role);
  const isAdmin = Boolean(user?.isadmin);
  const isReviewer = isReviewerRole(role) || isAdmin;
  const isDepartmentHead = [
    "hod",
    "head",
    "departmenthead",
    "department_head",
  ].includes(role);

  const normalizedModule = String(module || "").toLowerCase().trim();
  const normalizedDepartment = String(user?.department || "").toLowerCase().trim();

  const isModuleHead =
    normalizedModule &&
    (role === `${normalizedModule} head` ||
      (isDepartmentHead && normalizedDepartment === normalizedModule));

  const isActualDepartmentHead = isDepartmentHead && !isModuleHead;

  console.log("buildSubmissionFilter role summary:", {
    role,
    normalizedDepartment,
    normalizedModule,
    isDepartmentHead,
    isModuleHead,
    isActualDepartmentHead,
  });

  const superAdminWorkflowStages = {
    "super admin 1": "SuperAdmin1",
    "super admin 2": "SuperAdmin2",
  };

  // For Super Admins determine their workflow stage mapping
  // and later restrict by whether the submission requires finance review.
  const superStage = superAdminWorkflowStages[role];

  if (facultyId) {
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new Error("Invalid facultyId");
    }

    filter.employee = new mongoose.Types.ObjectId(facultyId);
  } else if (!isReviewer && user?.facultyId) {
    const employeeIds = [user.facultyId];

    if (user._id && String(user._id) !== String(user.facultyId)) {
      employeeIds.push(user._id);
    }

    filter.employee =
      employeeIds.length === 1 ? employeeIds[0] : { $in: employeeIds };
  } else if (!isReviewer && user?._id) {
    filter.employee = user._id;
  } else if (isActualDepartmentHead && user?.department) {
    const departmentFacultyIds = await getDepartmentFacultyIds(
      user.department
    );

    if (departmentFacultyIds.length > 0) {
      filter.employee = {
        $in: departmentFacultyIds,
      };
    } else {
      filter.employee = null;
    }
  }

  if (applyReviewFilter) {
    if (isModuleHead) {
      // Module heads see submissions that have reached DepartmentReview.
      filter.workflowStage = "DepartmentReview";

      if (!includeAll) {
        filter.$or = [
          { "headApproval.status": "Pending" },
          { "headApproval.status": "Acknowledged" },
          { "headApproval.status": { $exists: false } },
        ];
      }
    } else if (isActualDepartmentHead) {
      // Department heads (HOD) who are not module heads see submissions
      // awaiting HOD approval (Submitted stage). Show items with pending hodApproval.
      filter.workflowStage = "Submitted";

      if (!includeAll) {
        filter.$or = [
          { "hodApproval.status": "Pending" },
          { "hodApproval.status": { $exists: false } },
        ];
      }
    } else if (isSuperAdminRole(role) && superStage) {
      // Super Admins should see items that are either at their SuperAdmin
      // workflow stage, items that are still "Submitted" (HOD optional),
      // OR items that were admin-approved for the module
      // (purchase uses different fields). Build a composite $or so all
      // representations are covered.
      filter.$or = [
        { workflowStage: superStage },
        { workflowStage: "Submitted" },
        buildAdminApprovedFilter(normalizedModule),
      ];

      // Additionally restrict by `financeRequired` so Super Admin 1 doesn't
      // receive submissions that require finance (those should go to Super Admin 2).
      if (superStage === "SuperAdmin1") {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: [{ financeRequired: { $exists: false } }, { financeRequired: "No" }, { financeRequired: false }, { financeRequired: null }] });
      } else if (superStage === "SuperAdmin2") {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: [{ financeRequired: "Yes" }, { financeRequired: true }] });
      }
    } else if (!includeAll && isReviewer && !isDepartmentHead) {
      // Regular reviewers only see admin-approved submissions for the requested module.
      Object.assign(filter, buildAdminApprovedFilter(normalizedModule));
    }
  }

  console.log("buildSubmissionFilter generated filter:", filter);

  return filter;
};

const getAllIndividualSubmissions = async (req, res) => {
  try {
    const { facultyId, module, includeAll } = req.query;
    const currentUser = req.user || {};

    const normalizedModule = String(module || "")
      .toLowerCase()
      .trim();

    const filter = await buildSubmissionFilter({
      facultyId,
      module: normalizedModule,
      user: currentUser,
      includeAll: includeAll === "true" || includeAll === "1",
      applyReviewFilter: true,
    });

    const moduleConfigs = normalizedModule
      ? [
          {
            model: IndividualFood,
            formType: "Food",
            key: "food",
          },
        ].filter(({ key }) => key === normalizedModule)
      : [
          { model: IndividualFood, formType: "Food", key: "food" },
          { model: IndividualPurchase, formType: "Purchase", key: "purchase" },
          { model: IndividualTransport, formType: "Transport", key: "transport" },
          { model: IndividualMedia, formType: "Media", key: "media" },
        ];

    if (normalizedModule === "purchase") {
      moduleConfigs[0] = { model: IndividualPurchase, formType: "Purchase", key: "purchase" };
    } else if (normalizedModule === "transport") {
      moduleConfigs[0] = { model: IndividualTransport, formType: "Transport", key: "transport" };
    } else if (normalizedModule === "media") {
      moduleConfigs[0] = { model: IndividualMedia, formType: "Media", key: "media" };
    }

    const results = await Promise.all(
      moduleConfigs.map(async ({ model, formType }) => {
        const items = await model
          .find(filter)
          .sort({ createdAt: -1 })
          .lean();

        return Promise.all(
          items.map(async (item) => {
            const resolvedEmployee = await resolveEmployee(item.employee);
            return buildSubmissionItem(item, formType, resolvedEmployee);
          }),
        );
      }),
    );

    const data = results.flat();
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);

    if (error.message === "Invalid facultyId") {
      return res.status(400).json({
        success: false,
        message: "Invalid facultyId",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch individual submissions",
      error: error.message,
    });
  }
};

const getIndividualSubmissionById = async (req, res) => {
  try {
    const submission = await resolveSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Individual submission not found",
      });
    }

    const { item, Model } = submission;
    let formType = "Unknown";

    if (Model === IndividualFood) formType = "Food";
    else if (Model === IndividualPurchase) formType = "Purchase";
    else if (Model === IndividualTransport) formType = "Transport";
    else if (Model === IndividualMedia) formType = "Media";

    const resolvedEmployee = await resolveEmployee(item.employee);
    const data = buildSubmissionItem(item, formType, resolvedEmployee);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch individual submission",
      error: error.message,
    });
  }
};

const getRequestByFacultyModule = async (req, res) => {
  try {
    const { facultyId, module, includeAll } = req.query;
    const requestId = req.params.id;
    const currentUser = req.user || {};
    const role = normalizeRole(currentUser.role);

    const allowedModules = {
      food: IndividualFood,
      purchase: IndividualPurchase,
      transport: IndividualTransport,
      media: IndividualMedia,
    };

    const moduleKeyFromQuery = String(module || "").toLowerCase().trim();
    const targetModules = moduleKeyFromQuery
      ? [moduleKeyFromQuery]
      : Object.keys(allowedModules);

    const parseFormType = (key) => key.charAt(0).toUpperCase() + key.slice(1);

    const formatItem = async (item, formType) => {
      const resolvedEmployee = await resolveEmployee(item.employee);
      return {
        id: item._id,
        formType,
        employee: resolvedEmployee?.name || null,
        employeeEmail: resolvedEmployee?.email || null,
        employeeDetail: resolvedEmployee || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        status: item.finalStatus || item.overallStatus || item.status || null,
        workflowStage: item.workflowStage || null,
        adminApproval: item.adminApproval || null,
        hodApproval: item.hodApproval || null,
        departmentApproval: item.departmentApproval || null,
        superAdminApproval: item.superAdminApproval || null,
        headApproval: item.headApproval || null,
        approvalHistory: item.approvalHistory || null,
        finalStatus: item.finalStatus || null,
        data: item,
      };
    };

    // If a specific request id is provided, resolve it across models
    if (requestId) {
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: "Invalid request id" });
      }

      // Try the module from query first (if provided)
      let submission = null;
      let foundModelKey = null;

      if (moduleKeyFromQuery && allowedModules[moduleKeyFromQuery]) {
        submission = await allowedModules[moduleKeyFromQuery]
          .findById(requestId)
          .populate("employee")
          .lean();

        if (submission) foundModelKey = moduleKeyFromQuery;
      }

      // If not found, search across all allowed models
      if (!submission) {
        const resolved = await resolveSubmissionById(requestId);
        if (!resolved) {
          return res.status(404).json({ success: false, message: "Individual submission not found" });
        }

        submission = await resolved.Model.findById(requestId).populate("employee").lean();
        foundModelKey = getModuleKeyFromModel(resolved.Model) || null;
      }

      const formType = foundModelKey ? parseFormType(foundModelKey) : "Unknown";
      const formatted = await formatItem(submission, formType);

      return res.status(200).json({ success: true, count: 1, data: [formatted] });
    }

    // Validate module keys if provided
    for (const key of targetModules) {
      if (!allowedModules[key]) {
        return res.status(400).json({
          success: false,
          message: "Invalid module. Allowed values: food, purchase, transport, media",
        });
      }
    }

    // Fetch items per module applying the same review/workflow filters
    const perModulePromises = targetModules.map(async (key) => {
      const Model = allowedModules[key];
      const filter = await buildSubmissionFilter({
        facultyId,
        module: key,
        user: currentUser,
        includeAll: includeAll === "true" || includeAll === "1",
        applyReviewFilter: true,
      });

      // Debug: log counts and filter used for this module
      try {
        const totalCount = await Model.countDocuments();
        console.log("getRequestByFacultyModule debug:", {
          role,
          module: key,
          filter,
          totalCount,
        });
      } catch (countErr) {
        console.warn("Failed to count documents for module", key, countErr.message);
      }

      const items = await Model.find(filter).populate("employee").sort({ createdAt: -1 }).lean();
      console.log(`getRequestByFacultyModule matched for ${key}:`, items.length);

      return Promise.all(items.map((item) => formatItem(item, parseFormType(key))));
    });

    const results = await Promise.all(perModulePromises);
    const merged = results.flat();
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, count: merged.length, data: merged });
  } catch (error) {
    console.error(error);
    if (error.message === "Invalid facultyId") {
      return res.status(400).json({ success: false, message: "Invalid facultyId" });
    }

    return res.status(500).json({ success: false, message: "Failed to fetch requests for faculty module", error: error.message });
  }
};

const validateApprovalAction = (action) => {
  const normalizedAction = String(action || "").toLowerCase().trim();
  if (!["approve", "reject"].includes(normalizedAction)) {
    throw new Error("Invalid action. Allowed values: approve, reject");
  }
  return normalizedAction;
};

const validateRejectReason = (action, reason) => {
  if (action === "reject" && !String(reason || "").trim()) {
    throw new Error("Reject reason is required");
  }
};

const ensureNotFinalized = (item) => {
  if (item.workflowStage === "Rejected" || item.finalStatus === "Rejected") {
    throw new Error("Submission has already been rejected");
  }
  if (item.workflowStage === "Approved" || item.finalStatus === "Approved") {
    throw new Error("Submission has already been approved");
  }
};

const hodApproval = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const role = normalizeRole(currentUser.role);

    if (!isHodRole(role)) {
      return res.status(403).json({ success: false, message: "Only HOD/Head users can perform this action" });
    }

    const action = validateApprovalAction(req.body.action);
    const reason = req.body.reason || "";
    validateRejectReason(action, reason);
    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: "Individual submission not found" });
    }

    const { item } = submission;

    // HOD can act when submission is in Submitted or while SuperAdmin review is ongoing
    if (!["Submitted", "SuperAdmin1", "SuperAdmin2"].includes(item.workflowStage)) {
      return res.status(400).json({ success: false, message: "This submission is not awaiting HOD approval" });
    }

    item.hodApproval = item.hodApproval || {};
    item.hodApproval.status = action === "approve" ? "Approved" : "Rejected";
    item.hodApproval.reason = reason;
    item.hodApproval.approvedBy = currentUser._id;
    item.hodApproval.approvedAt = new Date();
    item.hodApproval.updatedAt = new Date();

    upsertApprovalHistoryEntry(
      item,
      buildApprovalHistoryEntry({
        role: "hod",
        approvedBy: currentUser._id,
        action: action === "approve" ? "Approved" : "Rejected",
        remarks: action === "approve" ? "Approved" : reason,
        actionDate: new Date(),
      }),
    );

    if (action === "approve") {
      const nextStage = item.financeRequired === "Yes" ? "SuperAdmin2" : "SuperAdmin1";
      item.workflowStage = nextStage;
      item.finalStatus = "Pending";
      setSubmissionStatus(item, "Pending");

      const pendingRole = item.financeRequired === "Yes" ? "super admin 2" : "super admin 1";
      upsertApprovalHistoryEntry(
        item,
        buildApprovalHistoryEntry({
          role: pendingRole,
          approvedBy: null,
          action: "Pending",
          remarks: `Waiting for ${pendingRole === "super admin 1" ? "Super Admin 1" : "Super Admin 2"} approval`,
          actionDate: null,
        }),
      );
    } else {
      // HOD rejected — terminate workflow
      item.workflowStage = "Rejected";
      item.finalStatus = "Rejected";
      setSubmissionStatus(item, "Rejected");
    }

    await item.save();

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    if (error.message.includes("Invalid action") || error.message.includes("Reject reason is required")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Failed to process HOD approval", error: error.message });
  }
};

const superAdminApproval = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const role = normalizeRole(currentUser.role);

    if (!isSuperAdminRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin 1 and Super Admin 2 users can perform this action",
      });
    }

    const action = validateApprovalAction(req.body.action);
    const reason = req.body.reason || "";
    validateRejectReason(action, reason);
    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Individual submission not found",
      });
    }

    const { item } = submission;
    const expectedStage = role === "super admin 1" ? "SuperAdmin1" : "SuperAdmin2";

    // Enforce financeRequired constraint: Super Admin 1 handles non-finance,
    // Super Admin 2 handles finance-required submissions.
    const financeYes = item.financeRequired === "Yes" || item.financeRequired === true;
    const financeNo = item.financeRequired === "No" || item.financeRequired === false || item.financeRequired === null || item.financeRequired === undefined;

    if (role === "super admin 1" && financeYes) {
      return res.status(403).json({ success: false, message: "Super Admin 1 cannot act on finance-required submissions" });
    }

    if (role === "super admin 2" && financeNo) {
      return res.status(403).json({ success: false, message: "Super Admin 2 only handles finance-required submissions" });
    }

    // Accept approvals when the item is at the expected SuperAdmin stage
    // or still at Submitted (HOD optional flow).
    if (![expectedStage, "Submitted"].includes(item.workflowStage)) {
      return res.status(400).json({ success: false, message: `This submission is not awaiting ${role} approval` });
    }

    if (item.finalStatus === "Approved" || item.finalStatus === "Rejected") {
      return res.status(400).json({
        success: false,
        message: "This submission is already finalized",
      });
    }

    item.superAdminApproval = item.superAdminApproval || {};
    item.superAdminApproval.status = action === "approve" ? "Approved" : "Rejected";
    item.superAdminApproval.reason = reason;
    item.superAdminApproval.approvedBy = currentUser._id;
    item.superAdminApproval.approvedAt = new Date();
    item.superAdminApproval.updatedAt = new Date();

    upsertApprovalHistoryEntry(
      item,
      buildApprovalHistoryEntry({
        role: role === "super admin 1" ? "super admin 1" : "super admin 2",
        approvedBy: currentUser._id,
        action: action === "approve" ? "Approved" : "Rejected",
        remarks: action === "approve" ? "Approved" : reason,
        actionDate: new Date(),
      }),
    );

    if (action === "approve") {
      // Only move to DepartmentReview if HOD hasn't rejected
      if (item.hodApproval && item.hodApproval.status === "Rejected") {
        item.workflowStage = "Rejected";
        item.finalStatus = "Rejected";
        setSubmissionStatus(item, "Rejected");
      } else {
        item.workflowStage = "DepartmentReview";
        item.finalStatus = "Pending";
        setSubmissionStatus(item, "Pending");

        const moduleHeadRole = getModuleHeadRole(submission.Model);
        upsertApprovalHistoryEntry(
          item,
          buildApprovalHistoryEntry({
            role: moduleHeadRole,
            approvedBy: null,
            action: "Pending",
            remarks: `Waiting for ${moduleHeadRole.replace(/ head$/, " Head")} approval`,
            actionDate: null,
          }),
        );
      }
    } else {
      // Super Admin rejected — immediate termination
      item.workflowStage = "Rejected";
      item.finalStatus = "Rejected";
      setSubmissionStatus(item, "Rejected");
    }

    await item.save();

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error(error);

    if (
      error.message.includes("Invalid action") ||
      error.message.includes("Reject reason is required")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process Super Admin approval",
      error: error.message,
    });
  }
};

const headApproval = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const role = normalizeRole(currentUser.role);

    const action = String(req.body.action || req.query.action || "").toLowerCase().trim();
    const reason = req.body.reason || req.query.reason || "";
    validateRejectReason(action, reason);
    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Individual submission not found",
      });
    }

    const { item } = submission;

    if (item.workflowStage !== "DepartmentReview") {
      return res.status(400).json({
        success: false,
        message: "This submission is not awaiting module head action",
      });
    }

    const expectedHeadRole = getModuleHeadRole(submission.Model);
    const moduleKey = getModuleKeyFromModel(submission.Model);
    const normalizedDepartment = String(currentUser.department || "")
      .toLowerCase()
      .trim();

    const allowedAsHead =
      isModuleHeadRole(role, submission.Model) ||
      (isHodRole(role) && normalizedDepartment === moduleKey);

    if (!allowedAsHead) {
      return res.status(403).json({
        success: false,
        message: `Only ${expectedHeadRole} or department head of ${moduleKey} can perform this action`,
      });
    }

    if (!["acknowledge", "complete"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed values: acknowledge, complete",
      });
    }

    item.headApproval = item.headApproval || {};

    // Default Pending
    if (!item.headApproval.status) {
      item.headApproval.status = "Pending";
    }

    // ---------------- ACKNOWLEDGE ----------------
    if (action === "acknowledge") {

      if (item.headApproval.status !== "Pending") {
        return res.status(400).json({
          success: false,
          message: `Request already ${item.headApproval.status}`,
        });
      }

      item.headApproval.status = "Acknowledged";
      item.headApproval.approvedBy = currentUser._id;
      item.headApproval.approvedAt = new Date();
      item.headApproval.updatedAt = new Date();

      upsertApprovalHistoryEntry(
        item,
        buildApprovalHistoryEntry({
          role: expectedHeadRole,
          approvedBy: currentUser._id,
          action: "Acknowledged",
          remarks: "Request Acknowledged",
          actionDate: new Date(),
        })
      );

      await item.save();

      return res.status(200).json({
        success: true,
        message: "Request acknowledged successfully",
        data: item,
      });
    }

    // ---------------- COMPLETE ----------------
    if (action === "complete") {

      if (item.headApproval.status !== "Acknowledged") {
        return res.status(400).json({
          success: false,
          message: "Please acknowledge the request first",
        });
      }

      item.headApproval.status = "Completed";
      item.headApproval.approvedBy = currentUser._id;
      item.headApproval.approvedAt = new Date();
      item.headApproval.updatedAt = new Date();

      item.workflowStage = "Completed";
      item.finalStatus = "Approved";

      setSubmissionStatus(item, "Approved");

      upsertApprovalHistoryEntry(
        item,
        buildApprovalHistoryEntry({
          role: expectedHeadRole,
          approvedBy: currentUser._id,
          action: "Completed",
          remarks: "Request Completed",
          actionDate: new Date(),
        })
      );

      await item.save();

      return res.status(200).json({
        success: true,
        message: "Request completed successfully",
        data: item,
      });
    }

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to process module head action",
      error: error.message,
    });
  }
};

const closeIndividualSubmission = async (req, res) => {
  try {
    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Individual submission not found",
      });
    }

    const { item } = submission;

    if (item.finalStatus === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Submission is already closed",
      });
    }

    item.finalStatus = "Closed";
    item.workflowStage = "Completed";

    await item.save();

    return res.status(200).json({
      success: true,
      message: "Submission closed successfully",
      data: item,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to close individual submission",
      error: error.message,
    });
  }
};
module.exports = {
  buildApprovalHistoryEntry,
  upsertApprovalHistoryEntry,
  getAllIndividualSubmissions,
  getIndividualSubmissionById,
  getRequestByFacultyModule,
  hodApproval,
  superAdminApproval,
  headApproval,
  closeIndividualSubmission,
};
