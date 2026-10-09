const IndividualEventAttending = require("../../models/individual/IndividualEventAttending");
const mongoose = require("mongoose");
const Faculty = require("../../models/Faculty");
const generateIndividualRequestNumber = require("../../utils/generateIndividualRequestNumber");
const { notifyIndividualRequest } = require("../../utils/individualNotifications");
const {
  normalizeIndividualEventAttendingDateTimes,
  toIstIndividualEventAttendingResponse,
} = require("../../utils/individualEventAttendingDateTime");

const normalizeFinanceValue = (financeRequired) => {
  if (typeof financeRequired === "string") {
    return ["yes", "true"].includes(financeRequired.trim().toLowerCase())
      ? "Yes"
      : "No";
  }

  return financeRequired === true ? "Yes" : "No";
};

const parseNumberField = (value) =>
  value !== undefined && value !== null && String(value).trim() !== ""
    ? Number(value)
    : null;

const parseStringField = (value) =>
  value !== undefined && value !== null ? String(value).trim() : "";

const parseMultipartArrayField = (payload, field) => {
  const value = payload[field];
  if (typeof value !== "string") return null;

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return `Field '${field}' must contain valid JSON.`;
  }

  if (!Array.isArray(parsed)) {
    return `Field '${field}' must be a JSON array.`;
  }

  payload[field] = parsed;
  return null;
};

const parseBooleanField = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  switch (value.trim().toLowerCase()) {
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
      return false;
    default:
      return null;
  }
};

const validateFinanceFields = ({ financeRequired, estimatedAmount, advanceAmount, advancePurpose }) => {
  if (financeRequired !== "Yes") return null;
  if (estimatedAmount === null || Number.isNaN(estimatedAmount)) {
    return "Estimated Amount is required when Finance Required is Yes.";
  }
  if (advanceAmount === null || Number.isNaN(advanceAmount) || advancePurpose === "") {
    return "Advance Amount and Purpose of Advance are required when Finance Required is Yes.";
  }
  return null;
};

const requiredFields = [
  "programType",
  "programName",
  "numberOfParticipants",
  "participants",
  "expectedOutcome",
  "programFromDate",
  "programToDate",
  // "onDutyFrom",
  // "onDutyTo",
];


const validatePayload = (payload = {}) => {
  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null ||
      (typeof payload[field] === "string" && payload[field].trim() === "")) {
      return `Field '${field}' is required.`;
    }
  }

  const participantCount = Number(payload.numberOfParticipants);
  if (!Number.isInteger(participantCount) || participantCount < 0) {
    return "numberOfParticipants must be a non-negative integer.";
  }
  if (!Array.isArray(payload.participants) || payload.participants.length !== participantCount) {
    return "numberOfParticipants must match the participants array length.";
  }

  const transportRequired = payload.externalTransportRequired === true;
  if (!transportRequired) return null;

  if (!Array.isArray(payload.externalTransport) || payload.externalTransport.length === 0) {
    return "externalTransport is required when externalTransportRequired is true.";
  }

  for (let transportIndex = 0; transportIndex < payload.externalTransport.length; transportIndex += 1) {
    const transport = payload.externalTransport[transportIndex];
    for (const field of ["travelOption", "travelDate", "from", "to", "classOrBerth"]) {
      if (transport?.[field] === undefined || transport?.[field] === null ||
        (typeof transport[field] === "string" && transport[field].trim() === "")) {
        return `External transport ${transportIndex + 1} field '${field}' is required.`;
      }
    }

    if (!Array.isArray(transport.passengers) || transport.passengers.length === 0) {
      return `External transport ${transportIndex + 1} passengers must contain at least one passenger.`;
    }

    for (let passengerIndex = 0; passengerIndex < transport.passengers.length; passengerIndex += 1) {
      const passenger = transport.passengers[passengerIndex];
      for (const field of ["name", "phoneNumber", "email", "designation", "gender", "age", "organization"]) {
        if (passenger?.[field] === undefined || passenger?.[field] === null ||
          (typeof passenger[field] === "string" && passenger[field].trim() === "")) {
          return `Passenger ${passengerIndex + 1} field '${field}' is required.`;
        }
      }
    }
  }

  return null;
};

exports.create = async (req, res) => {
  try {
    const payload = { ...req.body };
    for (const field of ["participants", "externalTransport"]) {
      const parseError = parseMultipartArrayField(payload, field);
      if (parseError) {
        return res.status(400).json({ success: false, message: parseError });
      }
    }

    if (payload.externalTransportRequired !== undefined) {
      const externalTransportRequired = parseBooleanField(payload.externalTransportRequired);
      if (externalTransportRequired === null) {
        return res.status(400).json({
          success: false,
          message: "Field 'externalTransportRequired' must be a boolean.",
        });
      }
      payload.externalTransportRequired = externalTransportRequired;
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const financeFields = {
      financeRequired: normalizeFinanceValue(payload.financeRequired),
      advanceAmount: parseNumberField(payload.advanceAmount),
      advanceToBeReceivedWithin: parseNumberField(payload.advanceToBeReceivedWithin),
      estimatedAmount: parseNumberField(payload.estimatedAmount),
      advancePurpose: parseStringField(payload.advancePurpose),
    };
    const financeValidationError = validateFinanceFields(financeFields);
    if (financeValidationError) {
      return res.status(400).json({ success: false, message: financeValidationError });
    }

    const facultyId = req.user?.facultyId || req.user?._id;
    if (!facultyId) {
      return res.status(400).json({ success: false, message: "Faculty identity is missing." });
    }

    const requestNumbering = await generateIndividualRequestNumber(
      "EVENTATTENDING",
      req.user?.department || payload.department || "UNKNOWN",
      null,
      { returnDetails: true },
    );

    const request = await IndividualEventAttending.create({
      ...normalizeIndividualEventAttendingDateTimes(payload),
      facultyId,
      requestType: "individualEventAttending",
      requestNo: requestNumbering.requestNo,
      module: requestNumbering.moduleName,
      financialYear: requestNumbering.financialYear,
      departmentCode: requestNumbering.departmentCode,
      requestSequence: requestNumbering.requestSequence,
      departmentSequence: requestNumbering.departmentSequence,
      numberOfParticipants: Number(payload.numberOfParticipants),
      foodAmount: parseNumberField(payload.foodAmount),
      transportAmount: parseNumberField(payload.transportAmount),
      accommodationAmount: parseNumberField(payload.accommodationAmount),
      principalApprovalFormName: String(
        req.files?.principalApprovalForm?.[0]?.path ||
          req.files?.principalApprovalForm?.[0]?.secure_url ||
          req.files?.principalApprovalForm?.[0]?.url ||
          payload.principalApprovalForm?.url ||
          payload.principalApprovalFormUrl ||
          "",
      ).trim(),
      externalTransportRequired: payload.externalTransportRequired === true,
      externalTransport: payload.externalTransportRequired === true ? payload.externalTransport : [],
      workflowStage: "Submitted",
      status: "Pending",
      finalStatus: "Pending",
      financeRequired: financeFields.financeRequired,
      advanceAmount: financeFields.financeRequired === "Yes" ? financeFields.advanceAmount : null,
      advanceToBeReceivedWithin: financeFields.financeRequired === "Yes"
        ? financeFields.advanceToBeReceivedWithin
        : null,
      estimatedAmount: financeFields.financeRequired === "Yes" ? financeFields.estimatedAmount : null,
      advancePurpose: financeFields.financeRequired === "Yes" ? financeFields.advancePurpose : "",
      referenceFiles: [],
      approvalHistory: [
        {
          role: "faculty",
          approvedBy: facultyId,
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
      ],
    });

    const facultyDoc = await Faculty.findById(facultyId).select("name email").lean();
    const requesterEmail = req.user?.email || payload.employeeEmail || payload.email || null;
    const employeeDetail = {
      name: facultyDoc?.name || req.user?.name || payload.employeeName || "The requester",
      email: facultyDoc?.email || requesterEmail,
    };

    await notifyIndividualRequest({
      request: {
        ...request.toObject(),
        employeeDetail,
        employeeEmail: requesterEmail,
        email: requesterEmail,
      },
      moduleName: "eventattending",
      action: "submitted",
      actorName: req.user?.name || payload.employeeName || "The requester",
      roleHint: "super-admin",
    });

    return res.status(201).json({
      success: true,
      message: "Individual event attending request created successfully.",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create request." });
  }
};

exports.getMine = async (req, res) => {
  try {
    const facultyId = req.user?.facultyId || req.user?._id;
    const requests = await IndividualEventAttending.find({ facultyId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: requests.map(toIstIndividualEventAttendingResponse),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch requests." });
  }
};

exports.getById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid request id." });
    }

    const facultyId = req.user?.facultyId || req.user?._id;
    const request = await IndividualEventAttending.findOne({
      _id: req.params.id,
      facultyId,
    }).lean();

    if (!request) {
      return res.status(404).json({ success: false, message: "Individual event attending request not found." });
    }

    return res.status(200).json({
      success: true,
      data: toIstIndividualEventAttendingResponse(request),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch request." });
  }
};
