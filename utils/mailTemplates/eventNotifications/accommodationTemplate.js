const { baseLayout, commonEventHeader } = require("./layout");

const accommodationTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Accommodation Requirements</h3>`;
    const accommodationDetails = event.accommodationDetails || {};
    const accommodations = accommodationDetails.accommodations || [];
    
    if (accommodations.length > 0) {
      accommodations.forEach((acc, index) => {
        const checkIn = acc.checkInDateTime ? new Date(acc.checkInDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        const checkOut = acc.checkOutDateTime ? new Date(acc.checkOutDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>Booking ${index + 1}</h4>
            <div class="info-grid">
              <div class="info-item"><strong>Check-in</strong> ${checkIn}</div>
              <div class="info-item"><strong>Check-out</strong> ${checkOut}</div>
              <div class="info-item"><strong>Total Guests</strong> ${acc.totalGuests || 0}</div>
              <div class="info-item"><strong>Dine-in Required</strong> ${acc.dineInRequired ? "Yes" : "No"}</div>
            </div>`;
            
        if (acc.dineInRequired && acc.dineIn) {
          content += `<p style="margin-bottom: 2px;"><strong>Dine-in Counts:</strong></p><ul>`;
          content += `<li>Breakfast: ${acc.dineIn.breakfast || 0}</li>`;
          content += `<li>Lunch: ${acc.dineIn.lunch || 0}</li>`;
          content += `<li>Dinner: ${acc.dineIn.dinner || 0}</li>`;
          content += `</ul>`;
        }

        if (acc.guestDetails && acc.guestDetails.length > 0) {
          content += `<h5 style="margin-bottom: 5px;">Guest Details</h5><ul>`;
          acc.guestDetails.forEach(g => {
            content += `<li>${g.name || "N/A"} - ${g.mobile || "N/A"} (${g.designation || "N/A"})</li>`;
          });
          content += `</ul>`;
        }

        if (acc.roomSelections && acc.roomSelections.length > 0) {
          content += `<h5 style="margin-bottom: 5px;">Room Allocation</h5>`;
          content += `<table>
            <thead>
              <tr>
                <th>Room No</th>
                <th>Venue</th>
                <th>Occupants</th>
                <th>Admin Confirmation</th>
              </tr>
            </thead>
            <tbody>`;
            
          acc.roomSelections.forEach(room => {
            content += `<tr>
              <td>${room.roomNumber || room.roomId || "N/A"}</td>
              <td>${room.venue || "N/A"}</td>
              <td>${room.occupantCount || 0}</td>
              <td>${room.adminContacted ? "Contacted" : "Not Contacted"}</td>
            </tr>`;
          });
          
          content += `</tbody></table>`;
          content += `<p><strong>Total Rooms:</strong> ${acc.roomSelections.length}</p>`;
        } else {
          content += `<p>No rooms selected.</p>`;
        }

        if (acc.specialRequirements) {
          content += `<p><strong>Special Requirements:</strong> ${acc.specialRequirements}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific accommodation requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No accommodation-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = accommodationTemplate;
