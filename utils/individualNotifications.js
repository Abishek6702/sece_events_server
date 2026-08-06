const sendMail = require("./sendMail");
const mongoose = require("mongoose");
const Faculty = require("../models/Faculty");
const User = require("../models/User");
const eventCreationTemplate = require("./mailTemplates/eventCreation");
const hodApprovalTemplate = require("./mailTemplates/hodApproval");
const adminApprovalTemplate = require("./mailTemplates/adminApproval");
const eventRejectionTemplate = require("./mailTemplates/eventRejection");

const MODULE_LABELS = {
  food: "Food",
  purchase: "Purchase",
  transport: "Transport",
  media: "Media",
};

const getActorDisplayName = (request, actorName) => {
  if (actorName) return actorName;
  if (request?.employeeDetail?.name) return request.employeeDetail.name;
  if (request?.employee?.name) return request.employee.name;
  return "the requester";
};

const getRequestDepartment = (request) => request?.department || request?.departmentCode || "";

const resolveEmployeeEmail = async (request) => {
  if (!request) return null;

  const explicitEmail =
    request?.employeeDetail?.email ||
    request?.employee?.email ||
    request?.employeeEmail ||
    request?.email ||
    request?.createdByEmail;

  if (explicitEmail) {
    return explicitEmail;
  }

  const employeeValue = request?.employee;
  if (!employeeValue) {
    return null;
  }

  let emailCandidate = null;
  let objectIdCandidate = null;

  if (typeof employeeValue === "object") {
    if (employeeValue.email) {
      return employeeValue.email;
    }
    if (employeeValue._id) {
      objectIdCandidate = employeeValue._id;
    }
  } else if (typeof employeeValue === "string") {
    const trimmed = employeeValue.trim();
    if (trimmed.includes("@")) {
      emailCandidate = trimmed;
    } else if (mongoose.Types.ObjectId.isValid(trimmed)) {
      objectIdCandidate = trimmed;
    }
  }

  if (emailCandidate) {
    const facultyByEmail = await Faculty.findOne({ email: emailCandidate }).select("email").lean();
    if (facultyByEmail?.email) return facultyByEmail.email;

    const userByEmail = await User.findOne({ email: emailCandidate }).select("email").lean();
    if (userByEmail?.email) return userByEmail.email;

    return emailCandidate;
  }

  if (objectIdCandidate) {
    const facultyById = await Faculty.findById(objectIdCandidate).select("email").lean();
    if (facultyById?.email) return facultyById.email;

    const userById = await User.findById(objectIdCandidate).select("email").lean();
    if (userById?.email) return userById.email;
  }

  return null;
};

const buildNotificationPayload = ({ request, moduleName, action, actorName, reason = "" }) => {
  const moduleLabel = MODULE_LABELS[moduleName] || "Request";
  const requestNo = request?.requestNo || "Unknown";
  const actorDisplayName = getActorDisplayName(request, actorName);
  const actionText = String(action || "updated").replace(/-/g, " ");
  const departmentText = getRequestDepartment(request) ? ` for ${getRequestDepartment(request)}` : "";
  const reasonText = reason ? `<p><strong>Reason:</strong> ${String(reason).replace(/</g, "&lt;")}</p>` : "";

  const templateMap = {
    submitted: eventCreationTemplate,
    "hod-approved": hodApprovalTemplate,
    "hod-rejected": eventRejectionTemplate,
    "super-admin-approved": adminApprovalTemplate,
    "super-admin-rejected": eventRejectionTemplate,
    "module-head-acknowledged": eventCreationTemplate,
    "module-head-completed": hodApprovalTemplate,
    "module-head-rejected": eventRejectionTemplate,
    closed: hodApprovalTemplate,
  };

  const template = templateMap[action] || eventCreationTemplate;
  const html = template({
    eventName: `${moduleLabel} Request ${requestNo}`,
    organizerName: actorDisplayName,
    organizingDepartment: getRequestDepartment(request) || "N/A",
    eventDate: request?.date || new Date(),
    departmentHeads: [moduleLabel],
    reason: reason || "No additional reason provided.",
    requirementType: moduleLabel,
    eventId: requestNo,
  });

  return {
    subject: `[SECE Events] ${moduleLabel} Request ${requestNo} ${actionText}`,
    html: html.replace(/<p>Dear Team,<\/p>/, `<p>Dear Team,</p><p>${actorDisplayName} has ${actionText} the ${moduleLabel.toLowerCase()} request ${requestNo}${departmentText}.</p>`),
  };
};

const getRecipientsForModule = async (request, moduleName, action, roleHint = "") => {
  const emails = new Set();
  const moduleKey = String(moduleName || "").toLowerCase();
  const department = getRequestDepartment(request);
  const isSubmitAction = action === "submitted";

  const addEmail = (email) => {
    if (email) emails.add(email);
  };

  if (!isSubmitAction) {
    if (request?.employeeDetail?.email) addEmail(request.employeeDetail.email);
    if (request?.employee?.email) addEmail(request.employee.email);
    if (request?.employeeEmail) addEmail(request.employeeEmail);
    if (request?.email) addEmail(request.email);
    if (request?.createdByEmail) addEmail(request.createdByEmail);

    if (!emails.size) {
      const resolvedEmail = await resolveEmployeeEmail(request);
      addEmail(resolvedEmail);
    }
  }

  if (isSubmitAction && department) {
    const hod = await Faculty.findOne({
      department,
      designation: { $regex: "HOD|Head", $options: "i" },
    }).select("email").lean();

    if (hod?.email) addEmail(hod.email);

    const hodUser = await User.findOne({
      department,
      role: { $regex: "hod|head", $options: "i" },
    }).select("email").lean();

    if (hodUser?.email) addEmail(hodUser.email);
  }

  if (["module-head-acknowledged", "module-head-completed", "module-head-rejected"].includes(action)) {
    const moduleHeadRole = {
      food: "food head",
      purchase: "purchase head",
      transport: "transport head",
      media: "media head",
    }[moduleKey];

    if (moduleHeadRole) {
      const moduleHeadUser = await User.findOne({ role: moduleHeadRole }).select("email").lean();
      if (moduleHeadUser?.email) addEmail(moduleHeadUser.email);
    }
  }

  if (isSubmitAction) {
    if (roleHint === "super-admin1" || roleHint === "super-admin") {
      const superAdmin1 = await User.findOne({ role: "super admin 1" }).select("email").lean();
      if (superAdmin1?.email) addEmail(superAdmin1.email);
    }

    if (roleHint === "super-admin2" || roleHint === "super-admin") {
      const superAdmin2 = await User.findOne({ role: "super admin 2" }).select("email").lean();
      if (superAdmin2?.email) addEmail(superAdmin2.email);
    }
  }

  if (!emails.size && process.env.TEST_EMAIL) {
    addEmail(process.env.TEST_EMAIL);
  }

  return Array.from(emails);
};

const notifyIndividualRequest = async ({ request, moduleName, action, actorName, reason = "", roleHint = "" }) => {
  try {
    const payload = buildNotificationPayload({ request, moduleName, action, actorName, reason });
    const recipients = await getRecipientsForModule(request, moduleName, action, roleHint);

    if (!recipients.length) {
      console.log(`[individual-notify] ${moduleName.toUpperCase()} request trigger: no recipients found for action=${action}`);
      return;
    }

    console.log(`[individual-notify] ${moduleName.toUpperCase()} request trigger: sending mail for action=${action}`);
    console.log(`[individual-notify] Recipients for ${moduleName}: ${recipients.join(", ")}`);

    for (const recipient of recipients) {
      try {
        await sendMail(recipient, payload.subject, payload.html);
        console.log(`[individual-notify] ${moduleName.toUpperCase()} request mail sent to ${recipient}`);
      } catch (error) {
        console.error(`[individual-notify] ${moduleName.toUpperCase()} request mail failed for ${recipient}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in notifyIndividualRequest:", error);
  }
};

module.exports = {
  buildNotificationPayload,
  notifyIndividualRequest,
};
