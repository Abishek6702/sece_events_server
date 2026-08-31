const Event = require("../models/Event");
const User = require("../models/User");
const sendMail = require("./sendMail");

const venueTemplate = require("./mailTemplates/eventNotifications/venueTemplate");
const ictsTemplate = require("./mailTemplates/eventNotifications/ictsTemplate");
const audioTemplate = require("./mailTemplates/eventNotifications/audioTemplate");
const transportTemplate = require("./mailTemplates/eventNotifications/transportTemplate");
const refreshmentTemplate = require("./mailTemplates/eventNotifications/refreshmentTemplate");
const accommodationTemplate = require("./mailTemplates/eventNotifications/accommodationTemplate");
const purchaseTemplate = require("./mailTemplates/eventNotifications/purchaseTemplate");
const mediaTemplate = require("./mailTemplates/eventNotifications/mediaTemplate");
const externalTransportTemplate = require("./mailTemplates/eventNotifications/externalTransportTemplate");

const DEPARTMENT_CONFIG = {
  Venue: {
    requirementField: "venueRequired",
    templateFunc: venueTemplate,
  },
  ICTS: {
    requirementField: "ictsRequired",
    templateFunc: ictsTemplate,
  },
  Audio: {
    requirementField: "audioRequired",
    templateFunc: audioTemplate,
  },
  Transport: {
    requirementField: "transportRequired",
    templateFunc: transportTemplate,
  },
  Refreshment: {
    requirementField: "refreshmentRequired",
    templateFunc: refreshmentTemplate,
  },
  Food: { // Map Food to Refreshment
    requirementField: "refreshmentRequired",
    templateFunc: refreshmentTemplate,
  },
  Accommodation: {
    requirementField: "accommodationRequired",
    templateFunc: accommodationTemplate,
  },
  Accomadation: { // Map typo to Accommodation
    requirementField: "accommodationRequired",
    templateFunc: accommodationTemplate,
  },
  Purchase: {
    requirementField: "purchaseRequired",
    templateFunc: purchaseTemplate,
  },
  Media: {
    requirementField: "mediaRequired",
    templateFunc: mediaTemplate,
  },
  "External Transport": {
    requirementField: "externalTransportRequired",
    templateFunc: externalTransportTemplate,
  },
};


const sendDailyNotifications = async (targetDateString) => {
  try {
    const isToday = targetDateString === "today";

    const targetDate = new Date();
    if (!isToday) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(targetDate);
    const tzYear = parseInt(parts.find((p) => p.type === "year").value, 10);
    const tzMonth = parseInt(parts.find((p) => p.type === "month").value, 10) - 1;
    const tzDay = parseInt(parts.find((p) => p.type === "day").value, 10);

    const startOfTargetDay = new Date(Date.UTC(tzYear, tzMonth, tzDay, -5, -30, 0, 0));
    const endOfTargetDay = new Date(Date.UTC(tzYear, tzMonth, tzDay, 18, 29, 59, 999));

    const events = await Event.find({
      "requestDetails.eventDetails.eventSchedule.eventDate": {
        $gte: startOfTargetDay,
        $lte: endOfTargetDay,
      },
      status: { $in: ["Approved", "DepartmentReview"] }, 
      isClosed: { $ne: true }
    });

    if (events.length === 0) {
      console.log(`[Event Email] No active events found for ${isToday ? "today" : "tomorrow"}.`);
      return;
    }

    const heads = await User.find({ role: "head" });
    if (heads.length === 0) {
      console.log(`[Event Email] No department heads found in database.`);
      return;
    }

    const dateDisplay = targetDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

    for (const head of heads) {
      const config = DEPARTMENT_CONFIG[head.department];
      
      if (!config) {
        console.log(`[Event Email] Unknown department head mapping for: ${head.department}`);
        continue;
      }

      const relevantEvents = events.filter((ev) => {
        return ev.requestDetails?.requirementDetails?.[config.requirementField] === true;
      });

      if (relevantEvents.length === 0) {
        continue;
      }

      const title = `${head.department} - ${isToday ? "Today's" : "Tomorrow's"} Events - ${dateDisplay}`;
      const htmlContent = config.templateFunc(relevantEvents, title);

      try {
        await sendMail(head.email, title, htmlContent);
        console.log(`[Event Email] Sent ${isToday ? "Today" : "Tomorrow"} email to ${head.department} Head (${head.email}) with ${relevantEvents.length} event(s).`);
      } catch (err) {
        console.error(`[Event Email Error] Failed to send email to ${head.email}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[Event Email Error] Failed to process daily notifications:", error);
  }
};

const sendTodayNotifications = () => sendDailyNotifications("today");
const sendTomorrowNotifications = () => sendDailyNotifications("tomorrow");

module.exports = {
  sendTodayNotifications,
  sendTomorrowNotifications,
};
