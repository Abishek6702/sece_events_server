const mongoose = require("mongoose");
const Event = require("../models/Event");
const RoomType = require("../models/RoomType");

const parseBookingDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
};

const isObjectId = (value) => mongoose.isValidObjectId(value);

const parseRoomCount = (value) => {
  if (value === undefined) return 0;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
};

exports.createRoomType = async (req, res) => {
  try {
    const { roomName, singleRoomCount, doubleRoomCount, description } = req.body;
    const singleCount = parseRoomCount(singleRoomCount);
    const doubleCount = parseRoomCount(doubleRoomCount);
    if (!roomName?.trim() || singleCount === null || doubleCount === null || singleCount + doubleCount < 1) {
      return res.status(400).json({
        success: false,
        message: "roomName, singleRoomCount, and doubleRoomCount are required; total rooms must be at least 1",
      });
    }

    const roomType = await RoomType.create({
      roomName,
      singleRoomCount: singleCount,
      doubleRoomCount: doubleCount,
      description,
    });
    return res.status(201).json({ success: true, data: roomType });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.message });
  }
};

exports.getRoomTypes = async (_req, res) => {
  try {
    const roomTypes = await RoomType.find({ isActive: true }).sort({ roomName: 1 }).lean();
    return res.status(200).json({ success: true, count: roomTypes.length, data: roomTypes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomTypeById = async (req, res) => {
  try {
    if (!isObjectId(req.params.roomTypeId)) {
      return res.status(400).json({ success: false, message: "Invalid room type id" });
    }
    const roomType = await RoomType.findById(req.params.roomTypeId);
    if (!roomType) return res.status(404).json({ success: false, message: "Room type not found" });
    return res.status(200).json({ success: true, data: roomType });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoomType = async (req, res) => {
  try {
    const { roomTypeId } = req.params;
    if (!isObjectId(roomTypeId)) {
      return res.status(400).json({ success: false, message: "Invalid room type id" });
    }

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ success: false, message: "Room type not found" });

    const singleCount = req.body.singleRoomCount === undefined
      ? roomType.singleRoomCount
      : parseRoomCount(req.body.singleRoomCount);
    const doubleCount = req.body.doubleRoomCount === undefined
      ? roomType.doubleRoomCount
      : parseRoomCount(req.body.doubleRoomCount);
    if (singleCount === null || doubleCount === null || singleCount + doubleCount < 1) {
      return res.status(400).json({
        success: false,
        message: "singleRoomCount and doubleRoomCount must be whole numbers, with at least one total room",
      });
    }

    roomType.singleRoomCount = singleCount;
    roomType.doubleRoomCount = doubleCount;
    ["roomName", "description", "isActive"].forEach((field) => {
      if (req.body[field] !== undefined) roomType[field] = req.body[field];
    });
    await roomType.save();
    return res.status(200).json({ success: true, data: roomType });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.message });
  }
};

exports.deleteRoomType = async (req, res) => {
  try {
    if (!isObjectId(req.params.roomTypeId)) {
      return res.status(400).json({ success: false, message: "Invalid room type id" });
    }
    const roomType = await RoomType.findByIdAndDelete(req.params.roomTypeId);
    if (!roomType) return res.status(404).json({ success: false, message: "Room type not found" });
    return res.status(200).json({ success: true, message: "Room type deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

