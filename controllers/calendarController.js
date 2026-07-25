const Event = require("../models/Event");

// ---------------------------------------------------------------------------
// TEMP: hardcoded venue list.
// Replace this with a real Venue collection / lookup later — the frontend
// already calls GET /api/calendar/venues as if it were dynamic, so swapping
// this out for `await Venue.find().select("name")` is a drop-in change.
// ---------------------------------------------------------------------------
const HARDCODED_VENUES = [
  "Main Board Room",
  "Auditorium",
  "Seminar Hall A",
  "Seminar Hall B",
  "Room 201",
  "Lab B-12",
  "Outdoor Lawn Section",
];

// Colors keyed by organizing department — mirrors the sidebar legend on the
// frontend. Kept here too so any server-rendered / exported views agree.
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

/**
 * Computes the [start, end] Date range for a given view + anchor date.
 * view: "day" | "week" | "month"
 */
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

/**
 * GET /api/calendar/events?venue=Main+Board+Room&view=week&date=2026-10-04
 *
 * Events store their schedule as parallel arrays:
 *   requestDetails.eventDetails.eventSchedule[dayIndex] -> { eventDate, startTime, endTime }
 *   venueDetails.venues[]                                -> { dayIndex, venueName, ... }
 * so a "calendar occurrence" is the join of a venue entry to its schedule
 * day via dayIndex. We unwind venueDetails.venues, filter by venue name,
 * pull in the matching schedule day, then filter by the requested range.
 */
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
        $unwind: "$venueDetails.venues",
      },
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
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          dayIndex: "$venueDetails.venues.dayIndex",
          eventName: "$requestDetails.eventDetails.eventName",
          eventType: "$requestDetails.eventDetails.eventType",
          department:
            "$requestDetails.organizerDetails.organizingDepartment",
          venueName: "$venueDetails.venues.venueName",
          seatingCapacity: "$venueDetails.venues.seatingCapacity",
          eventDate: "$scheduleDay.eventDate",
          startTime: "$scheduleDay.startTime",
          endTime: "$scheduleDay.endTime",
          venueStatus: "$venueDetails.status.status",
          eventStatus: "$status",
        },
      },
      {
        $sort: {
          eventDate: 1,
          startTime: 1,
        },
      },
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

module.exports = {
  getVenues,
  getEvents,
  DEPARTMENT_COLORS,
};
