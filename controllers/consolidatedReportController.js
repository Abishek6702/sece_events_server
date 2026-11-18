const Event = require("../models/Event");

const startOfDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const dateKey = (value) => startOfDay(value).toISOString().slice(0, 10);

const getDateRange = (req, res) => {
  const { fromDate, toDate } = req.query;
  if (!fromDate || !toDate) {
    res
      .status(400)
      .json({
        success: false,
        message: "fromDate and toDate are required (YYYY-MM-DD).",
      });
    return null;
  }
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    res
      .status(400)
      .json({
        success: false,
        message:
          "Provide a valid date range where fromDate is on or before toDate.",
      });
    return null;
  }
  return { from: startOfDay(from), to: startOfDay(to) };
};

const daysBetween = (fromValue, toValue, range) => {
  if (!fromValue) return [];
  const from = startOfDay(fromValue);
  const to = startOfDay(toValue || fromValue);
  if (to < range.from || from > range.to || to < from) return [];
  const first = from > range.from ? from : range.from;
  const last = to < range.to ? to : range.to;
  const days = [];
  for (
    const current = new Date(first);
    current <= last;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    days.push(dateKey(current));
  }
  return days;
};

const number = (value) => Number(value) || 0;
const sumCounts = (foodTypes, key) =>
  (foodTypes || []).reduce((total, item) => {
    const groups = ["participants", "vipGuests", "trainer", "placement"];
    return (
      total +
      groups.reduce(
        (groupTotal, group) => groupTotal + number(item[group]?.[key]),
        0,
      )
    );
  }, 0);
const mealCount = (foodTypes, mealName) =>
  (foodTypes || [])
    .filter((item) => new RegExp(mealName, "i").test(item.type || ""))
    .reduce(
      (total, item) =>
        total +
        ["participants", "vipGuests", "trainer", "placement"].reduce(
          (n, group) =>
            n +
            number(item[group]?.vegCount) +
            number(item[group]?.nonVegCount),
          0,
        ),
      0,
    );

const eventSummary = (event) => ({
  eventId: event._id,
  eventName: event.requestDetails?.eventDetails?.eventName || "",
  organizer: {
    name:
      event.organizerId?.name ||
      [event.organizerId?.firstName, event.organizerId?.lastName]
        .filter(Boolean)
        .join(" "),
    email: event.organizerId?.email || "",
    phone: event.organizerId?.phone || "",
  },
  organizingDepartment:
    event.requestDetails?.organizerDetails?.organizingDepartment || "",
});

const getEvents = () =>
  Event.find({
    status: { $in: ["Approved", "Closed"] },
    isDeleted: { $ne: true },
  })
    .populate("organizerId", "name firstName lastName email phone")
    .lean();

exports.getConsolidatedFoodReport = async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;
  try {
    const events = await getEvents();
    const days = new Map();
    for (const event of events) {
      const refreshments = event.refreshmentDetails?.refreshments || [];
      if (
        !refreshments.length &&
        !event.requestDetails?.requirementDetails?.refreshmentRequired
      )
        continue;
      for (const refreshment of refreshments) {
        const refreshmentDays = daysBetween(
          refreshment.fromDate,
          refreshment.toDate,
          range,
        );
        for (const day of refreshmentDays) {
          if (!days.has(day)) days.set(day, new Map());
          const byEvent = days.get(day);
          if (!byEvent.has(String(event._id)))
            byEvent.set(String(event._id), {
              ...eventSummary(event),
              foodDetails: [],
            });
          const foodTypes = refreshment.foodTypes || [];
          byEvent.get(String(event._id)).foodDetails.push({
            resourcePersonType: refreshment.resourcePersonType || [],
            numberOfResourcePersons: number(
              refreshment.numberOfResourcePersons,
            ),
            numberOfInternalAccompanyingStaff: number(
              refreshment.numberOfInternalAccompanyingStaff,
            ),
            breakfastCount: mealCount(foodTypes, "breakfast"),
            lunchCount: mealCount(foodTypes, "lunch"),
            dinnerCount: mealCount(foodTypes, "dinner"),
            vegCount: sumCounts(foodTypes, "vegCount"),
            nonVegCount: sumCounts(foodTypes, "nonVegCount"),
            foodTypes,
            diningPlaces: foodTypes.flatMap((item) =>
              (item.venueWiseDetails || []).map((venue) => ({
                foodType: item.type || "",
                place: venue.venueName || "",
                count: number(venue.count),
              })),
            ),
            specialRequirements: refreshment.specialRequirements || "",
          });
        }
      }
    }
    const data = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, byEvent]) => ({
        date,
        eventCount: byEvent.size,
        events: [...byEvent.values()],
      }));
    res.json({
      success: true,
      fromDate: dateKey(range.from),
      toDate: dateKey(range.to),
      data,
    });
  } catch (error) {
    console.error("Consolidated food report error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to generate consolidated food report.",
      });
  }
};

exports.getConsolidatedAccommodationReport = async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;
  try {
    const events = await getEvents();
    const days = new Map();
    for (const event of events) {
      const accommodations = event.accommodationDetails?.accommodations || [];
      for (const accommodation of accommodations) {
        const accommodationDays = daysBetween(
          accommodation.checkInDateTime,
          accommodation.checkOutDateTime,
          range,
        );
        for (const day of accommodationDays) {
          if (!days.has(day)) days.set(day, new Map());
          const byEvent = days.get(day);
          if (!byEvent.has(String(event._id)))
            byEvent.set(String(event._id), {
              ...eventSummary(event),
              accommodationDetails: [],
            });
          byEvent.get(String(event._id)).accommodationDetails.push({
            checkInDateTime: accommodation.checkInDateTime || null,
            checkOutDateTime: accommodation.checkOutDateTime || null,
            guestCount: (accommodation.guests || []).length,
            guests: accommodation.guests || [],
            roomSelections: accommodation.roomSelections || [],
            dineInRequired: Boolean(accommodation.dineInRequired),
            dineInCounts: accommodation.dineInCounts || [],
            specialRequirements: accommodation.specialRequirements || "",
          });
        }
      }
    }
    const data = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, byEvent]) => ({
        date,
        eventCount: byEvent.size,
        events: [...byEvent.values()],
      }));
    res.json({
      success: true,
      fromDate: dateKey(range.from),
      toDate: dateKey(range.to),
      data,
    });
  } catch (error) {
    console.error("Consolidated accommodation report error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to generate consolidated accommodation report.",
      });
  }
};
