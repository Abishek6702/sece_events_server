const { baseLayout } = require("./layout");

const closureReminderTemplate = (event, reminderNumber) => {
  const req = event.requestDetails || {};
  const eDetails = req.eventDetails || {};
  
  const eventName = eDetails.eventName || "N/A";
  const iqac = event.iqacNumber || "N/A";
  const orgDept = req.organizingDepartment || "N/A";
  const status = event.status || "N/A";

  const schedules = eDetails.eventSchedule || [];
  const start = schedules.length > 0 ? new Date(schedules[0].eventDate) : null;
  const end = schedules.length > 0 ? new Date(schedules[schedules.length - 1].eventDate) : null;
  
  const startDate = start && !isNaN(start) ? start.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
  const endDate = end && !isNaN(end) ? end.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
  
  const daysSince = end && !isNaN(end) ? Math.floor((new Date() - end) / (1000 * 60 * 60 * 24)) : "N/A";

  let content = `
    <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin-bottom: 20px;">
      <h2 style="color: #e65100; margin-top: 0;">ACTION REQUIRED</h2>
      <p>Please complete the pending event documentation, expenditure, and feedback requirements to officially close this event.</p>
      <p>If already completed, no further action is required.</p>
    </div>

    <div class="event-card">
      <h2 class="event-title">${eventName}</h2>
      <div class="info-grid">
        <div class="info-item"><strong>IQAC Number</strong> ${iqac}</div>
        <div class="info-item"><strong>Organizing Department</strong> ${orgDept}</div>
        <div class="info-item"><strong>Event Dates</strong> ${startDate} - ${endDate}</div>
        <div class="info-item"><strong>Current Status</strong> <span class="badge">${status}</span></div>
        <div class="info-item"><strong>Days Since Completion</strong> ${daysSince} days</div>
        <div class="info-item"><strong>Reminder Sequence</strong> ${reminderNumber} of 3</div>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${process.env.CLIENT_URL || '#'}/event-details/${event._id}" class="cta-button">Open Event Dashboard</a>
    </p>
  `;

  return baseLayout(content, `Reminder ${reminderNumber}: Event Closure Pending - ${eventName}`);
};

module.exports = closureReminderTemplate;
