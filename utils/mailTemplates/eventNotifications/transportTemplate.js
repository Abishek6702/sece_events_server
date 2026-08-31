const { baseLayout, commonEventHeader } = require("./layout");

const transportTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Transport Requirements</h3>`;
    const transportDetails = event.transportDetails || {};
    const transports = transportDetails.transports || [];
    
    if (transports.length > 0) {
      transports.forEach((transport, index) => {
        const pDate = transport.pickupDateTime ? new Date(transport.pickupDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        const dDate = transport.dropDateTime ? new Date(transport.dropDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>Trip ${index + 1}</h4>
            <div class="info-grid">
              <div class="info-item"><strong>Pickup Date & Time</strong> ${pDate}</div>
              <div class="info-item"><strong>Drop Date & Time</strong> ${dDate}</div>
              <div class="info-item"><strong>Pickup Location</strong> ${transport.pickupLocation || "N/A"}</div>
              <div class="info-item"><strong>Drop Location</strong> ${transport.dropLocation || "N/A"}</div>
              <div class="info-item"><strong>Total Passengers</strong> ${transport.passengersCount || 0}</div>
            </div>`;
            
        if (transport.checkpoints && transport.checkpoints.length > 0) {
          content += `<p style="margin-bottom: 2px;"><strong>Checkpoints:</strong></p><ul>`;
          transport.checkpoints.forEach(cp => {
            content += `<li>${cp.location}</li>`;
          });
          content += `</ul>`;
        }

        if (transport.vehicles && transport.vehicles.length > 0) {
          content += `<p style="margin-bottom: 2px;"><strong>Vehicles Required:</strong></p><ul>`;
          transport.vehicles.forEach(v => {
            content += `<li>${v.vehicleType} - Quantity: ${v.count}</li>`;
          });
          content += `</ul>`;
        }

        if (transport.accompanyingStaff && transport.accompanyingStaff.length > 0) {
          content += `<p style="margin-bottom: 2px;"><strong>Accompanying Staff:</strong></p><ul>`;
          transport.accompanyingStaff.forEach(staff => {
            content += `<li>${staff.name} (${staff.mobile || "N/A"})</li>`;
          });
          content += `</ul>`;
        }

        if (transport.specialRequirements) {
          content += `<p><strong>Special Requirements:</strong> ${transport.specialRequirements}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific transport requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No transport-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = transportTemplate;
