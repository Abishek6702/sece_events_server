const mongoose = require("mongoose");
const Event = require("../models/Event");
const Faculty = require("../models/Faculty");
const { buildMediaHeadStatsPayload } = require("../utils/mediaHeadStats");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMediaRequirementStats = (events, requirementKey) => {
  return events.reduce(
    (stats, event) => {
      for (const requirement of event[requirementKey] || []) {
        stats.total += 1;

        if (requirement.status === "Completed") {
          stats.completed += 1;
        } else if (requirement.status === "Acknowledged") {
          stats.acknowledged += 1;
          stats.approved += 1;
        } else {
          stats.pending += 1;
        }
      }
      return stats;
    },
    { total: 0, pending: 0, acknowledged: 0, approved: 0, completed: 0 },
  );
};

const getMediaDepartmentStats = (events, requirementKey) => {
  const counts = new Map();

  for (const event of events) {
    const department = event.organizingDepartment || "Unknown";
    const requestCount = (event[requirementKey] || []).length;
    counts.set(department, (counts.get(department) || 0) + requestCount);
  }

  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
};

const getMediaTypeStats = async (mediaType) => {
  const statusPath = `$mediaRequirementDetails.mediaRequirements.${mediaType}.status`;
  const [stats] = await Event.aggregate([
    { $match: { status: { $ne: "Draft" } } },
    { $unwind: "$mediaRequirementDetails.mediaRequirements" },
    { $match: { "mediaRequirementDetails.mediaRequirements.typeOfMedia": mediaType } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: [statusPath, "Acknowledged"] }, 1, 0] },
        },
        acknowledged: {
          $sum: { $cond: [{ $eq: [statusPath, "Acknowledged"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: [statusPath, "Completed"] }, 1, 0] },
        },
        pending: {
          $sum: {
            $cond: [
              { $in: [statusPath, ["Acknowledged", "Completed"]] },
              0,
              1,
            ],
          },
        },
      },
    },
  ]);

  return stats || {
    total: 0,
    approved: 0,
    acknowledged: 0,
    completed: 0,
    pending: 0,
  };
};

const getMediaDepartmentStatsDashboard = (mediaType) => async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    const events = await Event.find({
      status: { $ne: "Draft" },
      [`mediaRequirementDetails.mediaRequirements.${mediaType}.staff.email`]: new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    })
      .select(
        "requestDetails.organizerDetails.organizingDepartment mediaRequirementDetails.mediaRequirements",
      )
      .lean();

    const requirementKey = `${mediaType}Requirements`;
    const scopedEvents = events.map((event) => ({
      organizingDepartment:
        event.requestDetails?.organizerDetails?.organizingDepartment || "Unknown",
      [requirementKey]: (event.mediaRequirementDetails?.mediaRequirements || []).filter((requirement) =>
        (requirement[mediaType]?.staff || []).some(
          (staff) => String(staff.email || "").toLowerCase() === email.toLowerCase(),
        ),
      ),
    }));

    return res.status(200).json({
      success: true,
      email,
      departmentStats: getMediaDepartmentStats(scopedEvents, requirementKey),
    });
  } catch (error) {
    console.error(`${mediaType} department stats error:`, error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPosterDepartmentStats = getMediaDepartmentStatsDashboard("poster");
exports.getVideoDepartmentStats = getMediaDepartmentStatsDashboard("video");

exports.getDashboardStats = async (req, res) => {
  try {
    const requestedModule = String(req.query.module || "").trim().toLowerCase();
    const moduleAliases = {
      ict: "icts",
      food: "refreshment",
      refreshments: "refreshment",
      "poster-dashboard": "poster",
      "video-dashboard": "video",
    };
    const module = ["admin", "superadmin", "super-admin"].includes(requestedModule)
      ? ""
      : moduleAliases[requestedModule] || requestedModule;

    const filter = {
      status: { $ne: "Draft" },
    };

    const totalEvents = await Event.countDocuments(filter);

    const completedEvents = await Event.countDocuments({
      ...filter,
      status: "Closed",
    });

    const approvedEvents = await Event.countDocuments({
      ...filter,
      status: "Approved",
    });

    const pendingEvents = await Event.countDocuments({
      ...filter,
      status: {
        $in: ["Submitted", "HodApproved", "DepartmentReview"],
      },
    });

    const modules = {
      venue: "venueDetails",
      icts: "ictsDetails",
      audio: "audioDetails",
      transport: "transportDetails",
      refreshment: "refreshmentDetails",
      accommodation: "accommodationDetails",
      purchase: "purchaseDetails",
      media: "mediaRequirementDetails",
      poster: "poster",
      video: "video",
    };

    // Validate module
    if (module && !modules[module]) {
      return res.status(400).json({
        message: "Invalid module",
      });
    }

    const moduleStats = {};

    // If module is provided, calculate only that module
    const moduleKeys = module ? [module] : Object.keys(modules);

    for (const key of moduleKeys) {
      if (key === "poster" || key === "video") {
        moduleStats[key] = await getMediaTypeStats(key);
        continue;
      }

      const path = modules[key];

      const total = await Event.countDocuments({
        ...filter,
        [path]: { $exists: true },
      });

      const approved = await Event.countDocuments({
        ...filter,
        [`${path}.status.status`]: "Acknowledged",
      });

      const completed = await Event.countDocuments({
        ...filter,
        [`${path}.status.status`]: "Completed",
      });

      const pending = await Event.countDocuments({
        ...filter,
        $or: [
          {
            [`${path}.status.status`]: "Pending for Acknowledge",
          },
          {
            [`${path}.status`]: { $exists: false },
          },
        ],
      });

      moduleStats[key] = {
        total,
        approved,
        completed,
        pending,
      };
    }

    return res.status(200).json({
      events: {
        total: totalEvents,
        completed: completedEvents,
        approved: approvedEvents,
        pending: pendingEvents,
      },
      modules: moduleStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getDepartmentWiseStats = async (req, res) => {
  try {
    const { module } = req.query;

    const modules = {
      venue: "venueDetails",
      icts: "ictsDetails",
      audio: "audioDetails",
      transport: "transportDetails",
      refreshment: "refreshmentDetails",
      accommodation: "accommodationDetails",
      purchase: "purchaseDetails",
      media: "mediaRequirementDetails",
    };

    // validate module only if provided
    if (module && !modules[module]) {
      return res.status(400).json({
        message: "Invalid module",
      });
    }

    // if no module -> admin overall
    const path = module ? modules[module] : null;

    const matchCondition = path
      ? {
          status: { $ne: "Draft" },
          [path]: { $exists: true },
        }
      : {
          status: { $ne: "Draft" },
        };

    // TOTAL COUNT
    const totalCount = await Event.countDocuments(matchCondition);

    // all departments
    const departments = await Event.distinct(
      "requestDetails.organizerDetails.organizingDepartment",
    );

    // department wise counts
    const stats = await Event.aggregate([
      {
        $match: matchCondition,
      },

      {
        $group: {
          _id: "$requestDetails.organizerDetails.organizingDepartment",
          count: { $sum: 1 },
        },
      },
    ]);

    // convert array -> object
    const statsMap = {};

    stats.forEach((item) => {
      statsMap[item._id] = item.count;
    });

    // include all departments
    const departmentWise = departments.map((dept) => ({
      department: dept,
      count: statsMap[dept] || 0,
    }));

    return res.status(200).json({
      type: module || "admin",
      totalCount,
      departmentWise,
    });
  } catch (error) {
    console.error("Department stats error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getDepartmentWiseFacultyCount = async (req, res) => {
  try {
    const data = await Faculty.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          department: "$_id",
          count: 1,
        },
      },
      {
        $sort: { department: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      totalDepartments: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFacultyDashboardEventsCount = async (req, res) => {
  try {
    const { facultyId } = req.query;

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        message: "facultyId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid facultyId",
      });
    }

    const [
      totalEvents,
      approvedEvents,
      completedEvents,
      pendingApprovalEvents,
    ] = await Promise.all([
      // Total (excluding drafts)
      Event.countDocuments({
        organizerId: facultyId,
        status: { $ne: "Draft" },
      }),

      // Admin approved
      Event.countDocuments({
        organizerId: facultyId,
        adminApproval: true,
      }),

      // Completed (Closed)
      Event.countDocuments({
        organizerId: facultyId,
        status: "Closed",
      }),

      // Submitted and waiting for approval
      Event.countDocuments({
        organizerId: facultyId,
        status: "Submitted",
        adminApproval: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEvents,
        approvedEvents,
        completedEvents,
        pendingApprovalEvents,
      },
    });
  } catch (error) {
    console.error("Faculty dashboard count error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Poster Head Dashboard ───────────────────────────────────────────────────
exports.getPosterHeadDashboard = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    const events = await Event.find({
      status: { $ne: "Draft" },
      "mediaRequirementDetails.mediaRequirements.poster.staff.email": new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    })
      .select(
        "_id iqacNumber status requestDetails.eventDetails.eventName " +
          "requestDetails.organizerDetails.organizingDepartment " +
          "requestDetails.eventDetails.eventSchedule " +
          "mediaRequirementDetails.mediaRequirements"
      )
      .lean();

    const result = events.map((event) => {
      const filteredMedia = (
        event.mediaRequirementDetails?.mediaRequirements || []
      )
        .filter((m) =>
          (m.poster?.staff || []).some(
            (s) => String(s.email || "").toLowerCase() === email.toLowerCase(),
          )
        )
        .map((m) => ({
          dayIndex: m.dayIndex,
          typeOfMedia: m.typeOfMedia,
          posterContent: m.poster?.posterContent,
          certificateContent: m.poster?.certificateContent,
          trophyContent: m.poster?.trophyContent,
          displayNeeded: m.poster?.displayNeeded,
          sizes: m.poster?.sizes,
          referencePosterFiles: m.poster?.referencePosterFiles,
          referenceCertificateFiles: m.poster?.referenceCertificateFiles,
          deliveryDate: m.poster?.deliveryDate,
          priority: m.poster?.priority,
          specialRequirements: m.poster?.specialRequirements,
          staff: m.poster?.staff,
          staffChangeRequest: m.poster?.staffChangeRequest,
          status: m.poster?.status,
          remarks: m.poster?.remarks,
        }));

      return {
        _id: event._id,
        iqacNumber: event.iqacNumber,
        status: event.status,
        eventName: event.requestDetails?.eventDetails?.eventName,
        organizingDepartment:
          event.requestDetails?.organizerDetails?.organizingDepartment,
        eventSchedule:
          event.requestDetails?.eventDetails?.eventSchedule || [],
        posterRequirements: filteredMedia,
      };
    });

    return res.status(200).json({
      success: true,
      email,
      totalEvents: result.length,
      stats: getMediaRequirementStats(result, "posterRequirements"),
      departmentStats: getMediaDepartmentStats(result, "posterRequirements"),
      events: result,
    });
  } catch (error) {
    console.error("Poster head dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getPosterHeadStats = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    const events = await Event.find({
      status: { $ne: "Draft" },
      "mediaRequirementDetails.mediaRequirements.poster.staff.email": new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    })
      .select(
        "_id iqacNumber status requestDetails.eventDetails.eventName " +
          "requestDetails.organizerDetails.organizingDepartment " +
          "requestDetails.eventDetails.eventSchedule " +
          "mediaRequirementDetails.mediaRequirements"
      )
      .lean();

    const result = events.map((event) => ({
      _id: event._id,
      organizingDepartment: event.requestDetails?.organizerDetails?.organizingDepartment,
      posterRequirements: (event.mediaRequirementDetails?.mediaRequirements || [])
        .filter((m) =>
          (m.poster?.staff || []).some(
            (s) => String(s.email || "").toLowerCase() === email.toLowerCase(),
          )
        )
        .map((m) => ({
          ...m,
          status: m.poster?.status,
        })),
    }));

    return res.status(200).json(buildMediaHeadStatsPayload(email, result, "posterRequirements"));
  } catch (error) {
    console.error("Poster head stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Video Head Dashboard ─────────────────────────────────────────────────────
exports.getVideoHeadDashboard = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    const events = await Event.find({
      status: { $ne: "Draft" },
      "mediaRequirementDetails.mediaRequirements.video.staff.email": new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    })
      .select(
        "_id iqacNumber status requestDetails.eventDetails.eventName " +
          "requestDetails.organizerDetails.organizingDepartment " +
          "requestDetails.eventDetails.eventSchedule " +
          "mediaRequirementDetails.mediaRequirements"
      )
      .lean();

    const result = events.map((event) => {
      const filteredMedia = (
        event.mediaRequirementDetails?.mediaRequirements || []
      )
        .filter((m) =>
          (m.video?.staff || []).some(
            (s) => String(s.email || "").toLowerCase() === email.toLowerCase(),
          )
        )
        .map((m) => ({
          dayIndex: m.dayIndex,
          typeOfMedia: m.typeOfMedia,
          videoContent: m.video?.videoContent,
          preEventVideos: m.video?.preEventVideos,
          eventCoverage: m.video?.eventCoverage,
          postEventVideos: m.video?.postEventVideos,
          specialVideos: m.video?.specialVideos,
          referenceFiles: m.video?.referenceFiles,
          deliveryDate: m.video?.deliveryDate,
          priority: m.video?.priority,
          specialRequirements: m.video?.specialRequirements,
          staff: m.video?.staff,
          staffChangeRequest: m.video?.staffChangeRequest,
          status: m.video?.status,
          remarks: m.video?.remarks,
        }));

      return {
        _id: event._id,
        iqacNumber: event.iqacNumber,
        status: event.status,
        eventName: event.requestDetails?.eventDetails?.eventName,
        organizingDepartment:
          event.requestDetails?.organizerDetails?.organizingDepartment,
        eventSchedule:
          event.requestDetails?.eventDetails?.eventSchedule || [],
        videoRequirements: filteredMedia,
      };
    });

    return res.status(200).json({
      success: true,
      email,
      totalEvents: result.length,
      stats: getMediaRequirementStats(result, "videoRequirements"),
      departmentStats: getMediaDepartmentStats(result, "videoRequirements"),
      events: result,
    });
  } catch (error) {
    console.error("Video head dashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getVideoHeadStats = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    const events = await Event.find({
      status: { $ne: "Draft" },
      "mediaRequirementDetails.mediaRequirements.video.staff.email": new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    })
      .select(
        "_id iqacNumber status requestDetails.eventDetails.eventName " +
          "requestDetails.organizerDetails.organizingDepartment " +
          "requestDetails.eventDetails.eventSchedule " +
          "mediaRequirementDetails.mediaRequirements"
      )
      .lean();

    const result = events.map((event) => ({
      _id: event._id,
      organizingDepartment: event.requestDetails?.organizerDetails?.organizingDepartment,
      videoRequirements: (event.mediaRequirementDetails?.mediaRequirements || [])
        .filter((m) =>
          (m.video?.staff || []).some(
            (s) => String(s.email || "").toLowerCase() === email.toLowerCase(),
          )
        )
        .map((m) => ({
          ...m,
          status: m.video?.status,
        })),
    }));

    return res.status(200).json(buildMediaHeadStatsPayload(email, result, "videoRequirements"));
  } catch (error) {
    console.error("Video head stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getHodDashboardStats = async (req, res) => {
  try {
    const { department } = req.query;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "department is required",
      });
    }

    const baseFilter = {
      "requestDetails.organizerDetails.organizingDepartment": department,
      status: { $ne: "Draft" },
    };

    const [
      totalEvents,
      hodApprovedEvents,
      closedEvents,
      pendingEvents,
    ] = await Promise.all([
      // Total (excluding drafts)
      Event.countDocuments(baseFilter),

      // HOD approved
      Event.countDocuments({
        ...baseFilter,
        isHodApproved: true,
      }),

      // Completed (Closed)
      Event.countDocuments({
        ...baseFilter,
        status: "Closed",
      }),

      // Submitted and waiting for HOD approval
      Event.countDocuments({
        ...baseFilter,
        isHodApproved: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEvents,
        hodApprovedEvents,
        closedEvents,
        pendingEvents,
      },
    });
  } catch (error) {
    console.error("HOD dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
