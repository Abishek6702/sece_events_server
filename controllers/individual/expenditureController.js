const mongoose = require("mongoose");
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

const getSupportingDocument = (file) => {
  if (!file) return null;

  return {
    url: file.path || file.secure_url || file.url || "",
    publicId: file.filename || file.public_id || "",
    fileName: file.originalname || "",
  };
};

const buildFields = (body) => ({
  expenseName: body.expenseName === undefined ? undefined : String(body.expenseName).trim(),
  billNo: body.billNo === undefined ? undefined : String(body.billNo).trim(),
  billDate: body.billDate === undefined ? undefined : parseDate(body.billDate),
  vendorOrGuestName:
    body.vendorOrGuestName === undefined ? undefined : String(body.vendorOrGuestName).trim(),
  amount: body.amount === undefined ? undefined : parseAmount(body.amount),
  remarks: body.remarks === undefined ? undefined : String(body.remarks).trim(),
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

const getExpenditure = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can view expenditure details" });
  }

  try {
    const result = await ensureApprovedRequest(req.params.requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const expenditure = await IndividualExpenditure.findOne({ requestId: req.params.requestId }).lean();
    return res.status(200).json({
      success: true,
      request: result.resolved.request,
      data: expenditure,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createExpenditure = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can add expenditure details" });
  }

  try {
    const requestId = req.body.requestId;
    const result = await ensureApprovedRequest(requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const fields = buildFields(req.body);
    const validationError = validateRequiredFields(fields);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const existing = await IndividualExpenditure.findOne({ requestId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Expenditure details already exist for this request" });
    }

    const expenditure = await IndividualExpenditure.create({
      requestId,
      module: result.resolved.module,
      ...fields,
      supportingDocument: getSupportingDocument(req.file),
    });

    return res.status(201).json({ success: true, message: "Expenditure details saved successfully", data: expenditure });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateExpenditure = async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can edit expenditure details" });
  }

  try {
    const result = await ensureApprovedRequest(req.params.requestId);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const expenditure = await IndividualExpenditure.findOne({ requestId: req.params.requestId });
    if (!expenditure) return res.status(404).json({ success: false, message: "Expenditure details not found" });

    const fields = buildFields(req.body);
    Object.keys(fields).forEach((key) => {
      if (fields[key] !== undefined) expenditure[key] = fields[key];
    });

    if (req.file) expenditure.supportingDocument = getSupportingDocument(req.file);

    const validationError = validateRequiredFields(expenditure);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    await expenditure.save();
    return res.status(200).json({ success: true, message: "Expenditure details updated successfully", data: expenditure });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createExpenditure, getExpenditure, updateExpenditure };
