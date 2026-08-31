const baseLayout = (content, title = "Event Notification") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          background-color: #ffffff;
          max-width: 700px;
          margin: 0 auto;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #0d47a1;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 20px;
        }
        .footer {
          background-color: #eeeeee;
          text-align: center;
          padding: 15px;
          font-size: 12px;
          color: #666;
        }
        .event-card {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          padding: 15px;
        }
        .event-header {
          border-bottom: 2px solid #0d47a1;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .event-title {
          font-size: 20px;
          font-weight: bold;
          color: #0d47a1;
          margin: 0 0 5px 0;
        }
        h3 {
          color: #0d47a1;
          margin-top: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          background-color: #e3f2fd;
          color: #1976d2;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .cta-button {
          display: inline-block;
          background-color: #0d47a1;
          color: #ffffff;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: bold;
          margin-top: 15px;
        }
        .cta-button:hover {
          background-color: #002171;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        .info-item strong {
          display: block;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated notification from the Event Management System.</p>
          <p>Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const commonEventHeader = (event) => {
  const req = event.requestDetails || {};
  const eDetails = req.eventDetails || {};
  const org = req.organizerDetails || {};

  const eventName = eDetails.eventName || "N/A";
  const iqac = event.iqacNumber || "N/A";
  const orgDept = req.organizingDepartment || "N/A";
  const orgName = org.organizerName || "N/A";
  const orgEmail = org.organizerEmail || "Not provided";
  const orgMobile = org.organizerMobile || "Not provided";
  const eventType = eDetails.eventType || "N/A";
  const status = event.status || "N/A";

  const schedules = eDetails.eventSchedule || [];
  const dates = schedules.map(s => {
    const d = new Date(s.eventDate);
    return isNaN(d) ? "N/A" : d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
  }).join(", ");

  return `
    <div class="event-header">
      <h2 class="event-title">${eventName}</h2>
      <div class="info-grid">
        <div class="info-item"><strong>IQAC Number</strong> ${iqac}</div>
        <div class="info-item"><strong>Event Date(s)</strong> ${dates || "N/A"}</div>
        <div class="info-item"><strong>Department</strong> ${orgDept}</div>
        <div class="info-item"><strong>Event Type</strong> ${eventType}</div>
        <div class="info-item"><strong>Organizer</strong> ${orgName}</div>
        <div class="info-item"><strong>Contact</strong> ${orgEmail} <br/> ${orgMobile !== "Not provided" ? orgMobile : ''}</div>
        <div class="info-item"><strong>Status</strong> <span class="badge">${status}</span></div>
      </div>
    </div>
  `;
};

module.exports = { baseLayout, commonEventHeader };
