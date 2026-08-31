const { baseLayout, commonEventHeader } = require("./layout");

const ictsTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>ICTS Requirements</h3>`;
    const ictsDetails = event.ictsDetails || {};
    const ictses = ictsDetails.ictses || [];
    
    if (ictses.length > 0) {
      ictses.forEach((icts, index) => {
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>${icts.venueName || `Venue ${index + 1}`} (Day ${icts.dayIndex !== undefined ? icts.dayIndex + 1 : 'N/A'})</h4>
            <div class="info-grid">
              <div class="info-item"><strong>Internet Facility</strong> ${icts.internetFacility ? "Yes" : "No"}</div>
              <div class="info-item"><strong>Expected Internet Users</strong> ${icts.expectedInternetUsers || 0}</div>
              <div class="info-item"><strong>Proctoring Users</strong> ${icts.proctoringUsers || 0}</div>
              <div class="info-item"><strong>Guest Wi-Fi Needed</strong> ${icts.guestWifiNeeded ? "Yes" : "No"}</div>
              <div class="info-item"><strong>Total Guest Count</strong> ${icts.totalGuestCount || 0}</div>
            </div>`;
        
        if (icts.laptopNeeded && icts.laptops && icts.laptops.length > 0) {
          content += `<h5 style="margin-bottom: 5px;">Laptops Required</h5><ul>`;
          icts.laptops.forEach(lap => {
            content += `<li>${lap.specifications || "N/A"} - Quantity: ${lap.count || 0}</li>`;
          });
          content += `</ul>`;
        }

        if (icts.otherRequirements) {
          content += `<p><strong>Other Requirements:</strong> ${icts.otherRequirements}</p>`;
        }
        if (icts.specialRequirements) {
          content += `<p><strong>Special Requirements:</strong> ${icts.specialRequirements}</p>`;
        }
        
        if (icts.assignedStaff && icts.assignedStaff.length > 0) {
          content += `<h5 style="margin-bottom: 5px; margin-top: 15px;">Assigned ICTS Staff</h5>
            <table style="font-size: 13px;">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>`;
          icts.assignedStaff.forEach(staff => {
            content += `<tr>
              <td>${staff.name || "N/A"}</td>
              <td>${staff.email || "N/A"}</td>
              <td>${staff.phone || "N/A"}</td>
              <td>${staff.designation || "N/A"}</td>
            </tr>`;
          });
          content += `</tbody></table>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific ICTS requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No ICTS-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = ictsTemplate;
