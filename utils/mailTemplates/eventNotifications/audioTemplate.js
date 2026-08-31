const { baseLayout, commonEventHeader } = require("./layout");

const audioTemplate = (events, title) => {
  let content = "";

  events.forEach((event) => {
    content += `<div class="event-card">`;
    content += commonEventHeader(event);
    
    content += `<h3>Audio Requirements</h3>`;
    const audioDetails = event.audioDetails || {};
    const audios = audioDetails.audios || [];
    
    if (audios.length > 0) {
      audios.forEach((audio, index) => {
        content += `
          <div style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <h4>${audio.venueName || `Venue ${index + 1}`} (Day ${audio.dayIndex !== undefined ? audio.dayIndex + 1 : 'N/A'})</h4>`;
        
        if (audio.audioItems && audio.audioItems.length > 0) {
          content += `<ul>`;
          audio.audioItems.forEach(item => {
            content += `<li>${item.type || "N/A"} - Quantity: ${item.quantity || 0}</li>`;
          });
          content += `</ul>`;
        } else {
          content += `<p>No specific audio items listed.</p>`;
        }

        if (audio.otherRequirements) {
          content += `<p><strong>Other Requirements:</strong> ${audio.otherRequirements}</p>`;
        }
        if (audio.specialRequirements) {
          content += `<p><strong>Special Requirements:</strong> ${audio.specialRequirements}</p>`;
        }
        
        content += `</div>`;
      });
    } else {
      content += `<p>No specific audio requirements listed.</p>`;
    }
    
    content += `</div>`;
  });

  if (events.length === 0) {
    content = `<p>No audio-required events for this date.</p>`;
  }

  return baseLayout(content, title);
};

module.exports = audioTemplate;
