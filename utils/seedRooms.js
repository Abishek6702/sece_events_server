const mongoose = require("mongoose");
const AccommodationRoom = require("../models/AccommodationRoom");
const connectDB = require("../config/db");
require("dotenv").config();

const roomsToSeed = [
  // SOIT
  { venue: "SUIT", roomNumber: "Room 1", capacity: 2 },
  { venue: "SUIT", roomNumber: "Room 2", capacity: 2 },
  { venue: "SUIT", roomNumber: "Room 3", capacity: 2 },
  { venue: "SUIT", roomNumber: "Room 5", capacity: 2 },
  // C Block
  { venue: "C Block", roomNumber: "002", capacity: 2 },
  { venue: "C Block", roomNumber: "003", capacity: 2 },
  { venue: "C Block", roomNumber: "102", capacity: 2 },
  { venue: "C Block", roomNumber: "103", capacity: 2 },
  // F Block
  { venue: "F Block", roomNumber: "102", capacity: 3 },
  { venue: "F Block", roomNumber: "103", capacity: 3 },
  { venue: "F Block", roomNumber: "104", capacity: 3 },
  { venue: "F Block", roomNumber: "105", capacity: 3 },
  // Girls Hostel
  { venue: "Girls Hostel", roomNumber: "1", capacity: 5 },
];

const seedRooms = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB. Starting seed...");

    let addedCount = 0;

    for (const roomData of roomsToSeed) {
      // Idempotent: Only insert if it doesn't already exist
      const exists = await AccommodationRoom.findOne({ venue: roomData.venue, roomNumber: roomData.roomNumber });
      if (!exists) {
        await AccommodationRoom.create(roomData);
        addedCount++;
        console.log(`Added room: ${roomData.venue} - ${roomData.roomNumber}`);
      } else {
        console.log(`Room already exists, skipping: ${roomData.venue} - ${roomData.roomNumber}`);
      }
    }

    console.log(`Seed completed successfully. Added ${addedCount} rooms.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding rooms:", error);
    process.exit(1);
  }
};

seedRooms();
