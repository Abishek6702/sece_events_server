module.exports = ({ eventName, organizerName, organizingDepartment, reason }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #e74c3c; padding-bottom: 10px;">
      <h2 style="color: #e74c3c; margin: 0;">✗ Event Rejected</h2>
    </div>

    <p>Dear ${organizerName},</p>
    <p>Unfortunately, your event submission has been rejected.</p>

    <div style="background: #fadbd8; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Details:</strong></p>
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Department:</strong> ${organizingDepartment}</p>
    </div>

    <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Reason for Rejection:</strong></p>
      <p>${reason || 'Please check your submission details and resubmit with necessary corrections.'}</p>
    </div>

    <p style="margin-top: 20px; color: #555;">Please review the feedback and feel free to resubmit the event with corrections. If you have any questions, please contact the administration.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
