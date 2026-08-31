const { baseLayout, commonEventHeader } = require("./layout");

const refreshmentTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Refreshment / Food Requirements</h3>`;
    const refreshmentDetails = event.refreshmentDetails || {};
    const refreshments = refreshmentDetails.refreshments || [];
    
    if (refreshments.length > 0) {
      refreshments.forEach((ref, index) => {
        const refDate = ref.date ? new Date(ref.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "long", year: "numeric" }) : "N/A";
        
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>Date: ${refDate}</h4>
            <div class="info-grid">
              <div class="info-item"><strong>Resource Person Type</strong> ${Array.isArray(ref.resourcePersonType) ? ref.resourcePersonType.join(", ") : "N/A"}</div>
              <div class="info-item"><strong>Num. Resource Persons</strong> ${ref.numberOfResourcePersons || 0}</div>
              <div class="info-item"><strong>Num. Accompanying Staff</strong> ${ref.numberOfInternalAccompanyingStaff || 0}</div>
            </div>`;
            
        if (ref.accompanyingStaff && ref.accompanyingStaff.length > 0) {
          content += `<p style="margin-bottom: 2px;"><strong>Accompanying Staff:</strong></p><ul>`;
          ref.accompanyingStaff.forEach(staff => {
            content += `<li>${staff.name} (${staff.mobile || "N/A"})</li>`;
          });
          content += `</ul>`;
        }

        if (ref.foodTypes && ref.foodTypes.length > 0) {
          ref.foodTypes.forEach(ft => {
            content += `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
              <h5 style="margin: 0 0 10px 0; color: #0d47a1;">${ft.type || "N/A"}</h5>
              
              <div class="info-grid" style="font-size: 13px;">
                <div class="info-item">
                  <strong>Participants</strong>
                  Veg: ${ft.participants?.vegCount || 0} <br/>
                  Non-Veg: ${ft.participants?.nonVegCount || 0}
                </div>
                <div class="info-item">
                  <strong>VIP Guests</strong>
                  Veg: ${ft.vipGuests?.vegCount || 0} <br/>
                  Non-Veg: ${ft.vipGuests?.nonVegCount || 0}
                </div>
                <div class="info-item">
                  <strong>Trainer</strong>
                  Veg: ${ft.trainer?.vegCount || 0} <br/>
                  Non-Veg: ${ft.trainer?.nonVegCount || 0}
                </div>
                <div class="info-item">
                  <strong>Refreshment Count</strong>
                  ${ft.refreshmentCount || 0}
                </div>
              </div>
            </div>`;
          });
        }

        if (ref.specialRequirements) {
          content += `<p style="margin-top: 10px;"><strong>Special Requirements:</strong> ${ref.specialRequirements}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific refreshment requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No refreshment-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = refreshmentTemplate;
