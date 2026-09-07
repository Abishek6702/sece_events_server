const mongoose = require("mongoose");
const IndividualFood = require("../../models/individual/IndividualFood");
const IndividualPurchase = require("../../models/individual/IndividualPurchase");
const IndividualTransport = require("../../models/individual/IndividualTransport");
const IndividualMedia = require("../../models/individual/IndividualMedia");
const Faculty = require("../../models/Faculty");
const User = require("../../models/User");
const {
  isAllowedMediaAssignmentInterchange,
  isValidMediaAssignmentTargetDepartment,
  buildMediaRequestVisibilityFilter,
} = require("../../utils/mediaAssignment");
const { notifyIndividualRequest } = require("../../utils/individualNotifications");

const resolveEmployee = async (employeeRef) => {
  if (!employeeRef) {
    return null;
  }

  if (typeof employeeRef === "object" && (employeeRef.name || employeeRef.email)) {
    return employeeRef;
  }

  const id = String(employeeRef).trim();

  // If the stored value looks like an email, try resolving by email first
  if (id.includes("@")) {
    const facultyByEmail = await Faculty.findOne({ email: id }).select("name email").lean();
    if (facultyByEmail) return facultyByEmail;

    const userByEmail = await User.findOne({ email: id }).select("name email").lean();
    if (userByEmail) return userByEmail;

    return null;
  }

  // Otherwise, treat as an ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const facultyDoc = await Faculty.findById(id).select("name email").lean();
  if (facultyDoc) {
    // If Faculty record exists but lacks a name, try to resolve a User linked to this faculty id
    if (!facultyDoc.name) {
      const linkedUser = await User.findOne({ facultyId: facultyDoc._id }).select("name email").lean();
      if (linkedUser && linkedUser.name) {
        return { _id: facultyDoc._id, email: facultyDoc.email, name: linkedUser.name };
      }
    }

    return facultyDoc;
  }

  const userDoc = await User.findById(id).select("name email").lean();
  return userDoc;
};

const buildSubmissionItem = (item, formType, resolvedEmployee) => {
  // If the item already has a populated employee object, prefer its name/email
  const populatedEmployee = item && typeof item.employee === "object" ? item.employee : null;
  const employeeNameFromItem = populatedEmployee?.name || populatedEmployee?.email || null;

  // For purchase items, pick the earliest deliveryDate from purchases[] if present
  let purchaseEarliestDate = null;
  try {
    if (Array.isArray(item?.purchases) && item.purchases.length > 0) {
      const dates = item.purchases
        .map((p) => p?.deliveryDate)
        .filter(Boolean)
        .map((d) => new Date(d).getTime())
        .filter((t) => !Number.isNaN(t));

      if (dates.length > 0) {
        purchaseEarliestDate = new Date(Math.min(...dates)).toISOString();
      }
    }
  } catch (e) {
    // ignore parsing errors and leave purchaseEarliestDate null
  }

  return {
    id: item._id,
    formType,
    // Prefer resolved name, fallback to resolved email, then populated item name/email,
    // then raw id string so UI always has something to display
    employee:
      resolvedEmployee?.name ||
      resolvedEmployee?.email ||
      employeeNameFromItem ||
      (item.employee ? String(item.employee) : null),
    employeeEmail: resolvedEmployee?.email || populatedEmployee?.email || null,
    employeeDetail: resolvedEmployee || populatedEmployee || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: item.finalStatus || item.overallStatus || item.status,
    workflowStage: item.workflowStage || null,
    superAdminApproval: item.superAdminApproval || null,
    headApproval: item.headApproval || null,
    finalStatus: item.finalStatus || null,
    // Submissions may store relevant dates in different fields per module.
    // Provide a best-effort top-level `date` by checking common locations.
    date:
      item.date ||
      item.deliveryDate ||
      purchaseEarliestDate ||
      item.poster?.deliveryDate ||
      item.poster?.date ||
      item.video?.deliveryDate ||
      item.video?.date ||
      item.pickupDateTime ||
      item.dropDateTime ||
      null,
    data: item,
  };
};

const normalizeRole = (role = "") =>
  String(role || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

const getAssignmentTargetDepartment = (item) => {
  const mediaTypes = Array.isArray(item?.typeOfMedia)
    ? item.typeOfMedia
    : [item?.typeOfMedia].filter(Boolean);

  if (mediaTypes.includes("Video")) {
    return "Video";
  }

  if (mediaTypes.includes("Poster")) {
    return "Poster";
  }

  return "Media";
};

const buildInterchangeResponse = async (item, updatedByUser, targetUser) => {
  const assignmentDepartment = getAssignmentTargetDepartment(item);
  const targetUserPayload = targetUser
    ? {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department,
      }
    : null;

  return {
    success: true,
    message: `Request reassigned to ${targetUser?.name || "the selected team member"}`,
    data: {
      id: item._id,
      requestNo: item.requestNo,
      assignmentDepartment,
      assignedTo: targetUserPayload,
      reassignedBy: {
        _id: updatedByUser?._id,
        name: updatedByUser?.name,
        email: updatedByUser?.email,
      },
      updatedAt: item.updatedAt,
    },
  };
};

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

const getModuleKeyFromHeadRole = (role = "") => {
  const normalizedRole = normalizeRole(role);

  return {
    "food head": "food",
    "purchase head": "purchase",
    "transport head": "transport",
    "media head": "media",
  }[normalizedRole] || "";
};

const isModuleHeadRole = (role, model) => {
  const normalizedRole = normalizeRole(role);
  const expectedRole = getModuleHeadRole(model);
  return normalizedRole === expectedRole;
};

const isHeadReviewerRole = (role) => [
  "head",
  "food head",
  "purchase head",
  "transport head",
  "media head",
].includes(normalizeRole(role));

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

  if (item?.constructor?.modelName === "IndividualMedia") {
    const mappedValue =
      normalizedValue === "Rejected"
        ? "Rejected"
        : normalizedValue === "Approved"
          ? "Completed"
          : normalizedValue === "Completed"
            ? "Completed"
            : "Pending";

    item.status = mappedValue;
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

const buildHeadPendingFilter = () => ({
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
    { "headApproval.status": { $in: ["Pending", "Completed"] } },
  ],
});

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

const getDepartmentTeamStats = async (departmentName) => {
  const normalizedDepartment = String(departmentName || "").trim();

  if (!normalizedDepartment) {
    return {
      headCount: 0,
      memberCount: 0,
      totalTeamCount: 0,
      heads: [],
    };
  }

  const departmentRegex = new RegExp(`^${normalizedDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

  const [headCount, memberCount, totalTeamCount, heads] = await Promise.all([
    User.countDocuments({ department: departmentRegex, role: "head" }),
    User.countDocuments({ department: departmentRegex, role: "member" }),
    User.countDocuments({ department: departmentRegex }),
    User.find({ department: departmentRegex, role: "head" })
      .select("_id name email department role")
      .lean(),
  ]);

  return {
    headCount,
    memberCount,
    totalTeamCount,
    heads,
  };
};

const buildMediaHeadListFilter = async ({
  user,
  mediaType,
  includeAll = false,
}) => {
  const filter = {
    $or: [
      { workflowStage: "DepartmentReview" },
      { workflowStage: "SuperAdmin1" },
      { workflowStage: "SuperAdmin2" },
      { workflowStage: "Submitted" },
      { workflowStage: "AdminApproved" },
    ],
  };

  if (!includeAll) {
    filter.$and = [buildHeadPendingFilter()];
  }

  const role = normalizeRole(user?.role);
  const normalizedMediaType = String(mediaType || "")
    .trim()
    .toLowerCase();

  if (normalizedMediaType === "poster") {
    filter.typeOfMedia = { $in: ["Poster"] };
  } else if (normalizedMediaType === "video") {
    filter.typeOfMedia = { $in: ["Video"] };
  } else {
    filter.typeOfMedia = { $in: ["Poster", "Video"] };
  }

  if (role === "poster head") {
    filter.typeOfMedia = { $in: ["Poster"] };
  } else if (role === "video head") {
    filter.typeOfMedia = { $in: ["Video"] };
  }

  return filter;
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
  // console.log("buildSubmissionFilter user:", user);
  // console.log("buildSubmissionFilter options:", { module, includeAll, applyReviewFilter });

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
    if (isModuleHead || isHeadReviewerRole(role)) {
      if (!includeAll) {
        filter.$and = [buildHeadPendingFilter()];
      }
    } else if (isActualDepartmentHead) {
      // HODs can view the complete history for their department.
    } else if (isSuperAdminRole(role) && superStage) {
      // Super admins retain requests across the complete workflow lifecycle.
      const approvalField = role === "super admin 1"
        ? "superAdmin1Approval.approvedBy"
        : "superAdmin2Approval.approvedBy";

      filter.$and = [
        {
          $or: [
            {
              workflowStage: {
                $in: [
                  "Submitted",
                  "SuperAdmin1",
                  "SuperAdmin2",
                  "AdminApproved",
                  "DepartmentReview",
                  "Approved",
                  "Rejected",
                  "Completed",
                ],
              },
            },
            { finalStatus: { $in: ["Approved", "Rejected", "Completed", "Closed"] } },
            { [approvalField]: user?._id || null },
            { "superAdminApproval.approvedBy": user?._id || null },
          ],
        },
      ];
    } else if (!includeAll && isReviewer && !isDepartmentHead) {
      // Regular reviewers only see admin-approved submissions for the requested module.
      Object.assign(filter, buildAdminApprovedFilter(normalizedModule));
    }
  }

  // console.log("buildSubmissionFilter generated filter:", filter);

  return filter;
};

const getMediaHeadList = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const filter = await buildMediaHeadListFilter({
      user: currentUser,
      mediaType: "",
      includeAll: req.query.includeAll === "true" || req.query.includeAll === "1",
    });

    const items = await IndividualMedia.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      items.map(async (item) => {
        const resolvedEmployee = await resolveEmployee(item.employee);
        return buildSubmissionItem(item, "Media", resolvedEmployee);
      }),
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch media head list",
      error: error.message,
    });
  }
};

const getPosterRequests = async (req, res) => {
  try {
    const filter = buildMediaRequestVisibilityFilter(req.user, "Poster");
    const items = await IndividualMedia.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      items.map(async (item) => {
        const resolvedEmployee = await resolveEmployee(item.employee);
        return buildSubmissionItem(item, "Poster", resolvedEmployee);
      }),
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster requests",
      error: error.message,
    });
  }
};

const getPosterRequestById = async (req, res) => {
  try {
    const filter = buildMediaRequestVisibilityFilter(req.user, "Poster");
    const item = await IndividualMedia.findOne({
      _id: req.params.id,
      ...filter,
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Poster request not found",
      });
    }

    const resolvedEmployee = await resolveEmployee(item.employee);
    return res.status(200).json({
      success: true,
      data: buildSubmissionItem(item, "Poster", resolvedEmployee),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster request",
      error: error.message,
    });
  }
};

const getVideoRequests = async (req, res) => {
  try {
    const filter = buildMediaRequestVisibilityFilter(req.user, "Video");
    const items = await IndividualMedia.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      items.map(async (item) => {
        const resolvedEmployee = await resolveEmployee(item.employee);
        return buildSubmissionItem(item, "Video", resolvedEmployee);
      }),
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video requests",
      error: error.message,
    });
  }
};

const getVideoRequestById = async (req, res) => {
  try {
    const filter = buildMediaRequestVisibilityFilter(req.user, "Video");
    const item = await IndividualMedia.findOne({
      _id: req.params.id,
      ...filter,
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Video request not found",
      });
    }

    const resolvedEmployee = await resolveEmployee(item.employee);
    return res.status(200).json({
      success: true,
      data: buildSubmissionItem(item, "Video", resolvedEmployee),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video request",
      error: error.message,
    });
  }
};

const getPosterHeadList = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const filter = await buildMediaHeadListFilter({
      user: currentUser,
      mediaType: "Poster",
      includeAll: req.query.includeAll === "true" || req.query.includeAll === "1",
    });

    const teamStats = await getDepartmentTeamStats("Poster");

    return res.status(200).json({
      success: true,
      headCount: teamStats.headCount,
      memberCount: teamStats.memberCount,
      totalTeamCount: teamStats.totalTeamCount,
      heads: teamStats.heads,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster head list",
      error: error.message,
    });
  }
};

const getVideoHeadList = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const filter = await buildMediaHeadListFilter({
      user: currentUser,
      mediaType: "Video",
      includeAll: req.query.includeAll === "true" || req.query.includeAll === "1",
    });

    const teamStats = await getDepartmentTeamStats("Video");

    return res.status(200).json({
      success: true,
      headCount: teamStats.headCount,
      memberCount: teamStats.memberCount,
      totalTeamCount: teamStats.totalTeamCount,
      heads: teamStats.heads,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video head list",
      error: error.message,
    });
  }
};

const getAllIndividualSubmissions = async (req, res) => {
  try {
    const { facultyId, module, includeAll } = req.query;
    const currentUser = req.user || {};

    const normalizedModule = String(module || getModuleKeyFromHeadRole(currentUser.role))
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

    const moduleKeyFromQuery = String(module || getModuleKeyFromHeadRole(currentUser.role))
      .toLowerCase()
      .trim();
    const targetModules = moduleKeyFromQuery
      ? [moduleKeyFromQuery]
      : Object.keys(allowedModules);

    const parseFormType = (key) => key.charAt(0).toUpperCase() + key.slice(1);

    const formatItem = async (item, formType) => {
      const resolvedEmployee = await resolveEmployee(item.employee);
      const requestDate =
        item.date ||
        item.deliveryDate ||
        item.pickupDateTime ||
        item.dropDateTime ||
        item.createdAt ||
        null;

      return {
        requestId: item._id,
        id: item._id,
        formType,
        requestNo: item.requestNo || null,
        requestDate,
        module: String(item.module || formType || "").toLowerCase(),
        employee: resolvedEmployee?.name || null,
        employeeEmail: resolvedEmployee?.email || null,
        employeeDetail: resolvedEmployee || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        status: item.status || item.finalStatus || item.overallStatus || null,
        workflowStage: item.workflowStage || null,
        hodApproval: item.hodApproval || null,
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
        // console.log("getRequestByFacultyModule debug:", {
        //   role,
        //   module: key,
        //   filter,
        //   totalCount,
        // });
      } catch (countErr) {
        console.warn("Failed to count documents for module", key, countErr.message);
      }

      const items = await Model.find(filter).populate("employee").sort({ createdAt: -1 }).lean();
      // console.log(`getRequestByFacultyModule matched for ${key}:`, items.length);

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

    await notifyIndividualRequest({
      request: item,
      moduleName: getModuleKeyFromModel(submission.Model),
      action: action === "approve" ? "hod-approved" : "hod-rejected",
      actorName: currentUser?.name || "HOD",
      reason,
      roleHint: action === "approve" ? "" : "",
    });

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    if (error.message.includes("Invalid action") || error.message.includes("Reject reason is required")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Failed to process HOD approval", error: error.message });
  }
};

const hodReject = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const role = normalizeRole(currentUser.role);

    if (!isHodRole(role)) {
      return res.status(403).json({ success: false, message: "Only HOD/Head users can perform this action" });
    }

    const reason = req.body.reason || "";
    if (!reason || String(reason).trim() === "") {
      return res.status(400).json({ success: false, message: "Reject reason is required" });
    }

    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: "Individual submission not found" });
    }

    const { item } = submission;

    // HOD can reject when submission is in Submitted or while SuperAdmin review is ongoing
    if (!["Submitted", "SuperAdmin1", "SuperAdmin2"].includes(item.workflowStage)) {
      return res.status(400).json({ success: false, message: "This submission is not awaiting HOD approval" });
    }

    if (item.finalStatus === "Rejected") {
      return res.status(400).json({ success: false, message: "This submission is already rejected" });
    }

    // Update HOD approval with rejection
    item.hodApproval = item.hodApproval || {};
    item.hodApproval.status = "Rejected";
    item.hodApproval.reason = reason;
    item.hodApproval.approvedBy = currentUser._id;
    item.hodApproval.approvedAt = new Date();
    item.hodApproval.updatedAt = new Date();

    // Set workflow to rejected
    item.workflowStage = "Rejected";
    item.finalStatus = "Rejected";
    setSubmissionStatus(item, "Rejected");

    // Add to approval history
    upsertApprovalHistoryEntry(
      item,
      buildApprovalHistoryEntry({
        role: "hod",
        approvedBy: currentUser._id,
        action: "Rejected",
        remarks: reason,
        actionDate: new Date(),
      }),
    );

    await item.save();

    // Send rejection notification
    await notifyIndividualRequest({
      request: item,
      moduleName: getModuleKeyFromModel(submission.Model),
      action: "hod-rejected",
      actorName: currentUser?.name || "HOD",
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Request rejected by HOD",
      data: item,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to process HOD rejection",
      error: error.message,
    });
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

    // Accept approvals when the item is at a SuperAdmin stage or still at Submitted (HOD optional flow).
    // Both Super Admin 1 and Super Admin 2 can now see and act on all requests regardless of which
    // SuperAdmin stage the request is in or the financeRequired value.
    // The financeRequired value only affects whether finance-related fields are mandatory.
    if (!["SuperAdmin1", "SuperAdmin2", "Submitted"].includes(item.workflowStage)) {
      return res.status(400).json({ success: false, message: "This submission is not awaiting Super Admin approval" });
    }

    if (item.finalStatus === "Approved" || item.finalStatus === "Rejected") {
      return res.status(400).json({
        success: false,
        message: "This submission is already finalized",
      });
    }

    // Update the role-specific approval field
    const approvalField = role === "super admin 1" ? "superAdmin1Approval" : "superAdmin2Approval";
    item[approvalField] = item[approvalField] || {};
    item[approvalField].status = action === "approve" ? "Approved" : "Rejected";
    item[approvalField].reason = reason;
    item[approvalField].approvedBy = currentUser._id;
    item[approvalField].approvedAt = new Date();
    item[approvalField].updatedAt = new Date();

    // Also update the legacy superAdminApproval field for backward compatibility
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

    await notifyIndividualRequest({
      request: item,
      moduleName: getModuleKeyFromModel(submission.Model),
      action: action === "approve" ? "super-admin-approved" : "super-admin-rejected",
      actorName: currentUser?.name || role,
      reason,
      roleHint: "super-admin",
    });

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

    if (!["DepartmentReview", "Pending"].includes(item.workflowStage)) {
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

    if (!["acknowledge", "complete", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed values: acknowledge, complete, reject",
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

      await notifyIndividualRequest({
        request: item,
        moduleName: moduleKey,
        action: "module-head-acknowledged",
        actorName: currentUser?.name || role,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: "Request acknowledged successfully",
        data: item,
      });
    }

    // ---------------- REJECT ----------------
    if (action === "reject") {
      if (item.headApproval.status === "Rejected") {
        return res.status(400).json({
          success: false,
          message: "Request is already rejected",
        });
      }

      if (item.headApproval.status === "Completed") {
        return res.status(400).json({
          success: false,
          message: "Completed requests cannot be rejected",
        });
      }

      item.headApproval.status = "Rejected";
      item.headApproval.approvedBy = currentUser._id;
      item.headApproval.approvedAt = new Date();
      item.headApproval.updatedAt = new Date();

      item.workflowStage = "Rejected";
      item.finalStatus = "Rejected";
      setSubmissionStatus(item, "Rejected");

      upsertApprovalHistoryEntry(
        item,
        buildApprovalHistoryEntry({
          role: expectedHeadRole,
          approvedBy: currentUser._id,
          action: "Rejected",
          remarks: reason || "Request rejected",
          actionDate: new Date(),
        })
      );

      await item.save();

      await notifyIndividualRequest({
        request: item,
        moduleName: moduleKey,
        action: "module-head-rejected",
        actorName: currentUser?.name || role,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: "Request rejected successfully",
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

      await notifyIndividualRequest({
        request: item,
        moduleName: moduleKey,
        action: "module-head-completed",
        actorName: currentUser?.name || role,
        reason,
      });

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

const interchangeMediaAssignment = async (req, res) => {
  try {
    const currentUser = req.user || {};
    const rawTargetUserId = String(req.body.targetUserId || req.query.targetUserId || "").trim();
    const staffPayload = Array.isArray(req.body.staff) ? req.body.staff : [];
    const staffSelection = staffPayload[0] || null;
    const submission = await resolveSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Individual submission not found",
      });
    }

    const { item, Model } = submission;

    if (Model !== IndividualMedia) {
      return res.status(400).json({
        success: false,
        message: "Interchange is only supported for media submissions",
      });
    }

    const department = getAssignmentTargetDepartment(item);
    const assignedOwner = item.assignedTo
      ? await User.findById(item.assignedTo).select("_id name email role department").lean()
      : null;

    if (!isAllowedMediaAssignmentInterchange(currentUser, department, assignedOwner)) {
      return res.status(403).json({
        success: false,
        message: `Only the ${department} admin can interchange this request`,
      });
    }

    let targetUserId = rawTargetUserId;

    if (!targetUserId && staffSelection?.email) {
      const resolvedByEmail = await User.findOne({ email: staffSelection.email }).select("_id name email role department").lean();
      if (resolvedByEmail) {
        targetUserId = String(resolvedByEmail._id);
      }
    }

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "A valid targetUserId is required",
      });
    }

    const targetUser = await User.findById(targetUserId).select("_id name email role department").lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    const targetDepartment = String(targetUser.department || "").trim();
    const isDepartmentMatch = isValidMediaAssignmentTargetDepartment(
      currentUser,
      department,
      targetDepartment,
    );

    if (!isDepartmentMatch) {
      return res.status(400).json({
        success: false,
        message: `Target user must belong to the ${department} department`,
      });
    }

    item.assignedTo = targetUser._id;
    item.assignedBy = currentUser._id;
    item.assignedAt = new Date();
    item.updatedAt = new Date();

    await item.save();

    return res.status(200).json(await buildInterchangeResponse(item, currentUser, targetUser));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to interchange media assignment",
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

    await notifyIndividualRequest({
      request: item,
      moduleName: getModuleKeyFromModel(submission.Model),
      action: "closed",
      actorName: req.user?.name || "System",
      reason: "",
    });

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
  buildMediaHeadListFilter,
  getDepartmentTeamStats,
  getAllIndividualSubmissions,
  getIndividualSubmissionById,
  getRequestByFacultyModule,
  getMediaHeadList,
  getPosterRequests,
  getPosterRequestById,
  getVideoRequests,
  getVideoRequestById,
  getPosterHeadList,
  getVideoHeadList,
  interchangeMediaAssignment,
  hodApproval,
  hodReject,
  superAdminApproval,
  headApproval,
  closeIndividualSubmission,
};
