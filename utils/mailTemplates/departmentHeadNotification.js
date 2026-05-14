module.exports = ({ eventName, organizingDepartment, eventDate, requirementType, eventId }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
      <h2 style="color: #3498db; margin: 0;">⚠️ Department Action Required</h2>
    </div>

    <p>Dear Department Head,</p>
    <p>An event has been approved and requires your department's attention.</p>

    <div style="background: #eef9ff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Details:</strong></p>
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Organizing Department:</strong> ${organizingDepartment}</p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
      <p><strong>Department Requirement:</strong> ${requirementType}</p>
    </div>

    <p style="margin-top: 20px; color: #555;">Please log in to the SECE Events Portal to review and acknowledge the requirements for the <strong>${requirementType}</strong> department.</p>

    <p style="margin-top: 20px; color: #888; font-size: 14px;">Event ID: ${eventId}</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
