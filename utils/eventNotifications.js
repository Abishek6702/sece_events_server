const sendMail = require("./sendMail");
const Faculty = require("../models/Faculty");
const User = require("../models/User");

// Department head roles mapping
const DEPARTMENT_HEAD_ROLES = {
  venue: "Venue Coordinator",
  audio: "Audio Coordinator",
  icts: "ICTS Coordinator",
  transport: "Transport Coordinator",
  food: "Food Coordinator",
  accommodation: "Accommodation Coordinator",
  purchase: "Purchase Coordinator",
  media: "Media Coordinator",
};

/**
 * Get Super Admin email
 */
const getSuperAdminEmail = async () => {
  try {
    const superAdmin = await User.findOne({ isadmin: true }).select("email");
    return superAdmin?.email || process.env.SUPER_ADMIN_EMAIL;
  } catch (error) {
    console.error("Error fetching super admin:", error);
    return process.env.SUPER_ADMIN_EMAIL;
  }
};

/**
 * Get HOD email for a specific department
 */
const getHODEmail = async (department) => {
  try {
    // Look for faculty with HOD designation in the department
    const hod = await Faculty.findOne({
      department,
      designation: { $regex: "HOD|Head", $options: "i" },
    }).select("email");

    if (hod) {
      return hod.email;
    }

    // Fallback: look for user with HOD role
    const hodUser = await User.findOne({
      department,
      role: { $regex: "hod|head", $options: "i" },
    }).select("email");

    return hodUser?.email || null;
  } catch (error) {
    console.error("Error fetching HOD:", error);
    return null;
  }
};

/**
 * Get all organizers' emails from event
 */
const getOrganizersEmails = (event) => {
  const emails = [];
  try {
    if (event.requestDetails?.organizerDetails?.organizers) {
      event.requestDetails.organizerDetails.organizers.forEach((org) => {
        if (org.email) {
          emails.push(org.email);
        }
      });
    }
  } catch (error) {
    console.error("Error extracting organizers emails:", error);
  }
  return emails;
};

/**
 * Get department head email for specific requirement type
 */
const getDepartmentHeadEmail = async (requirementType) => {
  try {
    const role = DEPARTMENT_HEAD_ROLES[requirementType?.toLowerCase()];
    if (!role) return null;

    const coordinator = await User.findOne({
      role: { $regex: role, $options: "i" },
    }).select("email");

    if (coordinator) {
      return coordinator.email;
    }

    // Fallback: look in Faculty model
    const coordinatorFaculty = await Faculty.findOne({
      designation: { $regex: role, $options: "i" },
    }).select("email");

    return coordinatorFaculty?.email || null;
  } catch (error) {
    console.error("Error fetching department head:", error);
    return null;
  }
};

/**
 * Get all department head emails from event requirements
 */
const getAllDepartmentHeadEmails = async (event) => {
  const emails = [];
  try {
    const requirements = event.requestDetails?.requirementDetails || {};

    const departmentTypes = [
      "venue",
      "audio",
      "icts",
      "transport",
      "accommodationRequired",
      "mediaRequired",
      "food",
      "purchase",
    ];

    for (const deptType of departmentTypes) {
      const key = deptType === "accommodationRequired" ? "accommodation" :
                  deptType === "mediaRequired" ? "media" :
                  deptType === "transportRequired" ? "transport" :
                  deptType === "ictsRequired" ? "icts" :
                  deptType === "audioRequired" ? "audio" :
                  deptType;

      const isRequired = requirements[`${key}Required`] === true ||
                       requirements[`${key}Required`] === "true" ||
                       requirements[key] === true;

      if (isRequired) {
        const email = await getDepartmentHeadEmail(key);
        if (email) {
          emails.push({ type: key, email });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching department head emails:", error);
  }

  return emails;
};

/**
 * Send notification for event creation
 * To: All organizers, HOD, Super Admin
 */
const notifyEventCreation = async (event) => {
  try {
    const eventCreationTemplate = require("./mailTemplates/eventCreation");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizerName = event.requestDetails?.organizerDetails?.organizers?.[0]?.name || "Organizer";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    const eventDate = event.requestDetails?.eventDetails?.eventSchedule?.[0]?.eventDate || new Date();

    const htmlContent = eventCreationTemplate({
      eventName,
      organizerName,
      organizingDepartment,
      eventDate,
    });

    // Get all recipient emails
    const organizersEmails = getOrganizersEmails(event);
    const hodEmail = await getHODEmail(organizingDepartment);
    const superAdminEmail = await getSuperAdminEmail();

    const recipients = [...new Set([...organizersEmails, hodEmail, superAdminEmail].filter(Boolean))];

    // Send to all recipients
    for (const email of recipients) {
      try {
        await sendMail(
          email,
          `[SECE Events] Event Created: ${eventName}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending event creation email to ${email}:`, error);
      }
    }

    console.log(`✓ Event creation notification sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error("Error in notifyEventCreation:", error);
  }
};

/**
 * Send notification for HOD approval
 * To: All organizers ONLY
 */
const notifyHODApproval = async (event) => {
  try {
    const hodApprovalTemplate = require("./mailTemplates/hodApproval");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    const eventDate = event.requestDetails?.eventDetails?.eventSchedule?.[0]?.eventDate || new Date();

    const htmlContent = hodApprovalTemplate({
      eventName,
      organizingDepartment,
      eventDate,
    });

    const organizersEmails = getOrganizersEmails(event);

    for (const email of organizersEmails) {
      try {
        await sendMail(
          email,
          `[SECE Events] HOD Approved: ${eventName}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending HOD approval email to ${email}:`, error);
      }
    }

    console.log(`✓ HOD approval notification sent to ${organizersEmails.length} organizers`);
  } catch (error) {
    console.error("Error in notifyHODApproval:", error);
  }
};

/**
 * Send notification for Admin approval
 * To: All organizers, Super Admin, and all department heads
 */
const notifyAdminApproval = async (event) => {
  try {
    const adminApprovalTemplate = require("./mailTemplates/adminApproval");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    const eventDate = event.requestDetails?.eventDetails?.eventSchedule?.[0]?.eventDate || new Date();

    const departmentHeadsList = await getAllDepartmentHeadEmails(event);
    const departmentTypes = departmentHeadsList.map(d => d.type.toUpperCase());

    const htmlContent = adminApprovalTemplate({
      eventName,
      organizingDepartment,
      eventDate,
      departmentHeads: departmentTypes,
    });

    const organizersEmails = getOrganizersEmails(event);
    const superAdminEmail = await getSuperAdminEmail();
    const departmentHeadEmails = departmentHeadsList.map(d => d.email);

    const recipients = [...new Set([...organizersEmails, superAdminEmail, ...departmentHeadEmails].filter(Boolean))];

    for (const email of recipients) {
      try {
        await sendMail(
          email,
          `[SECE Events] Admin Approved: ${eventName}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending admin approval email to ${email}:`, error);
      }
    }

    console.log(`✓ Admin approval notification sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error("Error in notifyAdminApproval:", error);
  }
};

/**
 * Send notification to department heads
 */
const notifyDepartmentHeads = async (event) => {
  try {
    const departmentHeadTemplate = require("./mailTemplates/departmentHeadNotification");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    const eventDate = event.requestDetails?.eventDetails?.eventSchedule?.[0]?.eventDate || new Date();
    const eventId = event._id;

    const departmentHeadsList = await getAllDepartmentHeadEmails(event);

    for (const { type, email } of departmentHeadsList) {
      try {
        const htmlContent = departmentHeadTemplate({
          eventName,
          organizingDepartment,
          eventDate,
          requirementType: type.toUpperCase(),
          eventId,
        });

        await sendMail(
          email,
          `[SECE Events] Action Required: ${eventName} - ${type.toUpperCase()}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending department head email for ${type} to ${email}:`, error);
      }
    }

    console.log(`✓ Department head notifications sent to ${departmentHeadsList.length} departments`);
  } catch (error) {
    console.error("Error in notifyDepartmentHeads:", error);
  }
};

/**
 * Send notification for event rejection
 * To: All organizers ONLY (Super admin does the rejecting)
 */
const notifyEventRejection = async (event, reason = "") => {
  try {
    const eventRejectionTemplate = require("./mailTemplates/eventRejection");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizerName = event.requestDetails?.organizerDetails?.organizers?.[0]?.name || "Organizer";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";

    const htmlContent = eventRejectionTemplate({
      eventName,
      organizerName,
      organizingDepartment,
      reason,
    });

    const organizersEmails = getOrganizersEmails(event);

    for (const email of organizersEmails) {
      try {
        await sendMail(
          email,
          `[SECE Events] Event Rejected: ${eventName}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending rejection email to ${email}:`, error);
      }
    }

    console.log(`✓ Event rejection notification sent to ${organizersEmails.length} organizers`);
  } catch (error) {
    console.error("Error in notifyEventRejection:", error);
  }
};

/**
 * Send notification for event closure
 * To: All organizers, HOD, Super Admin, Department Heads
 */
const notifyEventClosure = async (event, closureReason = "") => {
  try {
    const eventClosedTemplate = require("./mailTemplates/eventClosed");

    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    const eventDate = event.requestDetails?.eventDetails?.eventSchedule?.[0]?.eventDate || new Date();

    const htmlContent = eventClosedTemplate({
      eventName,
      organizingDepartment,
      eventDate,
      closureReason,
    });

    const organizersEmails = getOrganizersEmails(event);
    const hodEmail = await getHODEmail(organizingDepartment);
    const superAdminEmail = await getSuperAdminEmail();
    const departmentHeadsList = await getAllDepartmentHeadEmails(event);
    const departmentHeadEmails = departmentHeadsList.map(d => d.email);

    const recipients = [...new Set([...organizersEmails, hodEmail, superAdminEmail, ...departmentHeadEmails].filter(Boolean))];

    for (const email of recipients) {
      try {
        await sendMail(
          email,
          `[SECE Events] Event Closed: ${eventName}`,
          htmlContent
        );
      } catch (error) {
        console.error(`Error sending event closure email to ${email}:`, error);
      }
    }

    console.log(`✓ Event closure notification sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error("Error in notifyEventClosure:", error);
  }
};

module.exports = {
  notifyEventCreation,
  notifyHODApproval,
  notifyAdminApproval,
  notifyDepartmentHeads,
  notifyEventRejection,
  notifyEventClosure,
  getSuperAdminEmail,
  getHODEmail,
  getDepartmentHeadEmail,
  getOrganizersEmails,
  getAllDepartmentHeadEmails,
};
