const cron = require("node-cron");
const { sendTodayNotifications, sendTomorrowNotifications } = require("./dailyNotifications");
const { processClosureReminders } = require("./closureReminders");

const initCronJobs = () => {
  // Morning Email - 6:00 AM IST
  cron.schedule("0 6 * * *", async () => {
    console.log("[Cron] Running morning notifications job at 6:00 AM IST...");
    await sendTodayNotifications();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Evening Email - 6:00 PM IST
  cron.schedule("0 18 * * *", async () => {
    console.log("[Cron] Running evening notifications job at 6:00 PM IST...");
    await sendTomorrowNotifications();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Closure Reminder Job - 6:30 AM IST
  cron.schedule("30 6 * * *", async () => {
    console.log("[Cron] Running closure reminders job at 6:30 AM IST...");
    await processClosureReminders();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log("[Cron] Scheduled event daily email notification and closure reminder cron jobs in Asia/Kolkata timezone.");
};

module.exports = {
  initCronJobs
};
