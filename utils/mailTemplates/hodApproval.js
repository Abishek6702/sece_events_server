module.exports = ({ eventName, organizerName, organizingDepartment, eventDate }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #27ae60; padding-bottom: 10px;">
      <h2 style="color: #27ae60; margin: 0;">✓ HOD Approved</h2>
    </div>

    <p>Dear Organizers,</p>
    <p>Great news! Your event has been approved by the Head of Department.</p>

    <div style="background: #ecf8f3; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Details:</strong></p>
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Department:</strong> ${organizingDepartment}</p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
    </div>

    <p style="margin-top: 20px; color: #555;">Your event is now awaiting super admin approval. You will be notified once the super admin reviews and approves your event.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
