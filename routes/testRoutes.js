const express = require("express");
const router = express.Router();

const generateIQACNumber = require("../utils/generateIQACNumber");

const { sendTodayNotifications, sendTomorrowNotifications } = require("../utils/dailyNotifications");
const { processClosureReminders } = require("../utils/closureReminders");

router.get("/test", async (req, res) => {
  const iqac = await generateIQACNumber("CSE");

  res.json({
    iqac,
  });
});

router.post("/notifications/today", async (req, res) => {
  try {
    await sendTodayNotifications();
    res.json({ message: "Today's notifications trigger completed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/notifications/tomorrow", async (req, res) => {
  try {
    await sendTomorrowNotifications();
    res.json({ message: "Tomorrow's notifications trigger completed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/notifications/reminders", async (req, res) => {
  try {
    await processClosureReminders();
    res.json({ message: "Closure reminders trigger completed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;