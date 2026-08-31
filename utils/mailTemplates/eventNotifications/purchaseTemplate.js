const { baseLayout, commonEventHeader } = require("./layout");

const purchaseTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Purchase Requirements</h3>`;
    const purchaseDetails = event.purchaseDetails || {};
    const purchases = purchaseDetails.purchases || [];
    
    if (purchases.length > 0) {
      purchases.forEach((pur, index) => {
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>Purchase ${index + 1} (Day ${pur.dayIndex !== undefined ? pur.dayIndex + 1 : 'N/A'})</h4>
            <p><strong>Requirement Needed:</strong> ${Array.isArray(pur.requirementNeeded) ? pur.requirementNeeded.join(", ") : "N/A"}</p>
            <div class="info-grid">
              <div class="info-item"><strong>Hard Count</strong> ${pur.hardCount || 0}</div>
              <div class="info-item"><strong>Soft Count</strong> ${pur.softCount || 0}</div>
              <div class="info-item"><strong>Required For</strong> ${Array.isArray(pur.requiredFor) ? pur.requiredFor.join(", ") : "N/A"}</div>
            </div>`;
            
        if (pur.students) {
          content += `<h5 style="color: #0d47a1; margin-bottom: 5px; margin-top: 15px;">STUDENT REQUIREMENTS</h5>`;
          content += `<div class="info-grid" style="font-size: 13px;">
            <div class="info-item"><strong>Gift Items</strong> ${Array.isArray(pur.students.giftItems) ? pur.students.giftItems.join(", ") : "None"}</div>
            <div class="info-item"><strong>Trophy</strong> ${pur.students.trophyType || "None"} (Qty: ${pur.students.trophyQuantity || 0})</div>
            <div class="info-item"><strong>Cash Prize</strong> Rs. ${pur.students.cashPrizeAmount || 0}</div>
            <div class="info-item"><strong>Vouchers</strong> Worth Rs. ${pur.students.voucherWorth || 0} (Qty: ${pur.students.voucherQuantity || 0})</div>
            <div class="info-item"><strong>Reg Kit</strong> ${pur.students.registrationKitRequired ? "Yes" : "No"} (Qty: ${pur.students.registrationKitQuantity || 0})</div>
          </div>`;
          if (pur.students.specialRequirements) {
             content += `<p style="font-size: 13px;"><strong>Special Req:</strong> ${pur.students.specialRequirements}</p>`;
          }
        }

        if (pur.guests) {
          content += `<h5 style="color: #0d47a1; margin-bottom: 5px; margin-top: 15px;">GUEST REQUIREMENTS</h5>`;
          content += `<div class="info-grid" style="font-size: 13px;">
            <div class="info-item"><strong>Gift Items</strong> ${Array.isArray(pur.guests.giftItems) ? pur.guests.giftItems.join(", ") : "None"} (Qty: ${pur.guests.giftQuantity || 0})</div>
            <div class="info-item"><strong>Trophy</strong> ${pur.guests.trophyType || "None"} (Qty: ${pur.guests.trophyQuantity || 0})</div>
            <div class="info-item"><strong>Vouchers</strong> Worth Rs. ${pur.guests.voucherWorth || 0} (Qty: ${pur.guests.voucherQuantity || 0})</div>
            <div class="info-item"><strong>Reg Kit</strong> ${pur.guests.registrationKitRequired ? "Yes" : "No"} (Qty: ${pur.guests.registrationKitQuantity || 0})</div>
          </div>`;
          if (pur.guests.specialRequirements) {
             content += `<p style="font-size: 13px;"><strong>Special Req:</strong> ${pur.guests.specialRequirements}</p>`;
          }
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific purchase requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No purchase-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = purchaseTemplate;
