const Event = require("../models/Event");
const Venue = require("../models/Venue");
const AccommodationRoom = require("../models/AccommodationRoom");

const HARDCODED_VENUES = [
  "Main Board Room",
  "Auditorium",
  "Seminar Hall A",
  "Seminar Hall B",
  "Room 201",
  "Lab B-12",
  "Outdoor Lawn Section",
];

const DEPARTMENT_COLORS = {
  "CCE": "purple",
  "MECH": "cyan",
  "AIML": "orange",
  "CSE": "teal",
  "ECE": "green",
  "EEE": "blue",
  "AI&DS": "red",
  "CFRD": "pink",
  "IQAC": "indigo",
  "MATHS": "amber",
  "S&H": "lime",
  "IR": "sky",
  "CSBS": "emerald",
  "IT": "rose",
  "CYS": "fuchsia",
  "PLACEMENT": "violet",
  "PD": "yellow",
  "INNOVATION": "stone",
  "COE": "slate",
  "HR": "zinc",
};

function getVenues(req, res) {
  return res.status(200).json({ venues: HARDCODED_VENUES });
}

function getRangeForView(view, anchorDate) {
  const anchor = new Date(anchorDate);
  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Invalid date");
  }

  if (view === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (view === "week") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // back up to Sunday
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  // month
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

async function getEvents(req, res) {
  try {
    const { venue, view = "week", date } = req.query;

    if (!venue) {
      return res.status(400).json({ message: "venue is required" });
    }
    if (!["day", "week", "month"].includes(view)) {
      return res.status(400).json({ message: "view must be day, week, or month" });
    }

    const anchorDate = date ? new Date(date) : new Date();
    if (Number.isNaN(anchorDate.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const { start, end } = getRangeForView(view, anchorDate);

    const occurrences = await Event.aggregate([
      {
        $match: {
          status: { $nin: ["Draft", "Closed", "Rejected"] },
        },
      },
      { $unwind: "$venueDetails.venues" },
      {
        $match: {
          "venueDetails.venues.venueName": venue,
        },
      },
      {
        $addFields: {
          scheduleDay: {
            $arrayElemAt: [
              "$requestDetails.eventDetails.eventSchedule",
              "$venueDetails.venues.dayIndex",
            ],
          },
        },
      },
      {
        $match: {
          "scheduleDay.eventDate": {
            $gte: start,
            $lt: end,
          },
        },
      },
      // Populate organizer from top-level organizerId → Faculty collection
      {
        $lookup: {
          from: "faculties",
          localField: "organizerId",
          foreignField: "_id",
          as: "organizerFaculty",
        },
      },
      {
        $addFields: {
          organizerDoc: { $arrayElemAt: ["$organizerFaculty", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          dayIndex: "$venueDetails.venues.dayIndex",
          eventName: "$requestDetails.eventDetails.eventName",
          eventType: "$requestDetails.eventDetails.eventType",
          department: "$requestDetails.organizerDetails.organizingDepartment",
          venueName: "$venueDetails.venues.venueName",
          seatingCapacity: "$venueDetails.venues.seatingCapacity",
          eventDate: "$scheduleDay.eventDate",
          startTime: "$scheduleDay.startTime",
          endTime: "$scheduleDay.endTime",
          venueStatus: "$venueDetails.status.status",
          // From Faculty document looked up via top-level organizerId
          organizerName: {
            $cond: {
              if: { $ifNull: ["$organizerDoc", false] },
              then: {
                $concat: [
                  { $ifNull: ["$organizerDoc.salutation", ""] },
                  { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$organizerDoc.salutation", ""] } }, 0] }, " ", ""] },
                  { $ifNull: ["$organizerDoc.firstName", ""] },
                  " ",
                  { $ifNull: ["$organizerDoc.lastName", ""] },
                ],
              },
              else: "N/A",
            },
          },
          organizerEmpId: { $ifNull: ["$organizerDoc.empId", "N/A"] },
          organizerMobile: { $ifNull: ["$organizerDoc.phone", "N/A"] },
        },
      },
      { $sort: { eventDate: 1, startTime: 1 } },
    ]);

    const events = occurrences.map((occ) => ({
      ...occ,
      color: DEPARTMENT_COLORS[occ.department] || "slate",
    }));

    return res.status(200).json({
      view,
      venue,
      range: { start, end },
      events,
    });
  } catch (err) {
    console.error("getEvents error:", err);
    return res.status(500).json({ message: "Failed to load calendar events" });
  }
}

async function getAllVenuesEvents(req, res) {
  try {
    const { date } = req.query;

    const anchorDate = date ? new Date(date) : new Date();
    if (Number.isNaN(anchorDate.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const { start, end } = getRangeForView("month", anchorDate);

    // 1. Get all venue names from the Venue collection
    const venuesDocs = await Venue.find().select("venue").lean();
    const venues = venuesDocs.map((v) => v.venue);

    // 2. Single aggregation — unwind ALL venue entries, filter by date range and status (excluding Draft, Closed, Rejected)
    const occurrences = await Event.aggregate([
      {
        $match: {
          status: { $nin: ["Draft", "Closed", "Rejected"] },
        },
      },
      { $unwind: "$venueDetails.venues" },
      {
        $addFields: {
          scheduleDay: {
            $arrayElemAt: [
              "$requestDetails.eventDetails.eventSchedule",
              "$venueDetails.venues.dayIndex",
            ],
          },
        },
      },
      {
        $match: {
          "scheduleDay.eventDate": {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $lookup: {
          from: "faculties",
          localField: "organizerId",
          foreignField: "_id",
          as: "organizerFaculty",
        },
      },
      {
        $addFields: {
          organizerDoc: { $arrayElemAt: ["$organizerFaculty", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          dayIndex: "$venueDetails.venues.dayIndex",
          eventName: "$requestDetails.eventDetails.eventName",
          eventType: "$requestDetails.eventDetails.eventType",
          department: "$requestDetails.organizerDetails.organizingDepartment",
          venueName: "$venueDetails.venues.venueName",
          seatingCapacity: "$venueDetails.venues.seatingCapacity",
          eventDate: "$scheduleDay.eventDate",
          startTime: "$scheduleDay.startTime",
          endTime: "$scheduleDay.endTime",
          venueStatus: "$venueDetails.status.status",
          organizerName: {
            $cond: {
              if: { $ifNull: ["$organizerDoc", false] },
              then: {
                $concat: [
                  { $ifNull: ["$organizerDoc.salutation", ""] },
                  { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$organizerDoc.salutation", ""] } }, 0] }, " ", ""] },
                  { $ifNull: ["$organizerDoc.firstName", ""] },
                  " ",
                  { $ifNull: ["$organizerDoc.lastName", ""] },
                ],
              },
              else: "N/A",
            },
          },
          organizerEmpId: { $ifNull: ["$organizerDoc.empId", "N/A"] },
          organizerMobile: { $ifNull: ["$organizerDoc.phone", "N/A"] },
        },
      },
      { $sort: { venueName: 1, eventDate: 1, startTime: 1 } },
    ]);

    // 3. Group events by venueName
    const eventsByVenue = {};
    venues.forEach((v) => { eventsByVenue[v] = []; });

    occurrences.forEach((occ) => {
      const colored = { ...occ, color: DEPARTMENT_COLORS[occ.department] || "slate" };
      if (eventsByVenue[occ.venueName]) {
        eventsByVenue[occ.venueName].push(colored);
      } else {
        // Venue from event data but not in Venue collection — still include it
        eventsByVenue[occ.venueName] = [colored];
        if (!venues.includes(occ.venueName)) {
          venues.push(occ.venueName);
        }
      }
    });

    return res.status(200).json({
      range: { start, end },
      venues,
      eventsByVenue,
    });
  } catch (err) {
    console.error("getAllVenuesEvents error:", err);
    return res.status(500).json({ message: "Failed to load all venues events" });
  }
}

async function getAllRoomsEvents(req, res) {
  try {
    const { date } = req.query;

    const anchorDate = date ? new Date(date) : new Date();
    if (Number.isNaN(anchorDate.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const { start, end } = getRangeForView("month", anchorDate);

    // 1. Get all active rooms
    const allRooms = await AccommodationRoom.find({ isActive: true })
      .sort({ venue: 1, roomNumber: 1 })
      .lean();

    // 2. Fetch all events in the month that have accommodation bookings
    const events = await Event.find({
      status: { $nin: ["Draft", "Closed", "Rejected"] },
      "accommodationDetails.accommodations": {
        $elemMatch: {
          checkOutDateTime: { $gte: start },
          checkInDateTime: { $lt: end },
        },
      },
    })
      .select(
        "accommodationDetails requestDetails.eventDetails.eventName requestDetails.organizerDetails.organizingDepartment organizerId"
      )
      .populate({
        path: "organizerId",
        model: "Faculty",
        select: "salutation firstName lastName empId phone",
      })
      .lean();

    // 3. Build map: roomId -> [ { eventName, department, checkInDateTime, checkOutDateTime, organizerName, organizerEmpId, organizerMobile, color } ]
    const eventsByRoom = {};
    allRooms.forEach((r) => { eventsByRoom[r._id.toString()] = []; });

    for (const evt of events) {
      const eventName = evt.requestDetails?.eventDetails?.eventName || "—";
      const department = evt.requestDetails?.organizerDetails?.organizingDepartment || "";
      const color = DEPARTMENT_COLORS[department] || "slate";

      const org = evt.organizerId;
      let organizerName = "N/A";
      if (org) {
        const parts = [org.salutation, org.firstName, org.lastName].filter(Boolean);
        organizerName = parts.join(" ") || "N/A";
      }
      const organizerEmpId = org?.empId || "N/A";
      const organizerMobile = org?.phone || "N/A";

      for (const acc of evt.accommodationDetails?.accommodations || []) {
        if (!acc.checkInDateTime || !acc.checkOutDateTime) continue;
        const checkIn  = new Date(acc.checkInDateTime);
        const checkOut = new Date(acc.checkOutDateTime);
        // only include if overlaps the month
        if (checkOut < start || checkIn >= end) continue;

        for (const sel of acc.roomSelections || []) {
          if (!sel.roomId) continue;
          const rid = sel.roomId.toString();
          const entry = {
            eventId: evt._id,
            eventName,
            department,
            color,
            checkInDateTime:  checkIn,
            checkOutDateTime: checkOut,
            roomNumber: sel.roomNumber || "",
            venue: sel.venue || "",
            occupantCount: sel.occupantCount || 0,
            organizerName,
            organizerEmpId,
            organizerMobile,
          };
          if (eventsByRoom[rid]) {
            eventsByRoom[rid].push(entry);
          } else {
            eventsByRoom[rid] = [entry];
          }
        }
      }
    }

    const rooms = allRooms.map((r) => ({
      roomId: r._id.toString(),
      roomNumber: r.roomNumber,
      venue: r.venue,
      capacity: r.capacity,
    }));

    return res.status(200).json({
      range: { start, end },
      rooms,
      eventsByRoom,
    });
  } catch (err) {
    console.error("getAllRoomsEvents error:", err);
    return res.status(500).json({ message: "Failed to load room events" });
  }
}

module.exports = {
  getVenues,
  getEvents,
  getAllVenuesEvents,
  getAllRoomsEvents,
  DEPARTMENT_COLORS,
};
