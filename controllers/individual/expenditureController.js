const mongoose = require("mongoose");
const Faculty = require("../../models/Faculty");
const IndividualExpenditure = require("../../models/individual/IndividualExpenditure");
const IndividualFood = require("../../models/individual/IndividualFood");
const IndividualTransport = require("../../models/individual/IndividualTransport");
const IndividualMedia = require("../../models/individual/IndividualMedia");
const IndividualPurchase = require("../../models/individual/IndividualPurchase");

const requestModels = [
  { module: "food", Model: IndividualFood },
  { module: "transport", Model: IndividualTransport },
  { module: "media", Model: IndividualMedia },
  { module: "purchase", Model: IndividualPurchase },
];

const normalizeRole = (role) =>
  String(role || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const isSuperAdmin = (req) =>
  ["super admin 1", "super admin 2"].includes(normalizeRole(req.user?.role));

const isFaculty = (req) => normalizeRole(req.user?.role) === "faculty";

const getSuperAdminNumber = (req) =>
  normalizeRole(req.user?.role) === "super admin 1" ? "1" : "2";

const isRequestOwnedByFaculty = (req, request) => {
  if (!request || !isFaculty(req)) return false;

  const currentUserId = String(req.user?.facultyId || req.user?._id || "");
  const employeeId = String(request.employee || "");
  return currentUserId && employeeId && currentUserId === employeeId;
};

const getRequest = async (requestId) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) return null;

  for (const requestModel of requestModels) {
    const request = await requestModel.Model.findById(requestId);
    if (request) return { ...requestModel, request };
  }

  return null;
};

const hasSuperAdminApproval = (request) =>
  [
    request.superAdmin1Approval?.status,
    request.superAdmin2Approval?.status,
    request.superAdminApproval?.status,
  ].some((status) => String(status || "").trim() === "Approved");

const buildFacultyBasicDetails = (faculty = {}) => {
  if (!faculty || typeof faculty !== "object") return null;

  const name = [faculty.salutation, faculty.firstName, faculty.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    _id: faculty._id ? String(faculty._id) : undefined,
    name: name || faculty.name || "",
    empId: faculty.empId || "",
    email: faculty.email || "",
    phone: faculty.phone ?? null,
    department: faculty.department || "",
    designation: faculty.designation || "",
    salutation: faculty.salutation || "",
  };
};

const shouldIncludeFacultyBasicDetails = (req) => isFaculty(req);

const ensureApprovedRequest = async (requestId) => {
  const resolved = await getRequest(requestId);
  if (!resolved) {
    return { error: { status: 404, message: "Individual request not found" } };
  }

  if (!hasSuperAdminApproval(resolved.request)) {
    return {
      error: {
        status: 400,
        message: "Expenditure details can be added after Super Admin approval",
      },
    };
  }

  return { resolved };
};

const closeApprovedRequestOnExpenditure = async (expenditure) => {
  if (!expenditure || String(expenditure.approvalStatus || "").trim() !== "Approved") {
    return null;
  }

  const requestId = expenditure.requestId ? String(expenditure.requestId) : "";
  if (!requestId) {
    return null;
  }

  for (const { Model } of requestModels) {
    const updated = await Model.findByIdAndUpdate(
      requestId,
      { $set: { finalStatus: "Closed" } },
      { new: true },
    );

    if (updated) {
      return updated;
    }
  }

  return null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseAmount = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const parseStructuredField = (value) => {
  if (value === undefined || value === null || value === "") return value;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const getSupportingDocument = (file) => {
  if (!file) return null;

  if (typeof file === "string") {
    try {
      file = JSON.parse(file);
    } catch {
      return null;
    }
  }

  return {
    url: file.path || file.secure_url || file.url || "",
    publicId: file.filename || file.public_id || "",
    fileName: file.originalname || "",
  };
};

const getUploadedSupportingDocument = (req) => {
  if (req.file) return getSupportingDocument(req.file);
  if (req.files && req.files.length) return getSupportingDocument(req.files[0]);
  return getSupportingDocument(parseStructuredField(req.body?.supportingDocument));
};

const resolveExpenditureModule = (requestedModule, requestModule) => {
  const module = String(requestedModule || "").toLowerCase().trim();
  if (["others", "miscellaneous", "misc"].includes(module)) return "others";
  return requestModule;
};

const buildFields = (body = {}) => ({
  expenseName: body && body.expenseName === undefined ? undefined : String(body?.expenseName || "").trim(),
  billNo: body && body.billNo === undefined ? undefined : String(body?.billNo || "").trim(),
  billDate: body && body.billDate === undefined ? undefined : parseDate(body?.billDate),
  vendorOrGuestName:
    body && body.vendorOrGuestName === undefined ? undefined : String(body?.vendorOrGuestName || "").trim(),
  amount: body && body.amount === undefined ? undefined : parseAmount(body?.amount),
  remarks: body && body.remarks === undefined ? undefined : String(body?.remarks || "").trim(),
});

const validateRequiredFields = (fields) => {
  if (!fields.expenseName) return "expenseName is required";
  if (fields.amount === null || fields.amount === undefined) {
    return "amount must be a valid number";
  }
  if (fields.billDate === undefined) return null;
  if (fields.billDate === null && fields.billDate !== undefined) {
    return "billDate must be a valid date";
  }
  return null;
};

const normalizeSectionEntries = (value) => {
  const parsed = parseStructuredField(value);

  if (Array.isArray(parsed)) {
    return parsed.filter((entry) => entry && typeof entry === "object");
  }

  if (parsed && typeof parsed === "object") {
    return [parsed];
  }

  return [];
};

const getSectionFile = (req, sectionName, itemIndex = 0) => {
  const fileNames = [
    `${sectionName}File`,
    `${sectionName}Files`,
    `${sectionName}Document`,
    `${sectionName}Documents`,
    sectionName,
    `${sectionName}s`,
  ];
  const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {});

  for (const fieldName of fileNames) {
    const direct = req.files && !Array.isArray(req.files) ? req.files[fieldName] : null;
    const matched = files.filter((file) => file.fieldname === fieldName);
    const value = direct || matched;

    if (!value || (Array.isArray(value) && !value.length)) continue;

    const selected = Array.isArray(value) ? value[itemIndex] || value[0] : value;
    if (selected) return selected;
  }

  return null;
};

const getCombinedExpenditure = (body, req) => {
  const sections = ["food", "transport", "purchase", "media", "others"].filter(
    (section) => body?.[section] !== undefined,
  );
  if (!sections.length) return null;

  const data = {};

  sections.forEach((section) => {
    const entries = normalizeSectionEntries(body?.[section]);
    if (!entries.length) return;

    data[section] = entries.map((entry, itemIndex) => {
      const item = buildFields(entry || {});
      const validationError = validateRequiredFields(item);
      if (validationError) {
        throw new Error(`${section}[${itemIndex}]: ${validationError}`);
      }

      const sectionFile = getSectionFile(req, section, itemIndex);
      if (sectionFile) {
        item.supportingDocument = getSupportingDocument(sectionFile);
      }

      return item;
    });
  });

  return { sections, data };
};

const getRequestStatus = (request = {}) => {
  if (!request || typeof request !== "object") return "Pending";

  return (
    request.finalStatus ||
    request.overallStatus ||
    request.status ||
    request.approvalStatus ||
    "Pending"
  );
};

const getRequestDate = (request = {}) => {
  if (!request || typeof request !== "object") return null;

  const dateCandidates = [
    request.date,
    request.pickupDateTime,
    request.dropDateTime,
    request.deliveryDate,
    request.actionDate,
    request.createdAt,
  ];

  for (const value of dateCandidates) {
    const parsed = parseDate(value);
    if (parsed) return parsed;
  }

  return null;
};

const buildOverallExpenditureSummary = (requestDoc, expenditure, facultyOwner) => {
  const request = requestDoc?.request || null;
  const { superAdmin1Approval, superAdmin2Approval, ...expenditureDetails } = expenditure || {};

  const faculty = facultyOwner
    ? {
        _id: facultyOwner._id ? String(facultyOwner._id) : undefined,
        name: facultyOwner.name || "",
        email: facultyOwner.email || "",
        phoneNumber: facultyOwner.phoneNumber || facultyOwner.phone || "",
        department: facultyOwner.department || "",
      }
    : null;

  return {
    requestId: String(request?._id || expenditureDetails.requestId || ""),
    requestNo: request?.requestNo || "",
    module: request?.module || expenditureDetails.module || "combined",
    requestDate: getRequestDate(request),
    status: getRequestStatus(request),
    faculty,
    expenditure: {
      ...expenditureDetails,
      _id: expenditureDetails._id ? String(expenditureDetails._id) : null,
      requestId: expenditureDetails.requestId ? String(expenditureDetails.requestId) : String(request?._id || ""),
      module: expenditureDetails.module || request?.module || "combined",
      food: Array.isArray(expenditureDetails.food)
        ? expenditureDetails.food
        : expenditureDetails.food
          ? [expenditureDetails.food]
          : [],
      others: Array.isArray(expenditureDetails.others)
        ? expenditureDetails.others
        : expenditureDetails.others
          ? [expenditureDetails.others]
          : [],
      supportingDocument: expenditureDetails.supportingDocument || {},
      approvalStatus: expenditureDetails.approvalStatus || "Pending",
    },
  };
};

const getOverallExpenditure = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin 1 and Super Admin 2 can view overall expenditure details",
    });
  }

  try {
    const requestId = req.params?.requestId || req.query?.requestId;

    if (requestId) {
      const expenditure = await IndividualExpenditure.findOne({ requestId }).lean();

      const requestDoc = await Promise.all(
        requestModels.map(async ({ module, Model }) => {
          const doc = await Model.findById(requestId).populate({
            path: "employee",
            select: "_id name email phoneNumber department salutation firstName lastName empId designation",
          }).lean();
          if (!doc) return null;

          return {
            module,
            request: doc,
          };
        }),
      ).then((results) => results.find((entry) => entry && entry.request) || null);

      if (!expenditure) {
        const request = requestDoc?.request || null;
        return res.status(200).json({
          success: true,
          message: "Expenditure details not available",
          data: {
            requestId: String(request?._id || requestId),
            requestNo: request?.requestNo || "",
            module: request?.module || "combined",
            requestDate: getRequestDate(request),
            status: getRequestStatus(request),
            faculty: null,
            expenditure: {
              _id: null,
              requestId: String(request?._id || requestId),
              module: request?.module || "combined",
              food: [],
              others: [],
              supportingDocument: {},
              remarks: "",
              approvalStatus: "Pending",
            },
          },
        });
      }

      const facultyOwner = requestDoc?.request?.employee
        ? await Faculty.findById(requestDoc.request.employee).lean()
        : null;

      return res.status(200).json({
        success: true,
        message: "Overall expenditure details fetched successfully",
        data: buildOverallExpenditureSummary(requestDoc, expenditure, facultyOwner),
      });
    }

    const modelList = [
      { module: "food", Model: IndividualFood },
      { module: "transport", Model: IndividualTransport },
      { module: "media", Model: IndividualMedia },
      { module: "purchase", Model: IndividualPurchase },
    ];

    const requestEntries = (
      await Promise.all(
        modelList.map(async ({ module, Model }) => {
          const docs = await Model.find().populate({
            path: "employee",
            select: "_id name email phoneNumber department",
          }).lean();

          return docs.map((doc) => ({
            requestId: String(doc._id),
            requestNo: doc.requestNo || null,
            module,
            status: doc.finalStatus || doc.overallStatus || doc.status || doc.approvalStatus || "Pending",
            faculty: doc.employee
              ? {
                  _id: doc.employee._id ? String(doc.employee._id) : null,
                  name: doc.employee.name || "",
                  email: doc.employee.email || "",
                  phoneNumber: doc.employee.phoneNumber || "",
                  department: doc.employee.department || "",
                }
              : null,
            _requestDoc: doc,
          }));
        })
      )
    ).flat();

    const requestIds = requestEntries.map((entry) => entry.requestId).filter(Boolean);
    const expenditureDocs = await IndividualExpenditure.find({
      requestId: { $in: requestIds },
    }).lean();

    const expenditureMap = new Map();
    expenditureDocs.forEach((expenditure) => {
      expenditureMap.set(String(expenditure.requestId), expenditure);
    });

    const entries = requestEntries.map((entry) => {
      const expenditure = expenditureMap.get(entry.requestId) || null;
      const facultyOwner = entry._requestDoc?.employee || null;
      const summary = buildOverallExpenditureSummary(
        { request: entry._requestDoc },
        expenditure,
        facultyOwner,
      );

      return summary;
    });

    entries.sort((a, b) => new Date(b.expenditure?.createdAt || 0) - new Date(a.expenditure?.createdAt || 0));

    return res.status(200).json({
      success: true,
      message: "Overall expenditure details fetched successfully",
      data: entries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFacultyExpenditureList = async (req, res) => {
  if (!isFaculty(req)) {
    return res.status(403).json({
      success: false,
      message: "Only faculty can view all expenditure details",
    });
  }

  try {
    const facultyId = String(req.user?.facultyId || req.user?._id || "");
    if (!facultyId) {
      return res.status(400).json({ success: false, message: "Faculty profile is required" });
    }

    const requestResults = await Promise.all(
      requestModels.map(async ({ Model }) => {
        const docs = await Model.find({ employee: facultyId })
          .select("_id requestNo module status createdAt date pickupDateTime dropDateTime deliveryDate")
          .lean();
        return docs;
      }),
    );

    const requestDocs = requestResults.flat();
    const requestMap = new Map();

    requestDocs.forEach((request) => {
      requestMap.set(String(request._id), request);
    });

    const requestIds = requestDocs.map((request) => String(request._id)).filter(Boolean);

    const expenditures = await IndividualExpenditure.find({
      requestId: { $in: requestIds },
    }).lean();

    const facultyProfile = await Faculty.findById(facultyId).lean();
    const facultyDetails = buildFacultyBasicDetails(facultyProfile);

    const enrichedData = expenditures.map((item) => {
      const request = requestMap.get(String(item.requestId));
      const { superAdmin1Approval, superAdmin2Approval, ...expenditureDetails } = item;

      return {
        requestId: String(item.requestId),
        requestNo: request?.requestNo || "",
        module: request?.module || expenditureDetails.module || "",
        requestDate: getRequestDate(request),
        status: request?.status || "",
        finalStatus: request?.finalStatus || null,
        faculty: facultyDetails,
        expenditure: {
          ...expenditureDetails,
          approvalStatus: expenditureDetails.approvalStatus || "Pending",
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedData.length,
      data: enrichedData,
    });
  } catch (error) {
    console.error("getFacultyExpenditureList error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getExpenditure = async (req, res) => {
  if (!isSuperAdmin(req) && !isFaculty(req)) {
    return res.status(403).json({ success: false, message: "Only faculty, Super Admin 1 and Super Admin 2 can view expenditure details" });
  }

  try {
    const result = await ensureApprovedRequest(req.params.requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    if (!isSuperAdmin(req) && !isRequestOwnedByFaculty(req, result.resolved.request)) {
      return res.status(403).json({ success: false, message: "Faculty can only view their own expenditure details" });
    }

    const requestOwner = result.resolved.request?.employee
      ? await Faculty.findById(result.resolved.request.employee).lean()
      : null;

    const facultyBasicDetails = shouldIncludeFacultyBasicDetails(req)
      ? {
          _id: requestOwner?._id ? String(requestOwner._id) : undefined,
          name: requestOwner?.name || "",
          email: requestOwner?.email || "",
          phoneNumber: requestOwner?.phoneNumber || requestOwner?.phone || "",
          department: requestOwner?.department || "",
        }
      : null;
    const expenditure = await IndividualExpenditure.findOne({ requestId: req.params.requestId }).lean();

    return res.status(200).json({
      success: true,
      data: buildOverallExpenditureSummary(result.resolved, expenditure, requestOwner),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createExpenditure = async (req, res) => {
  if (!isFaculty(req)) {
    return res.status(403).json({ success: false, message: "Only faculty can add expenditure details" });
  }

  try {
    const preparedBody = {
      ...req.body,
      food: parseStructuredField(req.body?.food),
      others: parseStructuredField(req.body?.others),
      supportingDocument: parseStructuredField(req.body?.supportingDocument),
    };

    const requestId = preparedBody.requestId;
    const result = await ensureApprovedRequest(requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    if (!isSuperAdmin(req) && !isRequestOwnedByFaculty(req, result.resolved.request)) {
      return res.status(403).json({ success: false, message: "Faculty can only create expenditure for their own request" });
    }

    let combined;
    try {
      combined = getCombinedExpenditure(preparedBody, req);
    } catch (sectionError) {
      return res.status(400).json({ success: false, message: sectionError.message });
    }

    const fields = combined ? {} : buildFields(preparedBody);
    const validationError = combined ? null : validateRequiredFields(fields);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const existing = await IndividualExpenditure.findOne({ requestId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Expenditure details already exist for this request" });
    }

    const expenditure = await IndividualExpenditure.create({
      requestId,
      module: combined
        ? "combined"
        : resolveExpenditureModule(preparedBody.module, result.resolved.module),
      ...fields,
      ...(combined ? combined.data : {}),
      remarks: combined ? String(preparedBody.remarks || "").trim() : fields.remarks,
      supportingDocument: getUploadedSupportingDocument(req),
    });

    return res.status(201).json({ success: true, message: "Expenditure details saved successfully", data: expenditure });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resetExpenditureApprovalState = (expenditure) => {
  if (!expenditure || typeof expenditure !== "object") return expenditure;

  expenditure.superAdmin1Approval = {
    status: "Pending",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    remarks: "",
  };
  expenditure.superAdmin2Approval = {
    status: "Pending",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    remarks: "",
  };
  expenditure.approvalStatus = "Pending";

  return expenditure;
};

const updateExpenditure = async (req, res) => {
  if (!isSuperAdmin(req) && !isFaculty(req)) {
    return res.status(403).json({ success: false, message: "Only faculty and Super Admin 1/2 can edit expenditure details" });
  }

  try {
    const preparedBody = {
      ...req.body,
      food: parseStructuredField(req.body?.food),
      others: parseStructuredField(req.body?.others),
      supportingDocument: parseStructuredField(req.body?.supportingDocument),
    };

    const result = await ensureApprovedRequest(req.params.requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    let expenditure = await IndividualExpenditure.findOne({ requestId: req.params.requestId });
    if (!expenditure) {
      expenditure = new IndividualExpenditure({
        requestId: req.params.requestId,
        module: "combined",
      });
    }

    let combined;
    try {
      combined = getCombinedExpenditure(preparedBody, req);
    } catch (sectionError) {
      return res.status(400).json({ success: false, message: sectionError.message });
    }

    if (combined) {
      expenditure.module = "combined";
      Object.keys(combined.data).forEach((key) => {
        expenditure[key] = combined.data[key];
      });
      expenditure.remarks = String(preparedBody.remarks || expenditure.remarks || "").trim();
    } else {
      const fields = buildFields(preparedBody);
      Object.keys(fields).forEach((key) => {
        if (fields[key] !== undefined) expenditure[key] = fields[key];
      });

      if (req.file || req.files || preparedBody.supportingDocument) {
        expenditure.supportingDocument = getUploadedSupportingDocument(req);
      }
    }

    const validationError = combined ? null : validateRequiredFields(expenditure);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    resetExpenditureApprovalState(expenditure);

    await expenditure.save();
    return res.status(200).json({ success: true, message: "Expenditure details updated successfully", data: expenditure });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateOverallApprovalStatus = (expenditure) => {
  const superAdmin1Status = String(expenditure.superAdmin1Approval?.status || "").trim();
  const superAdmin2Status = String(expenditure.superAdmin2Approval?.status || "").trim();

  if (superAdmin1Status === "Rejected" || superAdmin2Status === "Rejected") {
    expenditure.approvalStatus = "Rejected";
    return;
  }

  if (superAdmin1Status === "Approved" || superAdmin2Status === "Approved") {
    expenditure.approvalStatus = "Approved";
    return;
  }

  expenditure.approvalStatus = "Pending";
};

const reviewExpenditure = async (req, res, action) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin 1 and Super Admin 2 can review expenditure details",
    });
  }

  const { expenditureId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(expenditureId)) {
    return res.status(404).json({ success: false, message: "Expenditure details not found" });
  }

  const remarks = String(req.body.remarks || "").trim();
  if (action === "reject" && !remarks) {
    return res.status(400).json({ success: false, message: "Rejection remarks are required" });
  }

  try {
    const expenditure = await IndividualExpenditure.findById(expenditureId);
    if (!expenditure) {
      return res.status(404).json({ success: false, message: "Expenditure details not found" });
    }

    const adminNumber = getSuperAdminNumber(req);
    const approvalField = `superAdmin${adminNumber}Approval`;
    const approval = expenditure[approvalField] || {};
    if (["Approved", "Rejected"].includes(approval.status)) {
      return res.status(409).json({
        success: false,
        message: `Super Admin ${adminNumber} has already reviewed this expenditure`,
      });
    }

    const actor = req.user.facultyId || req.user._id;
    const now = new Date();
    expenditure[approvalField] = {
      status: action === "approve" ? "Approved" : "Rejected",
      approvedBy: action === "approve" ? actor : null,
      approvedAt: action === "approve" ? now : null,
      rejectedBy: action === "reject" ? actor : null,
      rejectedAt: action === "reject" ? now : null,
      remarks: remarks || "Expenditure approved",
    };
    updateOverallApprovalStatus(expenditure);
    await expenditure.save();

    if (action === "approve") {
      await closeApprovedRequestOnExpenditure(expenditure);
    }

    return res.status(200).json({
      success: true,
      message: `Expenditure ${action === "approve" ? "approved" : "rejected"} by Super Admin ${adminNumber}`,
      data: expenditure,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const approveExpenditure = (req, res) => reviewExpenditure(req, res, "approve");
const rejectExpenditure = (req, res) => reviewExpenditure(req, res, "reject");

module.exports = {
  requestModels,
  closeApprovedRequestOnExpenditure,
  buildFacultyBasicDetails,
  shouldIncludeFacultyBasicDetails,
  buildOverallExpenditureSummary,
  getRequestDate,
  getRequestStatus,
  createExpenditure,
  getOverallExpenditure,
  getFacultyExpenditureList,
  getExpenditure,
  updateExpenditure,
  resetExpenditureApprovalState,
  approveExpenditure,
  rejectExpenditure,
};
