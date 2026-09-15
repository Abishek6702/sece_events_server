const mongoose = require("mongoose");
const IndividualTicketing = require("../models/IndividualTicketing");
const User = require("../models/User");
const generateIndividualRequestNumber = require("../utils/generateIndividualRequestNumber");
const sendMail = require("../utils/sendMail");

const ALLOWED_TRAVEL_OPTIONS = ["Flight", "Train", "Bus", "Cab", "Other"];
const APPROVAL_STATUS_VALUES = ["Pending", "Approved", "Rejected"];
const TICKET_STATUSES = ["Pending", "Approved", "Acknowledged", "Completed", "Rejected"];

const normalizeRole = (value = "") => String(value || "").trim().toLowerCase();
const normalizeDepartment = (value = "") => String(value || "").trim().toLowerCase();

const isSuperAdminRole = (role = "") => ["super admin 1", "super admin 2"].includes(normalizeRole(role));
const isFacultyRole = (role = "") => normalizeRole(role) === "faculty";

const isHeadTicketingUser = (user = {}) => {
  if (!user) return false;
  return normalizeRole(user.role) === "head" && normalizeDepartment(user.department) === "externaltransport";
};

const getApprovalEntry = (request, adminNumber) => {
  if (adminNumber === 1) return request.superAdmin1Approval || { status: "Pending" };
  return request.superAdmin2Approval || { status: "Pending" };
};

const computeOverallTicketStatus = (ticket = {}) => {
  if (!ticket || typeof ticket !== "object") return "Pending";

  const directStatus = String(ticket.status || "").trim();
  if (["Approved", "Acknowledged", "Completed", "Rejected"].includes(directStatus)) {
    return directStatus;
  }

  const sa1 = String(ticket.superAdmin1Approval?.status || "").trim();
  const sa2 = String(ticket.superAdmin2Approval?.status || "").trim();

  if (sa1 === "Rejected" || sa2 === "Rejected") return "Rejected";
  if (sa1 === "Approved" || sa2 === "Approved") return "Approved";
  return "Pending";
};

const buildHistoryEntry = ({ action, actorId, role, details }) => ({
  action,
  actor: actorId || null,
  role: role || "",
  details: details || "",
  at: new Date(),
});

const validatePassenger = (passenger, index) => {
  if (!passenger || typeof passenger !== "object") {
    return `Passenger ${index + 1} is invalid.`;
  }

  const requiredFields = [
    "name",
    "phoneNumber",
    "email",
    "designation",
    "gender",
    "age",
    "organization",
  ];

  for (const field of requiredFields) {
    if (passenger[field] === undefined || passenger[field] === null || String(passenger[field]).trim() === "") {
      return `Passenger ${index + 1} field '${field}' is required.`;
    }
  }

  return null;
};

const validateTicketingPayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "Request body is required." };
  }

  const requiredFields = [
    "travelOption",
    "travelDate",
    "from",
    "to",
    "travelClass",
    "numberOfPassengers",
    "passengers",
  ];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || (typeof payload[field] === "string" && payload[field].trim() === "")) {
      return { valid: false, message: `Field '${field}' is required.` };
    }
  }

  if (!ALLOWED_TRAVEL_OPTIONS.includes(payload.travelOption)) {
    return { valid: false, message: `travelOption must be one of: ${ALLOWED_TRAVEL_OPTIONS.join(", ")}.` };
  }

  const parsedTravelDate = new Date(payload.travelDate);
  if (Number.isNaN(parsedTravelDate.getTime())) {
    return { valid: false, message: "travelDate must be a valid date." };
  }

  const passengerList = Array.isArray(payload.passengers) ? payload.passengers : [];
  if (passengerList.length === 0) {
    return { valid: false, message: "At least one passenger is required." };
  }

  const parsedPassengers = Number(payload.numberOfPassengers);
  if (!Number.isFinite(parsedPassengers) || parsedPassengers < 1) {
    return { valid: false, message: "numberOfPassengers must be a positive number." };
  }

  if (passengerList.length !== parsedPassengers) {
    return { valid: false, message: "numberOfPassengers must match the passengers array length." };
  }

  for (let i = 0; i < passengerList.length; i += 1) {
    const passengerError = validatePassenger(passengerList[i], i);
    if (passengerError) {
      return { valid: false, message: passengerError };
    }
  }

  return { valid: true };
};

const ensureRequestOwnership = (req, request) => {
  const actorUserId = req.user?._id ? String(req.user._id) : "";
  const actorFacultyId = req.user?.facultyId ? String(req.user.facultyId) : "";
  const requestFacultyId = String(request.facultyId || "");
  const candidateIds = [...new Set([actorUserId, actorFacultyId].filter(Boolean))];
  return candidateIds.length > 0 && requestFacultyId && candidateIds.includes(requestFacultyId);
};

const getHeadUser = async () => {
  return User.findOne({
    department: { $regex: /^Externaltransport$/i },
    role: { $regex: /^head$/i },
  }).lean();
};

const ensureSuperAdminReviewClosed = (request) => {
  if (!request) return false;
  const sa1Status = String(request.superAdmin1Approval?.status || "").trim();
  const sa2Status = String(request.superAdmin2Approval?.status || "").trim();
  return [sa1Status, sa2Status].some((status) => ["Approved", "Rejected"].includes(status));
};

const sendTicketingApprovalEmail = async (request, actorUser) => {
  try {
    const facultyUser = await User.findById(request.facultyId).select("name email").lean();
    const headUser = await User.findOne({
      department: { $regex: /^Externaltransport$/i },
      role: { $regex: /^head$/i },
    }).select("name email").lean();

    const recipients = [];
    if (facultyUser?.email) recipients.push(facultyUser.email);
    if (headUser?.email) recipients.push(headUser.email);

    if (!recipients.length) return;

    const detailsHtml = `
      <div>
        <p>Dear Team,</p>
        <p>The ticket request for <strong>${request.from}</strong> to <strong>${request.to}</strong> has been approved by <strong>${actorUser?.name || "Super Admin"}</strong>.</p>
        <p><strong>Travel Date:</strong> ${new Date(request.travelDate).toLocaleDateString()}</p>
        <p><strong>Travel Option:</strong> ${request.travelOption}</p>
        <p><strong>Status:</strong> ${request.status}</p>
      </div>
    `;

    for (const recipient of recipients) {
      await sendMail(recipient, `[SECE Events] Individual Ticketing Approved - ${request._id}`, detailsHtml);
    }
  } catch (error) {
    console.error("Error sending ticket approval email:", error);
  }
};

const buildTicketingQuery = (baseQuery = {}) => ({
  ...baseQuery,
  isDeleted: { $ne: true },
});

exports.createTicketingRequest = async (req, res) => {
  try {
    const validation = validateTicketingPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const facultyId = req.user?._id || req.user?.facultyId;
    if (!facultyId) {
      return res.status(400).json({ success: false, message: "Faculty identity is missing." });
    }

    const departmentCode = String(req.body.departmentCode || "IR")
      .trim()
      .toUpperCase();

    const requestNumbering = await generateIndividualRequestNumber(
      "EXTERNALTRANSPORT",
      departmentCode,
      null,
      { returnDetails: true },
    );

    const ticket = await IndividualTicketing.create({
      facultyId,
      requestNo: requestNumbering.requestNo,
      module: requestNumbering.moduleName,
      financialYear: requestNumbering.financialYear,
      departmentCode: requestNumbering.departmentCode,
      requestSequence: requestNumbering.requestSequence,
      departmentSequence: requestNumbering.departmentSequence,
      travelOption: req.body.travelOption,
      travelDate: new Date(req.body.travelDate),
      from: req.body.from,
      to: req.body.to,
      flightNumber: req.body.flightNumber || "",
      travelClass: req.body.travelClass,
      numberOfPassengers: Number(req.body.numberOfPassengers),
      specialRequirements: req.body.specialRequirements || "",
      passengers: req.body.passengers,
      status: "Pending",
      superAdmin1Approval: { status: "Pending" },
      superAdmin2Approval: { status: "Pending" },
      history: [
        buildHistoryEntry({
          action: "Created",
          actorId: facultyId,
          role: "faculty",
          details: "Ticket booking request submitted by faculty.",
        }),
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Individual ticket booking request created successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create ticket request." });
  }
};

exports.getFacultyTicketingRequests = async (req, res) => {
  try {
    const facultyId = req.user?._id || req.user?.facultyId;
    if (!facultyId) {
      return res.status(400).json({ success: false, message: "Faculty identity is missing." });
    }

    const candidateIds = [...new Set([String(req.user?._id), String(req.user?.facultyId)].filter(Boolean))];
    const query = candidateIds.length > 1 ? { facultyId: { $in: candidateIds } } : { facultyId: candidateIds[0] };
    const tickets = await IndividualTicketing.find(buildTicketingQuery(query)).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch faculty ticket requests." });
  }
};

exports.getSuperAdminTicketingRequests = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can access this endpoint." });
    }

    const tickets = await IndividualTicketing.find(buildTicketingQuery({
      status: { $in: ["Pending", "Approved", "Acknowledged"] },
    })).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch super admin ticket requests." });
  }
};

exports.editTicketingRequest = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can edit ticket requests." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!request) {
      return res.status(404).json({ success: false, message: request ? "Individual ticket already deleted" : "Ticket request not found." });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only Pending requests can be edited by Super Admins." });
    }

    const validation = validateTicketingPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    Object.assign(request, {
      travelOption: req.body.travelOption,
      travelDate: new Date(req.body.travelDate),
      from: req.body.from,
      to: req.body.to,
      flightNumber: req.body.flightNumber || "",
      travelClass: req.body.travelClass,
      numberOfPassengers: Number(req.body.numberOfPassengers),
      specialRequirements: req.body.specialRequirements || "",
      passengers: req.body.passengers,
    });

    request.history.push(
      buildHistoryEntry({
        action: "Edited",
        actorId: req.user._id,
        role: req.user.role,
        details: `Ticket was edited by ${req.user.role}.`,
      }),
    );

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Ticket request updated successfully by Super Admin.",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to edit ticket request." });
  }
};

exports.approveTicketingRequest = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can approve ticket requests." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    const normalizedRole = normalizeRole(req.user.role);
    const adminNumber = normalizedRole === "super admin 1" ? 1 : 2;
    const approvalField = adminNumber === 1 ? "superAdmin1Approval" : "superAdmin2Approval";

    if (["Approved", "Rejected"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "This request has already reached a final decision." });
    }

    if (ensureSuperAdminReviewClosed(request)) {
      return res.status(409).json({ success: false, message: "Another Super Admin has already reviewed this request. No further approval or rejection is allowed." });
    }

    const currentApproval = getApprovalEntry(request, adminNumber);
    if (currentApproval.status === "Approved" || currentApproval.status === "Rejected") {
      return res.status(409).json({ success: false, message: `Super Admin ${adminNumber} has already reviewed this request.` });
    }

    request[approvalField] = {
      status: "Approved",
      approvedBy: req.user._id,
      approvedAt: new Date(),
      reason: req.body.reason || "Approved by super admin.",
    };

    request.status = "Approved";
    request.updatedAt = new Date();
    request.history.push(
      buildHistoryEntry({
        action: "Approved",
        actorId: req.user._id,
        role: req.user.role,
        details: req.body.reason || `Approved by ${req.user.role}.`,
      }),
    );

    await request.save();
    await sendTicketingApprovalEmail(request, req.user);

    return res.status(200).json({
      success: true,
      message: `Ticket request approved by Super Admin ${adminNumber}.`,
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to approve ticket request." });
  }
};

exports.rejectTicketingRequest = async (req, res) => {
  try {
    if (!isSuperAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Only Super Admin 1 and Super Admin 2 can reject ticket requests." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    const normalizedRole = normalizeRole(req.user.role);
    const adminNumber = normalizedRole === "super admin 1" ? 1 : 2;
    const approvalField = adminNumber === 1 ? "superAdmin1Approval" : "superAdmin2Approval";

    if (["Rejected", "Completed", "Acknowledged"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "This request cannot be rejected at its current stage." });
    }

    if (ensureSuperAdminReviewClosed(request)) {
      return res.status(409).json({ success: false, message: "Another Super Admin has already reviewed this request. Rejection is final." });
    }

    if (!req.body.reason || String(req.body.reason).trim() === "") {
      return res.status(400).json({ success: false, message: "A rejection reason is required." });
    }

    const currentApproval = getApprovalEntry(request, adminNumber);
    if (currentApproval.status === "Approved" || currentApproval.status === "Rejected") {
      return res.status(409).json({ success: false, message: `Super Admin ${adminNumber} has already reviewed this request.` });
    }

    request[approvalField] = {
      status: "Rejected",
      approvedBy: req.user._id,
      approvedAt: new Date(),
      reason: req.body.reason,
    };

    request.status = "Rejected";
    request.updatedAt = new Date();
    request.history.push(
      buildHistoryEntry({
        action: "Rejected",
        actorId: req.user._id,
        role: req.user.role,
        details: req.body.reason,
      }),
    );

    await request.save();

    return res.status(200).json({
      success: true,
      message: `Ticket request rejected by Super Admin ${adminNumber}.`,
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to reject ticket request." });
  }
};

exports.getHeadTicketingRequests = async (req, res) => {
  try {
    if (!isHeadTicketingUser(req.user)) {
      return res.status(403).json({ success: false, message: "Only the External Transport department head can access this endpoint." });
    }

    const tickets = await IndividualTicketing.find(buildTicketingQuery({
      status: { $in: ["Approved", "Acknowledged", "Completed"] },
    })).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch head ticket requests." });
  }
};

exports.acknowledgeTicketingRequest = async (req, res) => {
  try {
    if (!isHeadTicketingUser(req.user)) {
      return res.status(403).json({ success: false, message: "Only the External Transport department head can acknowledge ticket requests." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    if (request.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved requests can be acknowledged." });
    }

    request.status = "Acknowledged";
    request.acknowledgedAt = new Date();
    request.updatedAt = new Date();
    request.history.push(
      buildHistoryEntry({
        action: "Acknowledged",
        actorId: req.user._id,
        role: req.user.role,
        details: "Ticket acknowledged by External Transport head.",
      }),
    );

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Ticket request acknowledged successfully.",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to acknowledge ticket request." });
  }
};

exports.completeTicketingRequest = async (req, res) => {
  try {
    if (!isHeadTicketingUser(req.user)) {
      return res.status(403).json({ success: false, message: "Only the External Transport department head can complete ticket requests." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    if (request.status !== "Acknowledged") {
      return res.status(400).json({ success: false, message: "Only Acknowledged requests can be marked as completed." });
    }

    request.status = "Completed";
    request.completedAt = new Date();
    request.updatedAt = new Date();
    request.history.push(
      buildHistoryEntry({
        action: "Completed",
        actorId: req.user._id,
        role: req.user.role,
        details: "Ticket completed by External Transport head.",
      }),
    );

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Ticket request completed successfully.",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to complete ticket request." });
  }
};

exports.getTicketingRequestById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    if (req.user && isSuperAdminRole(req.user.role)) {
      return res.status(200).json({ success: true, data: request });
    }

    if (req.user && isHeadTicketingUser(req.user)) {
      return res.status(200).json({ success: true, data: request });
    }

    if (req.user && String(req.user.facultyId || req.user._id) === String(request.facultyId)) {
      return res.status(200).json({ success: true, data: request });
    }

    return res.status(403).json({ success: false, message: "You are not authorized to access this ticket request." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load ticket request." });
  }
};

exports.softDeleteTicketingRequest = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id." });
    }

    const request = await IndividualTicketing.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Ticket request not found." });
    }

    if (request.isDeleted) {
      return res.status(409).json({ success: false, message: "Individual ticket already deleted" });
    }

    request.isDeleted = true;
    request.deletedAt = new Date();
    request.deletedBy = req.user._id;
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Individual ticket deleted successfully.",
      data: {
        id: request._id,
        isDeleted: request.isDeleted,
        deletedAt: request.deletedAt,
        deletedBy: request.deletedBy,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete ticket request." });
  }
};

module.exports = {
  validateTicketingPayload,
  computeOverallTicketStatus,
  ...exports,
};
