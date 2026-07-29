const Event = require("../models/Event.js");

require("dotenv").config();
const mongoose = require("mongoose");

exports.changeMediaStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { mediaType, staff, reason } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (!["poster", "video"].includes(mediaType)) {
      return res.status(400).json({
        message: "Invalid media type",
      });
    }

    event.mediaRequirementDetails.mediaRequirements.forEach((media) => {
      media[mediaType].staffHistory.push({
        previousStaff: media[mediaType].staff,
        newStaff: staff,
        reason,
        changedBy: req.user
          ? {
              name: req.user.name,
              email: req.user.email,
            }
          : undefined,
        changedAt: new Date(),
      });
    
      media[mediaType].staff = staff;
    });

    await event.save();

    res.status(200).json({
      message: "Staff updated successfully",
      data: event,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};
