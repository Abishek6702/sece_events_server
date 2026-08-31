const { baseLayout, commonEventHeader } = require("./layout");

const externalTransportTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>External Transport Requirements</h3>`;
    const externalDetails = event.externalTransportDetails || {};
    const externalTransports = externalDetails.externalTransports || [];
    
    if (externalTransports.length > 0) {
      externalTransports.forEach((ext, index) => {
        const tDate = ext.travelDate ? new Date(ext.travelDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>Travel Segment ${index + 1}</h4>
            <div class="info-grid">
              <div class="info-item"><strong>Travel Option</strong> ${ext.travelOption || "N/A"}</div>
              <div class="info-item"><strong>Travel Date</strong> ${tDate}</div>
              <div class="info-item"><strong>From</strong> ${ext.from || "N/A"}</div>
              <div class="info-item"><strong>To</strong> ${ext.to || "N/A"}</div>
              <div class="info-item"><strong>Class / Berth</strong> ${Array.isArray(ext.classOrBerth) ? ext.classOrBerth.join(", ") : "N/A"}</div>
              <div class="info-item"><strong>Flight No.</strong> ${ext.flightNumber || "N/A"}</div>
              <div class="info-item"><strong>Train No.</strong> ${ext.trainNumber || "N/A"}</div>
              <div class="info-item"><strong>Total Passengers</strong> ${ext.totalPassengers || 0}</div>
            </div>`;

        if (ext.passengers && ext.passengers.length > 0) {
          content += `<h5 style="margin-bottom: 5px; margin-top: 15px;">Passenger Details</h5>
            <table style="font-size: 13px;">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Age/Gender</th>
                  <th>Designation / Org</th>
                </tr>
              </thead>
              <tbody>`;
          ext.passengers.forEach(p => {
            content += `<tr>
              <td>${p.name || "N/A"}</td>
              <td>${p.phone || "N/A"}<br/>${p.email || "N/A"}</td>
              <td>${p.age || "N/A"} / ${p.gender || "N/A"}</td>
              <td>${p.designation || "N/A"}<br/>${p.organization || "N/A"}</td>
            </tr>`;
          });
          content += `</tbody></table>`;
        }

        if (ext.specialRequirements) {
          content += `<p><strong>Special Requirements:</strong> ${ext.specialRequirements}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific external transport requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No external transport-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = externalTransportTemplate;
