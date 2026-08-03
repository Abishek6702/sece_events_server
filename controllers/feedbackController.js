// feedback.controller.js

const Feedback = require("../models/Feedback");
const Event = require("../models/Event");

const DEPARTMENT_ALIASES = {
  venue: ["venue"],
  icts: ["icts", "ict"],
  audio: ["audio"],
  transport: ["transport"],
  food: ["food", "refreshment", "refreshments"],
  purchase: ["purchase"],
  poster: ["poster"],
  video: ["video"],
  accommodation: ["accommodation"],
  media: ["media"],
};
const EMAIL_SCOPED_DEPARTMENTS = new Set(["poster", "video"]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDepartmentFilter = (department) => {
  const normalizedDepartment = String(department || "").trim().toLowerCase();

  if (!normalizedDepartment) {
    return null;
  }

  const keys = DEPARTMENT_ALIASES[normalizedDepartment] || [normalizedDepartment];
  return {
    $in: keys.map((key) => new RegExp(`^${escapeRegex(key)}$`, "i")),
  };
};

const getDepartmentMatch = (department) => {
  const sectionKeyFilter = getDepartmentFilter(department);
  return sectionKeyFilter ? { "sections.sectionKey": sectionKeyFilter } : null;
};

const getDepartmentPipeline = (department) => {
  const match = getDepartmentMatch(department);
  return match ? [{ $match: match }, { $unwind: "$sections" }, { $match: match }] : [];
};

const getScopedDepartmentPipeline = (department, email) => {
  const normalizedDepartment = String(department || "").trim().toLowerCase();
  const pipeline = getDepartmentPipeline(normalizedDepartment);

  if (!pipeline.length) {
    return { error: "Department is required" };
  }

  return {
    pipeline,
    normalizedDepartment,
    normalizedEmail: String(email || "").trim().toLowerCase(),
  };
};

// Poster/Video dashboards can be limited to the staff member assigned to that
// media type. Feedback.organizerId belongs to the event organizer, not staff.
const appendMediaStaffEmailFilter = (pipeline, department, email) => {
  if (!EMAIL_SCOPED_DEPARTMENTS.has(department) || !email) return;

  pipeline.push({
    $match: {
      [`event.mediaRequirementDetails.mediaRequirements.${department}.staff.email`]: new RegExp(
        `^${escapeRegex(email)}$`,
        "i",
      ),
    },
  });
};

const appendMediaStaffEmailScope = (pipeline, department, email) => {
  if (!EMAIL_SCOPED_DEPARTMENTS.has(department) || !email) return;

  pipeline.push(
    {
      $lookup: {
        from: "events",
        localField: "eventId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
  );
  appendMediaStaffEmailFilter(pipeline, department, email);
};

// Department feedback table: one row per submitted feedback section.
const getDepartmentFeedbacks = async (req, res) => {
  try {
    const { department } = req.params;
    const search = String(req.query.search || "").trim();
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const scope = getScopedDepartmentPipeline(department, req.query.email);

    if (scope.error) {
      return res.status(400).json({ success: false, message: scope.error });
    }
    const { pipeline, normalizedDepartment, normalizedEmail } = scope;

    pipeline.push(
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
    );
    appendMediaStaffEmailFilter(pipeline, normalizedDepartment, normalizedEmail);

    pipeline.push(
      {
        $lookup: {
          from: "faculties",
          localField: "organizerId",
          foreignField: "_id",
          as: "organizer",
        },
      },
      { $unwind: { path: "$organizer", preserveNullAndEmptyArrays: true } },
    );

    if (search) {
      const searchPattern = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "event.requestDetails.eventDetails.eventName": searchPattern },
            { "event.requestDetails.eventDetails.eventType": searchPattern },
            { "sections.comment": searchPattern },
          ],
        },
      });
    }

    const [result] = await Feedback.aggregate([
      ...pipeline,
      { $sort: { submittedAt: -1, createdAt: -1 } },
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                feedbackId: "$_id",
                eventId: "$eventId",
                organizerId: "$organizerId",
                organizerName: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$organizer.firstName", ""] },
                        " ",
                        { $ifNull: ["$organizer.lastName", ""] },
                      ],
                    },
                  },
                },
                eventName: "$event.requestDetails.eventDetails.eventName",
                eventType: "$event.requestDetails.eventDetails.eventType",
                organizingDepartment: "$event.requestDetails.organizerDetails.organizingDepartment",
                department: "$sections.sectionKey",
                type: "$sections.sectionTitle",
                rating: "$sections.rating",
                ratingLabel: "$sections.ratingLabel",
                feedback: "$sections.comment",
                organizerEmail: "$organizer.email",
                submittedAt: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const total = result.total[0]?.count || 0;
    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Rating used by the circular overall-rating component.
const getDepartmentOverallRating = async (req, res) => {
  try {
    const { department } = req.params;
    const scope = getScopedDepartmentPipeline(department, req.query.email);

    if (scope.error) {
      return res.status(400).json({ success: false, message: scope.error });
    }
    const { pipeline, normalizedDepartment, normalizedEmail } = scope;
    appendMediaStaffEmailScope(pipeline, normalizedDepartment, normalizedEmail);

    const [summary] = await Feedback.aggregate([
      ...pipeline,
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$sections.rating" },
          totalResponses: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        department: normalizedDepartment,
        averageRating: Number((summary?.averageRating || 0).toFixed(1)),
        maxRating: 5,
        totalResponses: summary?.totalResponses || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Five-star distribution used by the satisfaction-summary component.
const getDepartmentSatisfactionSummary = async (req, res) => {
  try {
    const { department } = req.params;
    const scope = getScopedDepartmentPipeline(department, req.query.email);

    if (scope.error) {
      return res.status(400).json({ success: false, message: scope.error });
    }
    const { pipeline, normalizedDepartment, normalizedEmail } = scope;
    appendMediaStaffEmailScope(pipeline, normalizedDepartment, normalizedEmail);

    const ratings = await Feedback.aggregate([
      ...pipeline,
      { $group: { _id: "$sections.rating", count: { $sum: 1 } } },
    ]);
    const countByRating = new Map(ratings.map(({ _id, count }) => [_id, count]));
    const totalResponses = ratings.reduce((total, item) => total + item.count, 0);
    const distribution = [5, 4, 3, 2, 1].map((rating) => {
      const count = countByRating.get(rating) || 0;
      return {
        rating,
        count,
        percentage: totalResponses ? Number(((count / totalResponses) * 100).toFixed(1)) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        department: normalizedDepartment,
        totalResponses,
        distribution,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE FEEDBACK
const createFeedback = async (req, res) => {
  try {
    const { eventId, organizerId, sections } = req.body;

    // check event exists
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // create feedback
    const feedback = await Feedback.create({
      eventId,
      organizerId,
      sections,
    });

    // store feedback id inside event
    event.feedbacks.push(feedback._id);

    await event.save();

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET FEEDBACKS BY EVENT
const getFeedbackByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const feedbacks = await Feedback.find({ eventId })
      .populate("organizerId", "firstName lastName email empId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE FEEDBACK
const getFeedbackById = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId)
      .populate("eventId")
      .populate("organizerId", "firstName lastName email empId");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE FEEDBACK
const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    // remove feedback reference from event
    await Event.findByIdAndUpdate(feedback.eventId, {
      $pull: {
        feedbacks: feedback._id,
      },
    });

    // delete feedback
    await Feedback.findByIdAndDelete(feedbackId);

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFeedback,
  getFeedbackByEvent,
  getFeedbackById,
  deleteFeedback,
  getDepartmentFeedbacks,
  getDepartmentOverallRating,
  getDepartmentSatisfactionSummary,
};
