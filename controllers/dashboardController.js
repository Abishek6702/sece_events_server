const Event = require("../models/Event");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();

    const completedEvents = await Event.countDocuments({
      status: "Closed",
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
    };

    const moduleStats = {};

    for (const key in modules) {
      const path = modules[key];

      const acknowledged = await Event.countDocuments({
        [`${path}.status.status`]: "Acknowledged",
      });

      const pending = await Event.countDocuments({
        $or: [
          { [`${path}.status.status`]: "Pending for Acknowledge" },
          { [`${path}.status`]: { $exists: false } },
        ],
      });

      moduleStats[key] = {
        acknowledged,
        pending,
      };
    }

    res.status(200).json({
      totalEvents,
      completedEvents,
      modules: moduleStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
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

    const getStats = async (path) => {
      return await Event.aggregate([
        {
          $match: {
            [`${path}`]: { $exists: true },
          },
        },
        {
          $group: {
            _id: "$requestDetails.organizerDetails.organizingDepartment",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            department: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]);
    };

    if (module) {
      const path = modules[module];

      if (!path) {
        return res.status(400).json({ message: "Invalid module" });
      }

      const data = await getStats(path);

      return res.status(200).json({
        module,
        data,
      });
    }

    const result = {};

    for (const key in modules) {
      result[key] = await getStats(modules[key]);
    }

    res.status(200).json({
      message: "Department-wise stats",
      data: result,
    });
  } catch (error) {
    console.error("Pie chart error:", error);
    res.status(500).json({ message: "Server error" });
  }
};