module.exports = ({ eventName, organizingDepartment, eventDate, venueName, timing, targetVenue, organizerDetails }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
      <h2 style="color: #3498db; margin: 0;">ICTS Duty Allocation</h2>
    </div>

    <p>Dear Staff Member,</p>
    <p>You have been allocated ICTS duty for an upcoming event. Please find the details below:</p>

    <div style="background: #e8f4fd; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Event Name:</strong> ${eventName}</p>
      <p><strong>Department:</strong> ${organizingDepartment}</p>
      <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
      <p><strong>Venue:</strong> ${venueName}</p>
      <p><strong>Timing:</strong> ${timing}</p>
    </div>

    <h3 style="color: #444; border-bottom: 1px solid #ddd; padding-bottom: 5px;">ICTS Requirements Details</h3>
    <div style="background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #eee;">
      
      ${targetVenue.requirements && targetVenue.requirements.length > 0 ? `
        <p style="margin: 5px 0;"><strong>Requirements:</strong></p>
        <ul style="margin: 5px 0; color: #555;">
          ${targetVenue.requirements.map(req => `<li>${req}</li>`).join('')}
        </ul>
      ` : ''}

      ${targetVenue.desktopLaptop && targetVenue.desktopLaptop.length > 0 ? `
        <p style="margin: 10px 0 5px;"><strong>Desktop / Laptop:</strong></p>
        <ul style="margin: 5px 0; color: #555;">
          ${targetVenue.desktopLaptop.map(dl => `<li>${dl.type}: ${dl.count}</li>`).join('')}
        </ul>
      ` : ''}

      <div style="margin-top: 10px; color: #555;">
        ${targetVenue.internetFacility ? `<p style="margin: 5px 0;"><strong>Internet Facility:</strong> ${targetVenue.internetFacility}</p>` : ''}
        ${targetVenue.expectedInternetUsers ? `<p style="margin: 5px 0;"><strong>Expected Internet Users:</strong> ${targetVenue.expectedInternetUsers}</p>` : ''}
        ${targetVenue.proctoringUsers ? `<p style="margin: 5px 0;"><strong>Proctoring Users:</strong> ${targetVenue.proctoringUsers}</p>` : ''}
        ${targetVenue.guestWifiNeeded ? `<p style="margin: 5px 0;"><strong>Guest Wi-Fi Needed:</strong> Yes ${targetVenue.guestWifiExceed5 ? '(Exceeds 5)' : ''}</p>` : ''}
        ${targetVenue.totalGuestCount ? `<p style="margin: 5px 0;"><strong>Total Guest Count:</strong> ${targetVenue.totalGuestCount}</p>` : ''}
      </div>

      ${targetVenue.otherRequirements ? `<p style="margin: 10px 0 5px; color: #555;"><strong>Other Requirements:</strong> ${targetVenue.otherRequirements}</p>` : ''}
      ${targetVenue.specialRequirements ? `<p style="margin: 10px 0 5px; color: #555;"><strong>Special Requirements:</strong> ${targetVenue.specialRequirements}</p>` : ''}
    </div>

    <h3 style="color: #444; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Organizer Details</h3>
    <div style="background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #eee;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${organizerDetails.name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${organizerDetails.email}</p>
      <p style="margin: 5px 0;"><strong>Phone:</strong> ${organizerDetails.mobile}</p>
    </div>

    <p style="margin-top: 20px; color: #555;">Please coordinate with the organizer for any further requirements or clarifications.</p>

    <p style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
      Regards,<br>
      <b>SECE Events System</b>
    </p>
  </div>
`;
