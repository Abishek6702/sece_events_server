module.exports = ({ eventName, venueName, eventDate, timing, staffDetails }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #27ae60; padding-bottom: 10px;">
      <h2 style="color: #27ae60; margin: 0;">ICTS Staff Allocated</h2>
    </div>

    <p>Dear Organizer,</p>
    <p>An ICTS staff member has been allocated for your upcoming event at <strong>${venueName}</strong>.</p>

    <h3 style="color: #444; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Event Details</h3>
    <div style="background: #e8f4fd; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Venue:</strong> ${venueName}</p>
      <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
      <p><strong>Timing:</strong> ${timing}</p>
    </div>

    <h3 style="color: #444; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Allocated Staff Details</h3>
    <div style="background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #eee;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${staffDetails.name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${staffDetails.email}</p>
      ${staffDetails.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${staffDetails.phone}</p>` : ''}
    </div>

    <p style="margin-top: 20px; color: #555;">Please coordinate with the allocated staff member for any further requirements or clarifications.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
