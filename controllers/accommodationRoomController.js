const AccommodationRoom = require("../models/AccommodationRoom");
const { getAvailableRooms } = require("../utils/accommodationAvailabilityService");

const isObjectId = (value) => value && value.length === 24 && /^[0-9a-fA-F]{24}$/.test(value);

exports.createRoom = async (req, res) => {
  try {
    const { venue, roomNumber, capacity, isActive } = req.body;

    if (!venue?.trim() || !roomNumber?.trim() || typeof capacity !== "number" || capacity < 1) {
      return res.status(400).json({
        success: false,
        message: "venue, roomNumber, and a valid capacity are required",
      });
    }

    const room = await AccommodationRoom.create({
      venue,
      roomNumber,
      capacity,
      isActive: isActive !== undefined ? isActive : true,
    });
    return res.status(201).json({ success: true, data: room });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const filter = {};
    if (req.query.venue) filter.venue = req.query.venue;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const rooms = await AccommodationRoom.find(filter).sort({ venue: 1, roomNumber: 1 }).lean();
    return res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid room id" });
    }
    const room = await AccommodationRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid room id" });
    }

    const room = await AccommodationRoom.findById(id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const { venue, roomNumber, capacity, isActive } = req.body;
    
    if (venue !== undefined) room.venue = venue;
    if (roomNumber !== undefined) room.roomNumber = roomNumber;
    if (capacity !== undefined) room.capacity = capacity;
    if (isActive !== undefined) room.isActive = isActive;

    await room.save();
    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room id",
      });
    }

    // Permanent delete
    const room = await AccommodationRoom.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
      data: room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getRoomAvailability = async (req, res) => {
  try {
    const {
      startDateTime,
      endDateTime,
      excludeEventId,
    } = req.query;

    // ----------------------------------------------
    // Validate required fields
    // ----------------------------------------------

    if (!startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message:
          "startDateTime and endDateTime are required",
      });
    }

    // ----------------------------------------------
    // Parse dates
    // ----------------------------------------------

    const parsedStart =
      new Date(startDateTime);

    const parsedEnd =
      new Date(endDateTime);

    if (
      isNaN(parsedStart.getTime()) ||
      isNaN(parsedEnd.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // ----------------------------------------------
    // Validate date range
    // ----------------------------------------------

    if (parsedStart >= parsedEnd) {
      return res.status(400).json({
        success: false,
        message:
          "startDateTime must be before endDateTime",
      });
    }

    // ----------------------------------------------
    // Get room availability
    // ----------------------------------------------

    const availability =
      await getAvailableRooms({
        startDateTime: parsedStart,
        endDateTime: parsedEnd,
        excludeEventId,
      });

    // ----------------------------------------------
    // Response
    // ----------------------------------------------

    return res.status(200).json({
      success: true,
      count: availability.length,
      data: availability,
    });

  } catch (error) {
    console.error(
      "Room availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};