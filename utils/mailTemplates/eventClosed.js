module.exports = ({ eventName, organizingDepartment, eventDate, closureReason }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #95a5a6; padding-bottom: 10px;">
      <h2 style="color: #95a5a6; margin: 0;">Event Closed</h2>
    </div>

    <p>Dear Team,</p>
    <p>The event has been officially closed.</p>

    <div style="background: #ecf0f1; border-left: 4px solid #95a5a6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Details:</strong></p>
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Department:</strong> ${organizingDepartment}</p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
    </div>

    ${closureReason ? `
      <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p><strong>Closure Reason:</strong></p>
        <p>${closureReason}</p>
      </div>
    ` : ''}

    <p style="margin-top: 20px; color: #555;">Thank you for organizing this event. You can view the event details in the SECE Events Portal.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
