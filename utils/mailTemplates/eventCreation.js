module.exports = ({ eventName, organizerName, organizingDepartment, eventDate }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #2c3e50; padding-bottom: 10px;">
      <h2 style="color: #2c3e50; margin: 0;">New Event Created</h2>
    </div>

    <p>Dear Team,</p>
    <p>A new event has been created and requires your attention.</p>

    <div style="background: #fff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Details:</strong></p>
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Organizer:</strong> ${organizerName}</p>
      <p><strong>Department:</strong> ${organizingDepartment}</p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
    </div>

    <p style="margin-top: 20px; color: #555;">Please log in to the SECE Events Portal to review and approve the event details.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
