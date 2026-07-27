const mongoose = require("mongoose");
const Event = require("../models/Event.js");
const {
  notifyEventCreation,
  notifyHODApproval,
  notifyAdminApproval,
  notifyDepartmentHeads,
  notifyEventRejection,
  notifyEventClosure,
} = require("../utils/eventNotifications.js");
const { restoreTransportInventory } = require("../utils/transport.js");
require("dotenv").config();
const { allocateDefaultMediaStaff } = require("../utils/mediaStaffAllocation");
const {
  handleTransportSubmission,
} = require("../utils/transportSubmissionHandler.js");

const assignIQACNumber = require("../utils/assignIQACNumber");

const deepParse = (data) => {
  if (typeof data === "string") {
    try {
      return deepParse(JSON.parse(data));
    } catch {
      return data;
    }
  }

  if (Array.isArray(data)) {
    return data.map(deepParse);
  }

  if (typeof data === "object" && data !== null) {
    const result = {};
    for (const key in data) {
      result[key] = deepParse(data[key]);
    }
    return result;
  }

  return data;
};
const fixArrays = (data) => {
  if (!data) return data;

  // transport
  if (data.transportDetails?.transports) {
    data.transportDetails.transports.forEach((t) => {
      if (typeof t.vehicles === "string") {
        t.vehicles = JSON.parse(t.vehicles);
      }
    });
  }

  // refreshment
  if (data.refreshmentDetails?.refreshments) {
    data.refreshmentDetails.refreshments.forEach((r) => {
      if (typeof r.foodTypes === "string") {
        r.foodTypes = JSON.parse(r.foodTypes);
      }
    });
  }

  // accommodation
  if (data.accommodationDetails?.accommodations) {
    data.accommodationDetails.accommodations.forEach((a) => {
      if (typeof a.roomOccupancy === "string") {
        a.roomOccupancy = JSON.parse(a.roomOccupancy);
      }
      if (typeof a.roomCategory === "string") {
        a.roomCategory = JSON.parse(a.roomCategory);
      }
      if (typeof a.dineInCounts === "string") {
        a.dineInCounts = JSON.parse(a.dineInCounts);
      }
    });
  }

  // purchase
  if (data.purchaseDetails?.purchases) {
    data.purchaseDetails.purchases.forEach((p) => {
      if (typeof p.requirementNeeded === "string") {
        p.requirementNeeded = JSON.parse(p.requirementNeeded);
      }

      // Parse giftItems if sent as strings
      ["students", "guests"].forEach((category) => {
        if (p[category]?.giftItems) {
          if (typeof p[category].giftItems === "string") {
            p[category].giftItems = JSON.parse(p[category].giftItems);
          }

          if (Array.isArray(p[category].giftItems)) {
            p[category].giftItems.forEach((item) => {
              if (typeof item.trophy === "string") {
                item.trophy = JSON.parse(item.trophy);
              }
              if (typeof item.voucher === "string") {
                item.voucher = JSON.parse(item.voucher);
              }
            });
          }
        }
      });
    });
  }

  // media
  if (data.mediaRequirementDetails?.mediaRequirements) {
    data.mediaRequirementDetails.mediaRequirements.forEach((m) => {
      if (typeof m.poster?.sizes === "string") {
        m.poster.sizes = JSON.parse(m.poster.sizes);
      }
    });
  }

  return data;
};

const VALID_STATUSES = new Set([
  "Draft",
  "Submitted",
  "HodApproved",
  "AdminApproved",
  "DepartmentReview",
  "FinalApproved",
  "Closed",
  "Rejected",
]);

const normalizeStatus = (payload) => {
  if (payload.status && VALID_STATUSES.has(payload.status)) {
    return payload.status;
  }

  if (payload.isSubmitted === true) {
    return "Submitted";
  }

  return undefined;
};

const normalizeFileReference = (file) => {
  if (!file) return null;

  return {
    url: file.path || file.secure_url || file.url || "",
    publicId: file.filename || file.public_id || file.publicId || "",
  };
};

const ensureObject = (value) => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
};

const ensureArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const mergeObjects = (target, source) => {
  const result = { ...ensureObject(target) };

  Object.keys(source || {}).forEach((key) => {
    const sourceValue = source[key];
    if (
      Array.isArray(sourceValue) ||
      sourceValue === null ||
      typeof sourceValue !== "object"
    ) {
      result[key] = sourceValue;
    } else {
      result[key] = mergeObjects(result[key], sourceValue);
    }
  });

  return result;
};

const ensureMediaRequirement = (mediaRequirementDetails) => {
  const details = ensureObject(mediaRequirementDetails);
  details.mediaRequirements = ensureArray(details.mediaRequirements);

  if (details.mediaRequirements.length === 0) {
    details.mediaRequirements.push({ poster: {}, video: {} });
  }

  const firstItem = ensureObject(details.mediaRequirements[0]);
  firstItem.poster = ensureObject(firstItem.poster);
  firstItem.video = ensureObject(firstItem.video);
  details.mediaRequirements[0] = firstItem;

  return details;
};

const applyUploadedFiles = (event, files) => {
  event.requestDetails = ensureObject(event.requestDetails);
  event.requestDetails.organizerDetails = ensureObject(
    event.requestDetails.organizerDetails,
  );
  if (files.principalApprovalDocument && files.principalApprovalDocument[0]) {
    event.requestDetails.organizerDetails.principalApprovalDocument =
      normalizeFileReference(files.principalApprovalDocument[0]);
  }
  if (files.previousEventDocumentation && files.previousEventDocumentation[0]) {
    event.requestDetails.organizerDetails.previousEventDocumentationDetails =
      normalizeFileReference(files.previousEventDocumentation[0]);
  }

  event.mediaRequirementDetails = ensureMediaRequirement(
    event.mediaRequirementDetails,
  );
  const mediaDetails = ensureObject(
    event.mediaRequirementDetails.mediaRequirements[0],
  );
  mediaDetails.poster = ensureObject(mediaDetails.poster);
  mediaDetails.video = ensureObject(mediaDetails.video);

  if (files.referencePosterFiles && files.referencePosterFiles.length > 0) {
    mediaDetails.poster.referencePosterFiles = ensureArray(
      mediaDetails.poster.referencePosterFiles,
    ).concat(
      files.referencePosterFiles.map(normalizeFileReference).filter(Boolean),
    );
  }

  if (
    files.referenceCertificateFiles &&
    files.referenceCertificateFiles.length > 0
  ) {
    mediaDetails.poster.referenceCertificateFiles = ensureArray(
      mediaDetails.poster.referenceCertificateFiles,
    ).concat(
      files.referenceCertificateFiles
        .map(normalizeFileReference)
        .filter(Boolean),
    );
  }

  if (files.referenceFiles && files.referenceFiles.length > 0) {
    mediaDetails.video.referenceFiles = ensureArray(
      mediaDetails.video.referenceFiles,
    ).concat(files.referenceFiles.map(normalizeFileReference).filter(Boolean));
  }

  event.mediaRequirementDetails.mediaRequirements[0] = mediaDetails;
};

const initializeDepartmentStatus = (details) => {
  if (!details.status) {
    details.status = {
      status: "Pending for Acknowledge",
      remarks: "",
      adminEditRemark: "",
      adminEditedAt: null,
    };
  }

  return details;
};

function resetDepartment(event, module, adminRemark) {
  const now = new Date();

  const moduleMap = {
    venue: "venueDetails",
    icts: "ictsDetails",
    audio: "audioDetails",
    transport: "transportDetails",
    refreshment: "refreshmentDetails",
    accommodation: "accommodationDetails",
    purchase: "purchaseDetails",
  };

  if (module === "media") {
    event.mediaRequirementDetails.mediaRequirements.forEach((media) => {
      if (media.poster) {
        media.poster.status = "Pending for Acknowledge";
        media.poster.remarks = ""; // NEW
        media.poster.adminEditRemark = adminRemark;
        media.poster.adminEditedAt = now;
      }

      if (media.video) {
        media.video.status = "Pending for Acknowledge";
        media.video.remarks = ""; // NEW
        media.video.adminEditRemark = adminRemark;
        media.video.adminEditedAt = now;
      }
    });

    event.timeline.departments.poster = {
      acknowledgedAt: null,
      completedAt: null,
    };

    event.timeline.departments.video = {
      acknowledgedAt: null,
      completedAt: null,
    };

    return;
  }

  const path = moduleMap[module];

  if (!event[path]) return;

  if (!event[path].status) {
    event[path].status = {};
  }

  event[path].status.status = "Pending for Acknowledge";
  event[path].status.remarks = "";
  event[path].status.adminEditRemark = adminRemark;
  event[path].status.adminEditedAt = now;

  event.timeline.departments[module] = {
    acknowledgedAt: null,
    completedAt: null,
  };
}

exports.createEvent = async (req, res) => {
  // console.log("BODY:", req.body);
  try {
    const payload = {};

    Object.keys(req.body).forEach((key) => {
      payload[key] = deepParse(req.body[key]);
    });

    const eventData = fixArrays({
      ...payload,
      requestDetails: ensureObject(payload.requestDetails),
      mediaRequirementDetails: ensureMediaRequirement(
        payload.mediaRequirementDetails,
      ),
    });
    if (!eventData.timeline) {
      eventData.timeline = {
        departments: {},
      };
    }
    const normalizedStatus = normalizeStatus(payload);
    if (normalizedStatus) {
      eventData.status = normalizedStatus;
      if (normalizedStatus === "Submitted") {
        eventData.isSubmitted = true;
      }
    }

    eventData.requestDetails.organizerDetails = ensureObject(
      eventData.requestDetails.organizerDetails,
    );

    const files = req.files || {};
    if (files.principalApprovalDocument && files.principalApprovalDocument[0]) {
      eventData.requestDetails.organizerDetails.principalApprovalDocument =
        normalizeFileReference(files.principalApprovalDocument[0]);
    }

    if (
      files.previousEventDocumentation &&
      files.previousEventDocumentation[0]
    ) {
      eventData.requestDetails.organizerDetails.previousEventDocumentationDetails =
        normalizeFileReference(files.previousEventDocumentation[0]);
    }

    const mediaDetails = eventData.mediaRequirementDetails.mediaRequirements[0];

    if (files.referencePosterFiles && files.referencePosterFiles.length > 0) {
      mediaDetails.poster.referencePosterFiles = files.referencePosterFiles
        .map(normalizeFileReference)
        .filter(Boolean);
    }

    if (
      files.referenceCertificateFiles &&
      files.referenceCertificateFiles.length > 0
    ) {
      mediaDetails.poster.referenceCertificateFiles =
        files.referenceCertificateFiles
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    if (files.referenceFiles && files.referenceFiles.length > 0) {
      mediaDetails.video.referenceFiles = files.referenceFiles
        .map(normalizeFileReference)
        .filter(Boolean);
    }

    eventData.mediaRequirementDetails.mediaRequirements[0] = mediaDetails;

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // =====================================
      // TRANSPORT INVENTORY DEDUCTION
      // =====================================

      if (eventData.status === "Submitted") {
        eventData.timeline.submittedAt = new Date();

        // Generate IQAC Number
        await assignIQACNumber(eventData, session);

        // Deduct Transport Inventory
        await handleTransportSubmission(eventData, session);
      }

      const createdEvents = await Event.create([eventData], { session });

      const event = createdEvents[0];

      await session.commitTransaction();

      // 📧 Send notification
      if (normalizedStatus === "Submitted") {
        await notifyEventCreation(event);
      }

      return res.status(201).json({
        message: "Event created successfully",
        data: event,
      });
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Error creating event:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const payload = {};

    Object.keys(req.body).forEach((key) => {
      payload[key] = deepParse(req.body[key]);
    });
    const changedModules = {
      venue: !!payload.venueDetails,
      icts: !!payload.ictsDetails,
      audio: !!payload.audioDetails,
      transport: !!payload.transportDetails,
      refreshment: !!payload.refreshmentDetails,
      accommodation: !!payload.accommodationDetails,
      purchase: !!payload.purchaseDetails,
      media: !!payload.mediaRequirementDetails,
    };
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }
    const oldTransports =
      event.transportDetails?.transports?.map((transport) =>
        transport.toObject ? transport.toObject() : transport,
      ) || [];

    if (payload.organizerId) {
      event.organizerId = payload.organizerId;
    }

    if (payload.requestDetails) {
      event.requestDetails = mergeObjects(
        event.requestDetails || {},
        ensureObject(payload.requestDetails),
      );
    }

    if (payload.venueDetails) {
      event.venueDetails = mergeObjects(
        event.venueDetails || {},
        ensureObject(payload.venueDetails),
      );
      initializeDepartmentStatus(event.venueDetails);
    }

    if (payload.ictsDetails) {
      event.ictsDetails = mergeObjects(
        event.ictsDetails || {},
        ensureObject(payload.ictsDetails),
      );
      initializeDepartmentStatus(event.ictsDetails);
    }

    if (payload.audioDetails) {
      event.audioDetails = mergeObjects(
        event.audioDetails || {},
        ensureObject(payload.audioDetails),
      );
      initializeDepartmentStatus(event.audioDetails);
    }
    const transportChanged = !!payload.transportDetails;
    if (payload.transportDetails) {
      event.transportDetails = mergeObjects(
        event.transportDetails || {},
        ensureObject(payload.transportDetails),
      );
      initializeDepartmentStatus(event.transportDetails);
    }

    if (payload.refreshmentDetails) {
      event.refreshmentDetails = mergeObjects(
        event.refreshmentDetails || {},
        ensureObject(payload.refreshmentDetails),
      );

      initializeDepartmentStatus(event.refreshmentDetails);
    }

    if (payload.accommodationDetails) {
      event.accommodationDetails = mergeObjects(
        event.accommodationDetails || {},
        ensureObject(payload.accommodationDetails),
      );

      initializeDepartmentStatus(event.accommodationDetails);
    }

    if (payload.purchaseDetails) {
      event.purchaseDetails = mergeObjects(
        event.purchaseDetails || {},
        ensureObject(payload.purchaseDetails),
      );
      initializeDepartmentStatus(event.purchaseDetails);
    }

    if (payload.mediaRequirementDetails) {
      event.mediaRequirementDetails = mergeObjects(
        ensureMediaRequirement(event.mediaRequirementDetails),
        ensureMediaRequirement(payload.mediaRequirementDetails),
      );
    }

    const wasSubmitted = event.isSubmitted;

    const normalizedStatus = normalizeStatus(payload);

    if (normalizedStatus) {
      event.status = normalizedStatus;
      event.isSubmitted = normalizedStatus === "Submitted";
    } else if (payload.hasOwnProperty("isSubmitted")) {
      event.isSubmitted = payload.isSubmitted;
    }

    applyUploadedFiles(event, req.files || {});

    // =====================================
    // TRANSPORT INVENTORY DEDUCTION
    // =====================================

    const becomingSubmitted =
      !wasSubmitted &&
      (normalizedStatus === "Submitted" || payload.isSubmitted === true);

    if (!event.timeline) {
      event.timeline = {
        departments: {},
      };
    }
    // =====================================
    // FIRST TIME SUBMISSION
    // =====================================
    if (becomingSubmitted) {
      event.timeline.submittedAt = new Date();

      // Generate IQAC Number
      await assignIQACNumber(event);

      await handleTransportSubmission(event);
    }

    // =====================================
    // TRANSPORT UPDATED AFTER SUBMISSION
    // =====================================
    else if (
      wasSubmitted &&
      event.isSubmitted &&
      transportChanged &&
      !event.transportInventoryRestored
    ) {
      // RESTORE OLD VEHICLES

      for (const transport of oldTransports) {
        await restoreTransportInventory(transport.vehicles);
      }

      // DEDUCT NEW VEHICLES

      await handleTransportSubmission(event);
    }
    if (event.adminApproval) {
      Object.entries(changedModules).forEach(([module, changed]) => {
        if (changed) {
          resetDepartment(event, module, payload.adminEditRemark || "");
        }
      });
    }
    event.timeline.updatedAt = new Date();

    const updatedEvent = await event.save();
    res
      .status(200)
      .json({ message: "Event updated successfully", data: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.submitEvent = async (req, res) => {
  try {
    const payload = {};
    Object.keys(req.body).forEach((key) => {
      payload[key] = deepParse(req.body[key]);
    });

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (payload.requestDetails) {
      event.requestDetails = mergeObjects(
        event.requestDetails || {},
        ensureObject(payload.requestDetails),
      );
    }
    if (payload.venueDetails) {
      event.venueDetails = mergeObjects(
        event.venueDetails || {},
        ensureObject(payload.venueDetails),
      );
      initializeDepartmentStatus(event.venueDetails);
    }

    if (payload.ictsDetails) {
      event.ictsDetails = mergeObjects(
        event.ictsDetails || {},
        ensureObject(payload.ictsDetails),
      );
      initializeDepartmentStatus(event.ictsDetails);
    }

    if (payload.audioDetails) {
      event.audioDetails = mergeObjects(
        event.audioDetails || {},
        ensureObject(payload.audioDetails),
      );
      initializeDepartmentStatus(event.audioDetails);
    }

    if (payload.transportDetails) {
      event.transportDetails = mergeObjects(
        event.transportDetails || {},
        ensureObject(payload.transportDetails),
      );
      initializeDepartmentStatus(event.transportDetails);
    }

    if (payload.refreshmentDetails) {
      event.refreshmentDetails = mergeObjects(
        event.refreshmentDetails || {},
        ensureObject(payload.refreshmentDetails),
      );
      initializeDepartmentStatus(event.refreshmentDetails);
    }

    if (payload.accommodationDetails) {
      event.accommodationDetails = mergeObjects(
        event.accommodationDetails || {},
        ensureObject(payload.accommodationDetails),
      );
      initializeDepartmentStatus(event.accommodationDetails);
    }

    if (payload.purchaseDetails) {
      event.purchaseDetails = mergeObjects(
        event.purchaseDetails || {},
        ensureObject(payload.purchaseDetails),
      );
      initializeDepartmentStatus(event.purchaseDetails);
    }

    if (payload.mediaRequirementDetails) {
      event.mediaRequirementDetails = mergeObjects(
        ensureMediaRequirement(event.mediaRequirementDetails),
        ensureMediaRequirement(payload.mediaRequirementDetails),
      );
    }

    const wasSubmitted = event.isSubmitted;

    const normalizedStatus = normalizeStatus({
      ...payload,
      isSubmitted: true,
    });

    event.status = normalizedStatus || "Submitted";
    event.isSubmitted = true;

    if (!wasSubmitted) {
      await assignIQACNumber(event);
    }

    if (!event.timeline) {
      event.timeline = {
        departments: {},
      };
    }
    event.timeline.submittedAt = new Date();

    applyUploadedFiles(event, req.files || {});

    // =====================================
    // TRANSPORT INVENTORY DEDUCTION
    // =====================================

    if (!wasSubmitted) {
      await handleTransportSubmission(event);
    }

    const updatedEvent = await event.save();
    res
      .status(200)
      .json({ message: "Event submitted successfully", data: updatedEvent });
  } catch (error) {
    console.error("Error submitting event:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res
      .status(200)
      .json({ message: "Events fetched successfully", data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { module } = req.query;

    let projection = {};

    // ✅ Module based projection
    if (module) {
      projection = {
        requestDetails: 1,
        status: 1,
        iqacNumber: 1,
      };

      switch (module) {
        case "venue":
          projection["venueDetails"] = 1;
          break;

        case "icts":
          projection["ictsDetails"] = 1;
          break;

        case "audio":
          projection["audioDetails"] = 1;
          break;

        case "transport":
          projection["transportDetails"] = 1;
          break;

        case "refreshment":
          projection["refreshmentDetails"] = 1;
          break;

        case "accommodation":
          projection["accommodationDetails"] = 1;
          break;

        case "purchase":
          projection["purchaseDetails"] = 1;
          break;

        case "media":
          projection["mediaRequirementDetails"] = 1;
          break;
      }
    }

    const event = module
      ? await Event.findById(id).select(projection)
      : await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.status(200).json({
      message: "Event fetched successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error fetching event:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const deleted = await Event.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getFilteredEvents = async (req, res) => {
  try {
    const { department, eventType, module, status } = req.query;

    // 🔹 FILTER
    let filter = {};

    if (department) {
      filter["requestDetails.organizerDetails.organizingDepartment"] =
        department;
    }

    if (eventType) {
      filter["requestDetails.eventDetails.eventType"] = eventType;
    }

    if (status) {
      filter["status"] = status;
    }

    let events;

    // ✅ If module is provided → use projection
    if (module) {
      let projection = {
        requestDetails: 1,
        status: 1,
      };

      switch (module) {
        case "venue":
          projection["venueDetails"] = 1;
          break;
        case "icts":
          projection["ictsDetails"] = 1;
          break;
        case "audio":
          projection["audioDetails"] = 1;
          break;
        case "transport":
          projection["transportDetails"] = 1;
          break;
        case "refreshment":
          projection["refreshmentDetails"] = 1;
          break;
        case "accommodation":
          projection["accommodationDetails"] = 1;
          break;
        case "purchase":
          projection["purchaseDetails"] = 1;
          break;
        case "media":
          projection["mediaRequirementDetails"] = 1;
          break;
      }

      events = await Event.find(filter).select(projection);
    } else {
      // ✅ No module → return full document
      events = await Event.find(filter);
    }

    res.status(200).json({
      message: "Events fetched successfully",
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, module, mediaType, remarks, reason } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const moduleMap = {
      venue: "venueDetails",
      icts: "ictsDetails",
      audio: "audioDetails",
      transport: "transportDetails",
      refreshment: "refreshmentDetails",
      accommodation: "accommodationDetails",
      purchase: "purchaseDetails",
      media: "mediaRequirementDetails",
    };

    switch (action) {
      case "submit":
        event.isSubmitted = true;
        event.status = "Submitted";
        if (!event.timeline) {
          event.timeline = {
            departments: {},
          };
        }
        event.timeline.submittedAt = new Date();
        // 📧 Send notification for event creation/submission
        await notifyEventCreation(event);
        break;

      case "hodApprove":
        event.isHodApproved = true;
        event.status = "HodApproved";
        if (!event.timeline) {
          event.timeline = {
            departments: {},
          };
        }
        event.timeline.hodApprovedAt = new Date();
        // 📧 Send notification for HOD approval
        await notifyHODApproval(event);
        break;

      case "adminApprove":
        event.adminApproval = true;
        event.status = "Approved";
        if (!event.timeline) {
          event.timeline = {
            departments: {},
          };
        }
        event.timeline.adminApprovedAt = new Date();
        await allocateDefaultMediaStaff(event);
        // 📧 Send notification for admin approval and to department heads
        await notifyAdminApproval(event);
        await notifyDepartmentHeads(event);
        break;

      case "reject":
        event.status = "Rejected";
        if (
          event.isSubmitted &&
          !event.transportInventoryRestored &&
          event.transportDetails?.transports?.length
        ) {
          for (const transport of event.transportDetails.transports) {
            await restoreTransportInventory(transport.vehicles);
          }

          event.transportInventoryRestored = true;
        }
        if (!event.timeline) {
          event.timeline = {
            departments: {},
          };
        }
        event.timeline.rejectedAt = new Date();
        // 📧 Send notification for rejection
        await notifyEventRejection(event, reason || "");
        break;

      case "close":
        event.status = "Closed";
        if (!event.timeline) {
          event.timeline = {
            departments: {},
          };
        }
        event.timeline.closedAt = new Date();
        if (
          event.isSubmitted &&
          !event.transportInventoryRestored &&
          event.transportDetails?.transports?.length
        ) {
          for (const transport of event.transportDetails.transports) {
            await restoreTransportInventory(transport.vehicles);
          }

          event.transportInventoryRestored = true;
        }
        // 📧 Send notification for event closure
        await notifyEventClosure(event, reason || "");
        break;

      case "acknowledge": {
        if (!module) {
          return res.status(400).json({
            message: "Module is required for acknowledgement",
          });
        }

        const path = moduleMap[module];

        if (!path) {
          return res.status(400).json({ message: "Invalid module" });
        }

        if (!event[path]) {
          event[path] = {};
        }
        if (!event.timeline) {
          event.timeline = {};
        }

        if (!event.timeline.departments) {
          event.timeline.departments = {};
        }

        if (module === "media") {
          if (!mediaType || !["poster", "video"].includes(mediaType)) {
            return res.status(400).json({
              message: "Valid mediaType is required for media module",
            });
          }

          event[path].mediaRequirements.forEach((media) => {
            if (!event.timeline.departments[mediaType]) {
              event.timeline.departments[mediaType] = {};
            }

            event.timeline.departments[mediaType].acknowledgedAt = new Date();
            media[mediaType].status = "Acknowledged";
            media[mediaType].remarks = remarks || "";
          });
        } else {
          if (!event[path].status) {
            event[path].status = {};
          }

          event[path].status.status = "Acknowledged";
          if (!event.timeline.departments[module]) {
            event.timeline.departments[module] = {};
          }

          event.timeline.departments[module].acknowledgedAt = new Date();
          event[path].status.remarks = remarks || "";
        }

        break;
      }
      case "adminCancel": {
        if (!module) {
          return res.status(400).json({
            message: "Module is required for admin cancellation",
          });
        }

        const path = moduleMap[module];

        if (!path) {
          return res.status(400).json({ message: "Invalid module" });
        }

        if (!event[path]) {
          event[path] = {};
        }

        if (module === "media") {
          if (!mediaType || !["poster", "video"].includes(mediaType)) {
            return res.status(400).json({
              message: "Valid mediaType is required for media module",
            });
          }

          event[path].mediaRequirements.forEach((media) => {
            media[mediaType].status = "Admin Cancelled";
          });
        } else {
          if (!event[path].status) {
            event[path].status = {};
          }

          event[path].status.status = "Admin Cancelled";
        }

        break;
      }
      case "complete": {
        if (!module) {
          return res.status(400).json({
            message: "Module is required for completion",
          });
        }

        const path = moduleMap[module];

        if (!path) {
          return res.status(400).json({ message: "Invalid module" });
        }

        if (!event[path]) {
          event[path] = {};
        }
        if (!event.timeline) {
          event.timeline = {};
        }

        if (!event.timeline.departments) {
          event.timeline.departments = {};
        }

        if (module === "media") {
          if (!mediaType || !["poster", "video"].includes(mediaType)) {
            return res.status(400).json({
              message: "Valid mediaType is required for media module",
            });
          }

          event[path].mediaRequirements.forEach((media) => {
            media[mediaType].status = "Completed";
            media[mediaType].remarks = remarks || "";
            if (!event.timeline.departments[mediaType]) {
              event.timeline.departments[mediaType] = {};
            }

            event.timeline.departments[mediaType].completedAt = new Date();
          });
        } else {
          if (!event[path].status) {
            event[path].status = {};
          }

          event[path].status.status = "Completed";
          if (!event.timeline.departments[module]) {
            event.timeline.departments[module] = {};
          }

          event.timeline.departments[module].completedAt = new Date();
          event[path].status.remarks = remarks || "";
        }

        break;
      }

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    await event.save();

    res.status(200).json({
      message: "Status updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRequirementDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).select(`
      requestDetails.requirementDetails
      requestDetails.organizerDetails.financeRequired
      venueDetails.status
      ictsDetails.status
      audioDetails.status
      transportDetails.status
      refreshmentDetails.status
      accommodationDetails.status
      purchaseDetails.status
      mediaRequirementDetails.mediaRequirements.poster
      mediaRequirementDetails.mediaRequirements.video
    `);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const requirementDetails = event.requestDetails?.requirementDetails || {};

    const financeRequired =
      event.requestDetails?.organizerDetails?.financeRequired || false;

    const media = event.mediaRequirementDetails?.mediaRequirements?.[0];

    const departments = {
      venue: {
        required: requirementDetails.venueRequired,
        status: event.venueDetails?.status || null,
      },

      icts: {
        required: requirementDetails.ictsRequired,
        status: event.ictsDetails?.status || null,
      },

      audio: {
        required: requirementDetails.audioRequired,
        status: event.audioDetails?.status || null,
      },

      transport: {
        required: requirementDetails.transportRequired,
        status: event.transportDetails?.status || null,
      },

      refreshment: {
        required: requirementDetails.transportRequired,
        status: event.refreshmentDetails?.status || null,
      },

      accommodation: {
        required: requirementDetails.accommodationRequired,
        status: event.accommodationDetails?.status || null,
      },

      purchase: {
        required: financeRequired,
        status: event.purchaseDetails?.status || null,
      },

      poster: {
        required: requirementDetails.mediaRequired,
        status: media?.poster
          ? {
              status: media.poster.status,
              remarks: media.poster.remarks,
              adminEditRemark: media.poster.adminEditRemark,
              adminEditedAt: media.poster.adminEditedAt,
            }
          : null,
      },

      video: {
        required: requirementDetails.mediaRequired,
        status: media?.video
          ? {
              status: media.video.status,
              remarks: media.video.remarks,
              adminEditRemark: media.video.adminEditRemark,
              adminEditedAt: media.video.adminEditedAt,
            }
          : null,
      },
    };

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Error fetching requirement details:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get draft event for a particular user
exports.getUserDraftEvents = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const draftEvents = await Event.find({
      organizerId,
      status: "Draft",
      isSubmitted: false,
    }).sort({ updatedAt: -1 });

    // no drafts found
    if (!draftEvents || draftEvents.length === 0) {
      return res.status(200).json({
        success: true,
        hasDrafts: false,
        totalDrafts: 0,
        message: "No draft events found",
        data: [],
      });
    }

    // drafts found
    return res.status(200).json({
      success: true,
      hasDrafts: true,
      totalDrafts: draftEvents.length,
      message: "Draft events fetched successfully",
      data: draftEvents,
    });
  } catch (error) {
    console.error("Get Draft Events Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.requestMediaStaffChange = async (req, res) => {
  try {
    const { id } = req.params;

    const { mediaType, requestedStaff, reason } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (!mediaType || !["poster", "video"].includes(mediaType)) {
      return res.status(400).json({
        message: "Valid mediaType is required",
      });
    }

    event.mediaRequirementDetails.mediaRequirements.forEach((media) => {
      media[mediaType].staffChangeRequest = {
        requested: true,

        requestedStaff,

        staffChangeStatus: "Pending",

        staffChangeReason: reason,

        rejectReason: "",

        approvedAt: null,
      };
    });

    await event.save();

    res.status(200).json({
      message: `${mediaType} staff change requested successfully`,
      data: event,
    });
  } catch (error) {
    console.error("Staff change request error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

exports.checkVenueAvailability = async (req, res) => {
  try {
    const { eventSchedule = [], venues = [] } = req.body;

    if (!Array.isArray(eventSchedule) || !eventSchedule.length) {
      return res.status(400).json({
        success: false,
        message: "Event schedule is required.",
      });
    }

    if (!Array.isArray(venues) || !venues.length) {
      return res.status(400).json({
        success: false,
        message: "Venue list is required.",
      });
    }

    const events = await Event.find({
      status: {
        $nin: ["Rejected", "Closed"],
      },
    }).select(
      "requestDetails.eventDetails.eventSchedule venueDetails.venues requestDetails.eventDetails.eventName status"
    );

    const availableVenues = [];
    const unavailableVenues = [];

    const timeToMinutes = (time) => {
      if (!time) return 0;

      const [hour, minute] = time.split(":").map(Number);

      return hour * 60 + minute;
    };

    const isOverlapping = (
      existingStart,
      existingEnd,
      requestedStart,
      requestedEnd
    ) => {
      const s1 = timeToMinutes(existingStart);
      const e1 = timeToMinutes(existingEnd);

      const s2 = timeToMinutes(requestedStart);
      const e2 = timeToMinutes(requestedEnd);

      return s1 < e2 && s2 < e1;
    };

    for (const venue of venues) {
      const schedule =
        eventSchedule.find(
          (item) => item.dayIndex === venue.dayIndex
        ) || eventSchedule[venue.dayIndex];

      if (!schedule) continue;

      let isBooked = false;

      for (const event of events) {
        const existingSchedules =
          event.requestDetails?.eventDetails?.eventSchedule || [];

        const existingVenues =
          event.venueDetails?.venues || [];

        if (!existingSchedules.length || !existingVenues.length) {
          continue;
        }

        const existingSchedule =
          existingSchedules[venue.dayIndex];

        if (!existingSchedule) {
          continue;
        }

        const existingVenue = existingVenues.find(
          (v) =>
            v.dayIndex === venue.dayIndex &&
            v.venueName?.trim().toLowerCase() ===
              venue.venueName?.trim().toLowerCase()
        );

        if (!existingVenue) {
          continue;
        }

        const requestDate = new Date(schedule.eventDate)
          .toISOString()
          .split("T")[0];

        const existingDate = new Date(existingSchedule.eventDate)
          .toISOString()
          .split("T")[0];

        if (requestDate !== existingDate) {
          continue;
        }

        const overlap = isOverlapping(
          existingSchedule.startTime,
          existingSchedule.endTime,
          schedule.startTime,
          schedule.endTime
        );

        if (overlap) {
          isBooked = true;

          unavailableVenues.push({
            venueName: venue.venueName,
            status: "Booked",
            eventName:
              event.requestDetails?.eventDetails?.eventName || "",
            eventId: event._id,
            date: requestDate,
            startTime: existingSchedule.startTime,
            endTime: existingSchedule.endTime,
          });

          break;
        }
      }

      if (!isBooked) {
        availableVenues.push({
          venueName: venue.venueName,
          status: "Available",
        });
      }
    }

    let status = "AVAILABLE";
    let message = "All selected venues are available.";

    if (
      unavailableVenues.length > 0 &&
      availableVenues.length > 0
    ) {
      status = "PARTIALLY_AVAILABLE";
      message = "Some selected venues are already booked.";
    } else if (
      unavailableVenues.length === venues.length
    ) {
      status = "NOT_AVAILABLE";
      message =
        "None of the selected venues are available.";
    }

    return res.status(200).json({
      success: true,
      status,
      message,
      allAvailable: unavailableVenues.length === 0,
      availableCount: availableVenues.length,
      unavailableCount: unavailableVenues.length,
      availableVenues,
      unavailableVenues,
    });
  } catch (error) {
    console.error("Venue Availability Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
