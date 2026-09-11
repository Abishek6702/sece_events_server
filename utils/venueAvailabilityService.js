const Event = require("../models/Event");

/**
 * Format a date value into YYYY-MM-DD string in Asia/Kolkata (IST) timezone.
 *
 * @param {Date|string} date
 * @returns {string|null}
 */
const getISTDateString = (date) => {
  if (!date) return null;

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const partMap = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
};

/**
 * Convert time string "HH:mm" to total minutes from start of day.
 *
 * @param {string} time
 * @returns {number}
 */
const timeToMinutes = (time) => {
  if (!time || typeof time !== "string") return 0;
  const parts = time.trim().split(":").map(Number);
  const hour = isNaN(parts[0]) ? 0 : parts[0];
  const minute = isNaN(parts[1]) ? 0 : parts[1];
  return hour * 60 + minute;
};

/**
 * Check if two time ranges overlap.
 *
 * @param {string} existingStart
 * @param {string} existingEnd
 * @param {string} requestedStart
 * @param {string} requestedEnd
 * @returns {boolean}
 */
const isOverlapping = (
  existingStart,
  existingEnd,
  requestedStart,
  requestedEnd,
) => {
  const s1 = timeToMinutes(existingStart);
  const e1 = timeToMinutes(existingEnd);
  const s2 = timeToMinutes(requestedStart);
  const e2 = timeToMinutes(requestedEnd);
  return s1 < e2 && s2 < e1;
};

/**
 * Checks availability of requested venues against existing scheduled events.
 *
 * @param {Object} params
 * @param {Array} params.eventSchedule - Array of schedule objects [{ dayIndex, eventDate, startTime, endTime }]
 * @param {Array} params.venues - Array of venue objects [{ dayIndex, venueName }]
 * @param {String|ObjectId} [params.excludeEventId] - Event ID to exclude (e.g. current event when editing/submitting)
 * @returns {Promise<{ available: Array, unavailable: Array, status: String, message: String }>}
 */
const getVenueAvailability = async ({
  eventSchedule = [],
  venues = [],
  excludeEventId = null,
}) => {
  if (!Array.isArray(eventSchedule) || !eventSchedule.length) {
    return {
      available: [],
      unavailable: [],
      status: "AVAILABLE",
      message: "No schedule provided.",
    };
  }

  if (!Array.isArray(venues) || !venues.length) {
    return {
      available: [],
      unavailable: [],
      status: "AVAILABLE",
      message: "No venues provided.",
    };
  }

  const query = {
    status: {
      $nin: ["Rejected", "Admin Cancelled", "Draft", "Closed","Deleted"],
    },
    "venueDetails.venues": { $exists: true, $not: { $size: 0 } },
  };

  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }

  const existingEvents = await Event.find(query)
    .select(
      "requestDetails.eventDetails.eventSchedule venueDetails.venues requestDetails.eventDetails.eventName status",
    )
    .lean();

  const availableVenues = [];
  const unavailableVenues = [];

  for (const venue of venues) {
    if (!venue.venueName || !venue.venueName.trim()) continue;

    const dayIndex = typeof venue.dayIndex === "number" ? venue.dayIndex : 0;
    const schedule =
      eventSchedule.find((item) => item.dayIndex === dayIndex) ||
      eventSchedule[dayIndex] ||
      eventSchedule[0];

    if (!schedule || !schedule.eventDate) {
      continue;
    }

    const requestDate = getISTDateString(schedule.eventDate);
    if (!requestDate) continue;

    const reqStartTime = schedule.startTime;
    const reqEndTime = schedule.endTime;

    let isBooked = false;

    for (const event of existingEvents) {
      const existingSchedules =
        event.requestDetails?.eventDetails?.eventSchedule || [];
      const existingVenues = event.venueDetails?.venues || [];

      if (!existingSchedules.length || !existingVenues.length) {
        continue;
      }

      for (const existingVenue of existingVenues) {
        if (
          !existingVenue.venueName ||
          existingVenue.venueName.trim().toLowerCase() !==
            venue.venueName.trim().toLowerCase()
        ) {
          continue;
        }

        const existingDayIndex =
          typeof existingVenue.dayIndex === "number"
            ? existingVenue.dayIndex
            : 0;

        const existingSchedule =
          existingSchedules.find((s) => s.dayIndex === existingDayIndex) ||
          existingSchedules[existingDayIndex] ||
          existingSchedules[0];

        if (!existingSchedule || !existingSchedule.eventDate) {
          continue;
        }

        const existingDate = getISTDateString(existingSchedule.eventDate);
        if (requestDate !== existingDate) {
          continue;
        }

        const overlap = isOverlapping(
          existingSchedule.startTime,
          existingSchedule.endTime,
          reqStartTime,
          reqEndTime,
        );

        if (overlap) {
          isBooked = true;
          unavailableVenues.push({
            venueName: venue.venueName,
            status: "Booked",
            dayIndex: venue.dayIndex,
            eventName:
              event.requestDetails?.eventDetails?.eventName || "Existing Event",
            eventId: event._id,
            date: requestDate,
            startTime: existingSchedule.startTime,
            endTime: existingSchedule.endTime,
          });
          break;
        }
      }

      if (isBooked) {
        break;
      }
    }

    if (!isBooked) {
      availableVenues.push({
        venueName: venue.venueName,
        dayIndex: venue.dayIndex,
        status: "Available",
      });
    }
  }

  let status = "AVAILABLE";
  let message = "All selected venues are available.";

  if (unavailableVenues.length > 0 && availableVenues.length > 0) {
    status = "PARTIALLY_AVAILABLE";
    message = "Some selected venues are already booked.";
  } else if (unavailableVenues.length > 0 && availableVenues.length === 0) {
    status = "NOT_AVAILABLE";
    message = "None of the selected venues are available.";
  }

  return {
    available: availableVenues,
    unavailable: unavailableVenues,
    status,
    message,
  };
};

/**
 * Validates venue availability for an event payload.
 * Throws a ValidationError if any venue is already booked.
 *
 * @param {Object} eventData
 * @param {String|ObjectId} [excludeEventId]
 */
const validateVenueAvailability = async (eventData, excludeEventId = null) => {
  if (
    !eventData ||
    !eventData.venueDetails ||
    !Array.isArray(eventData.venueDetails.venues) ||
    eventData.venueDetails.venues.length === 0
  ) {
    return;
  }

  const eventSchedule =
    eventData.requestDetails?.eventDetails?.eventSchedule;

  if (!Array.isArray(eventSchedule) || eventSchedule.length === 0) {
    return;
  }

  const result = await getVenueAvailability({
    eventSchedule,
    venues: eventData.venueDetails.venues,
    excludeEventId,
  });

  if (result.unavailable && result.unavailable.length > 0) {
    const conflictDescriptions = result.unavailable
      .map(
        (u) =>
          `"${u.venueName}" is already booked on ${u.date} (${u.startTime || "N/A"} - ${u.endTime || "N/A"}) for event "${u.eventName}"`,
      )
      .join("; ");

    const error = new Error(
      `Venue availability conflict: ${conflictDescriptions}. Please select another venue or change event timings.`,
    );
    error.name = "ValidationError";
    error.unavailableVenues = result.unavailable;
    throw error;
  }
};

module.exports = {
  getISTDateString,
  timeToMinutes,
  isOverlapping,
  getVenueAvailability,
  validateVenueAvailability,
};
