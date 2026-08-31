const { baseLayout, commonEventHeader } = require("./layout");

const mediaTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Media Requirements</h3>`;
    const mediaDetails = event.mediaRequirementDetails || {};
    const medias = mediaDetails.mediaRequirements || [];
    
    if (medias.length > 0) {
      medias.forEach((media, index) => {
        content += `<div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">`;
        content += `<h4>Media Request ${index + 1}</h4>`;
        
        if (media.poster) {
           content += `<h5 style="color: #0d47a1; margin-bottom: 5px; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">POSTER REQUIREMENTS</h5>`;
           const p = media.poster;
           const delDate = p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
           
           content += `
             <div class="info-grid" style="font-size: 13px;">
               <div class="info-item"><strong>Poster Content</strong> ${p.posterContent || "N/A"}</div>
               <div class="info-item"><strong>Certificate Content</strong> ${p.certificateContent || "N/A"}</div>
               <div class="info-item"><strong>Trophy Content</strong> ${p.trophyContent || "N/A"}</div>
               <div class="info-item"><strong>Display Needed</strong> ${p.displayNeeded ? "Yes" : "No"}</div>
               <div class="info-item"><strong>Delivery Date</strong> ${delDate}</div>
               <div class="info-item"><strong>Priority</strong> ${p.priority || "Normal"}</div>
               <div class="info-item"><strong>Sizes</strong> ${Array.isArray(p.sizes) ? p.sizes.join(", ") : "N/A"}</div>
             </div>
           `;
           if (p.specialRequirements) content += `<p style="font-size: 13px;"><strong>Special Requirements:</strong> ${p.specialRequirements}</p>`;
           
           if (p.assignedStaff && p.assignedStaff.length > 0) {
             content += `<p style="font-size: 13px;"><strong>Assigned Staff:</strong> ` + p.assignedStaff.map(s => `${s.name} (${s.email})`).join(", ") + `</p>`;
           }
           content += `<p style="font-size: 13px;"><strong>Status:</strong> <span class="badge">${p.status || "Pending"}</span></p>`;
           if (p.remarks) content += `<p style="font-size: 13px;"><strong>Remarks:</strong> ${p.remarks}</p>`;
        }
        
        if (media.video) {
           content += `<h5 style="color: #0d47a1; margin-bottom: 5px; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">VIDEO REQUIREMENTS</h5>`;
           const v = media.video;
           const delDate = v.deliveryDate ? new Date(v.deliveryDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
           
           content += `
             <div class="info-grid" style="font-size: 13px;">
               <div class="info-item"><strong>Video Content</strong> ${v.videoContent || "N/A"}</div>
               <div class="info-item"><strong>Pre-Event Videos</strong> ${v.preEventVideos ? "Yes" : "No"}</div>
               <div class="info-item"><strong>Event Coverage</strong> ${v.eventCoverage ? "Yes" : "No"}</div>
               <div class="info-item"><strong>Post-Event Videos</strong> ${v.postEventVideos ? "Yes" : "No"}</div>
               <div class="info-item"><strong>Special Videos</strong> ${v.specialVideos ? "Yes" : "No"}</div>
               <div class="info-item"><strong>Delivery Date</strong> ${delDate}</div>
               <div class="info-item"><strong>Priority</strong> ${v.priority || "Normal"}</div>
             </div>
           `;
           if (v.specialRequirements) content += `<p style="font-size: 13px;"><strong>Special Requirements:</strong> ${v.specialRequirements}</p>`;
           
           if (v.assignedStaff && v.assignedStaff.length > 0) {
             content += `<p style="font-size: 13px;"><strong>Assigned Staff:</strong> ` + v.assignedStaff.map(s => `${s.name} (${s.email})`).join(", ") + `</p>`;
           }
           content += `<p style="font-size: 13px;"><strong>Status:</strong> <span class="badge">${v.status || "Pending"}</span></p>`;
           if (v.remarks) content += `<p style="font-size: 13px;"><strong>Remarks:</strong> ${v.remarks}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific media requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No media-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = mediaTemplate;
