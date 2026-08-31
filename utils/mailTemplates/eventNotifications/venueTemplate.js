const { baseLayout, commonEventHeader } = require("./layout");

const venueTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Venue Requirements</h3>`;
    const venueDetails = event.venueDetails || {};
    const venues = venueDetails.venues || [];
    const participants = event.requestDetails?.requirementDetails?.totalParticipants || "N/A";
    
    content += `<p><strong>Total Participants Expected:</strong> ${participants}</p>`;
    
    if (venues.length > 0) {
      content += `<table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Venue Name</th>
            <th>Participants</th>
            <th>Seating Capacity</th>
            <th>Hall Requirements</th>
            <th>Special Requirements</th>
          </tr>
        </thead>
        <tbody>`;
      
      venues.forEach((v) => {
        content += `<tr>
          <td>${v.dayIndex !== undefined ? `Day ${v.dayIndex + 1}` : "N/A"}</td>
          <td>${v.venueName || "N/A"}</td>
          <td>${v.numberOfParticipants || "N/A"}</td>
          <td>${v.seatingCapacity || "N/A"}</td>
          <td>${Array.isArray(v.hallRequirements) ? v.hallRequirements.join(", ") : "N/A"}</td>
          <td>${v.specialRequirements || "N/A"}</td>
        </tr>`;
      });
      content += `</tbody></table>`;
    } else {
      content += `<p>No specific venues listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No venue-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = venueTemplate;
