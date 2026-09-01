const Event = require("../models/Event");
const AccommodationRoom = require("../models/AccommodationRoom");

/**
 * Convert Date to IST calendar date.
 *
 * Returns:
 * {
 *   year,
 *   month,
 *   day
 * }
 */
const getISTCalendarDate = (date) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  }

  return {
    year: result.year,
    month: result.month,
    day: result.day,
  };
};

/**
 * Check whether existingEnd is on the
 * calendar day immediately before requestedStart.
 *
 * Example:
 *
 * Existing:
 * Sunday 09:00 -> 18:00
 *
 * Requested:
 * Monday 09:00 -> 13:00
 *
 * Returns true.
 */
const isPreviousCalendarDay = (
  existingEnd,
  requestedStart
) => {
  const existing = getISTCalendarDate(existingEnd);
  const requested = getISTCalendarDate(requestedStart);

  const existingDate = Date.UTC(
    existing.year,
    existing.month - 1,
    existing.day
  );

  const requestedDate = Date.UTC(
    requested.year,
    requested.month - 1,
    requested.day
  );

  const differenceInDays =
    (requestedDate - existingDate) /
    (1000 * 60 * 60 * 24);

  return differenceInDays === 1;
};
const getISTStartOfPreviousDay = (date) => {
  const { year, month, day } = getISTCalendarDate(date);

  // Previous calendar day at 00:00 IST
  // IST = UTC + 5:30
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day - 1,
      0,
      0,
      0
    ) - 5.5 * 60 * 60 * 1000
  );
};
/**
 * Get room availability for requested date/time.
 *
 * Rules:
 *
 * 1. Actual overlapping booking:
 *    Room is excluded from result.
 *
 * 2. Existing booking ends exactly when requested
 *    booking starts:
 *    Room is returned but requires admin confirmation.
 *
 * 3. Existing booking is on the previous calendar day:
 *    Room is returned but requires admin confirmation.
 *
 * 4. Draft / Rejected / Admin Cancelled / Closed
 *    events do not block rooms.
 *
 * 5. Occupant count is NOT checked here.
 *    Multiple rooms can be selected for multiple guests.
 */
const getAvailableRooms = async ({
  startDateTime,
  endDateTime,
  excludeEventId,
}) => {
  const reqStart = new Date(startDateTime);
  const reqEnd = new Date(endDateTime);
  const previousDayStart = getISTStartOfPreviousDay(reqStart);
  // --------------------------------------------------
  // 1. Get all active rooms
  // --------------------------------------------------

  const allActiveRooms = await AccommodationRoom.find({
    isActive: true,
  }).lean();

  // --------------------------------------------------
  // 2. Find Events that could affect availability
  // --------------------------------------------------

  const query = {
    status: {
      $nin: [
        "Rejected",
        "Admin Cancelled",
        "Draft",
        "Closed",
      ],
    },
  
    "accommodationDetails.accommodations": {
      $elemMatch: {
        /*
         * Fetch:
         *
         * 1. Actual overlapping bookings
         * 2. Back-to-back bookings
         * 3. Bookings from the previous calendar day
         */
  
        checkOutDateTime: {
          $gte: previousDayStart,
        },
  
        checkInDateTime: {
          $lt: reqEnd,
        },
      },
    },
  };
  // --------------------------------------------------
  // 3. Exclude current Event while editing
  // --------------------------------------------------

  if (excludeEventId) {
    query._id = {
      $ne: excludeEventId,
    };
  }

  const overlappingEvents = await Event.find(query)
    .select("accommodationDetails")
    .lean();

  // --------------------------------------------------
  // 4. Track room states
  // --------------------------------------------------

  // Completely unavailable because of actual overlap
  const bookedRoomIds = new Set();

  // Available only after admin confirmation
  const adminConfirmationRoomIds = new Set();

  // --------------------------------------------------
  // 5. Process existing Event accommodations
  // --------------------------------------------------

  for (const event of overlappingEvents) {
    const accommodations =
      event.accommodationDetails?.accommodations || [];

    for (const accommodation of accommodations) {
      if (
        !accommodation.checkInDateTime ||
        !accommodation.checkOutDateTime
      ) {
        continue;
      }

      const accStart = new Date(
        accommodation.checkInDateTime
      );

      const accEnd = new Date(
        accommodation.checkOutDateTime
      );

      // ------------------------------------------------
      // Rule 1: Actual time overlap
      // ------------------------------------------------

      /*
       * Example:
       *
       * Existing: 09:00 -> 10:00
       * Request:  09:30 -> 13:00
       *
       * TRUE
       */
      const hasActualOverlap =
        accStart < reqEnd &&
        accEnd > reqStart;

      // ------------------------------------------------
      // Rule 2: Exact back-to-back
      // ------------------------------------------------

      /*
       * Example:
       *
       * Existing: 09:00 -> 10:00
       * Request:  10:00 -> 13:00
       *
       * TRUE
       */
      const isBackToBack =
        accEnd.getTime() === reqStart.getTime();

      // ------------------------------------------------
      // Rule 3: Previous calendar day
      // ------------------------------------------------

      /*
       * Example:
       *
       * Existing:
       * Sunday 09:00 -> 18:00
       *
       * Request:
       * Monday 09:00 -> 13:00
       *
       * TRUE
       */
      const isPreviousDay =
        isPreviousCalendarDay(
          accEnd,
          reqStart
        );

      const roomSelections =
        accommodation.roomSelections || [];

      // ------------------------------------------------
      // 6. Process rooms from this accommodation
      // ------------------------------------------------

      for (const selection of roomSelections) {
        if (!selection.roomId) {
          continue;
        }

        const roomId =
          selection.roomId.toString();

        // ----------------------------------------------
        // Highest priority:
        // Actual overlap
        // ----------------------------------------------

        if (hasActualOverlap) {
          bookedRoomIds.add(roomId);

          /*
           * If this room was previously marked for
           * admin confirmation, actual overlap wins.
           */
          adminConfirmationRoomIds.delete(
            roomId
          );

          continue;
        }

        // ----------------------------------------------
        // Back-to-back OR previous calendar day
        // ----------------------------------------------

        if (isBackToBack || isPreviousDay) {
          /*
           * Only add if it isn't actually booked.
           *
           * Actual overlap has higher priority.
           */
          if (!bookedRoomIds.has(roomId)) {
            adminConfirmationRoomIds.add(
              roomId
            );
          }
        }
      }
    }
  }

  // --------------------------------------------------
  // 7. Build final room response
  // --------------------------------------------------

  const result = allActiveRooms
    .filter((room) => {
      /*
       * Actual overlapping rooms are completely
       * removed from the availability list.
       */
      return !bookedRoomIds.has(
        room._id.toString()
      );
    })
    .map((room) => {
      const roomId =
        room._id.toString();

      // ----------------------------------------------
      // Admin confirmation required
      // ----------------------------------------------

      if (
        adminConfirmationRoomIds.has(roomId)
      ) {
        return {
          roomId: room._id,
          venue: room.venue,
          roomNumber: room.roomNumber,
          capacity: room.capacity,

          available: false,

          requiresAdminConfirmation: true,

          message:
            "This room was occupied immediately before the requested time. Please contact the admin team to confirm room availability.",
        };
      }

      // ----------------------------------------------
      // Completely available
      // ----------------------------------------------

      return {
        roomId: room._id,
        venue: room.venue,
        roomNumber: room.roomNumber,
        capacity: room.capacity,

        available: true,

        requiresAdminConfirmation: false,

        message: null,
      };
    });

  // --------------------------------------------------
  // 8. Sort by venue and room number
  // --------------------------------------------------

  result.sort((a, b) => {
    if (a.venue === b.venue) {
      return a.roomNumber.localeCompare(
        b.roomNumber,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );
    }

    return a.venue.localeCompare(
      b.venue
    );
  });

  return result;
};

module.exports = {
  getAvailableRooms,
};