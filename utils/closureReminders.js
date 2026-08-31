const Event = require("../models/Event");
const Faculty = require("../models/Faculty");
const sendMail = require("./sendMail");
const closureReminderTemplate = require("./mailTemplates/eventNotifications/closureReminderTemplate");

const getISTDateWithoutTime = (dateObj) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(dateObj);
  const tzYear = parseInt(parts.find((p) => p.type === "year").value, 10);
  const tzMonth = parseInt(parts.find((p) => p.type === "month").value, 10) - 1;
  const tzDay = parseInt(parts.find((p) => p.type === "day").value, 10);
  return new Date(Date.UTC(tzYear, tzMonth, tzDay, 0, 0, 0, 0));
};

const processClosureReminders = async () => {
  try {
    const todayIST = getISTDateWithoutTime(new Date());

    // Fetch active/approved events that are NOT closed
    const events = await Event.find({
      status: { $in: ["Approved", "DepartmentReview"] },
      isClosed: { $ne: true }
    }).populate("organizerId");

    for (const event of events) {
      const schedule = event.requestDetails?.eventDetails?.eventSchedule || [];
      if (schedule.length === 0) continue;

      // Find the last event date
      const sortedSchedule = [...schedule].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
      const lastEventDateRaw = sortedSchedule[sortedSchedule.length - 1].eventDate;
      if (!lastEventDateRaw) continue;

      const lastEventDateIST = getISTDateWithoutTime(new Date(lastEventDateRaw));

      // Calculate days difference
      const diffTime = todayIST.getTime() - lastEventDateIST.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let reminderNumber = 0;
      if (diffDays === 5) {
        reminderNumber = 1;
      } else if (diffDays === 10) {
        reminderNumber = 2;
      } else if (diffDays === 15) {
        reminderNumber = 3;
      }

      if (reminderNumber === 0) continue;

      // Check if reminder was already sent
      const alreadySent = event.closureReminders?.some(r => r.reminderNumber === reminderNumber);
      if (alreadySent) continue;

      const organizer = event.organizerId;
      if (!organizer || !organizer.email) {
        console.warn(`[Closure Reminder] Cannot send reminder to Event ${event.iqacNumber || event._id} - Organizer faculty/email not found.`);
        continue;
      }

      const subject = `Reminder ${reminderNumber}: Event Closure Pending - ${event.requestDetails?.eventDetails?.eventName || "Event"}`;
      const htmlContent = closureReminderTemplate(event, reminderNumber);

      try {
        await sendMail(organizer.email, subject, htmlContent);
        
        // Record that this reminder has been sent
        event.closureReminders.push({
          reminderNumber,
          sentAt: new Date()
        });
        await event.save();

        console.log(`[Closure Reminder] Sent reminder ${reminderNumber} to ${organizer.email} for Event ${event.iqacNumber || event._id}.`);
      } catch (err) {
        console.error(`[Closure Reminder Error] Failed to send to ${organizer.email} for Event ${event.iqacNumber || event._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[Closure Reminder Error] Failed to process closure reminders:", error);
  }
};

module.exports = {
  processClosureReminders
};
