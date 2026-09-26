module.exports = function(params) {
  var eventName = params.eventName;
  var organizingDepartment = params.organizingDepartment;
  var eventDate = params.eventDate;
  var venueName = params.venueName;
  var timing = params.timing;
  var targetVenue = params.targetVenue;
  var organizerDetails = params.organizerDetails;

  var audioItemsHtml = '';
  if (targetVenue.audioItems && targetVenue.audioItems.length > 0) {
    audioItemsHtml = '<p style="margin:5px 0;"><strong>Audio Items:</strong></p><ul style="margin:5px 0;color:#555;">' +
      targetVenue.audioItems.map(function(i) { return '<li>' + (i.type || 'Item') + ': ' + i.quantity + '</li>'; }).join('') + '</ul>';
  }
  var flagsHtml =
    (targetVenue.isEbRequired ? '<p style="margin:5px 0;"><strong>EB Required:</strong> Yes</p>' : '') +
    (targetVenue.noOfSystems ? '<p style="margin:5px 0;"><strong>No. of Systems:</strong> ' + targetVenue.noOfSystems + '</p>' : '') +
    (targetVenue.ledWallRequired ? '<p style="margin:5px 0;"><strong>LED Wall Required:</strong> Yes</p>' : '') +
    (targetVenue.acRequired ? '<p style="margin:5px 0;"><strong>AC Required:</strong> Yes</p>' : '');
  var extraHtml =
    (targetVenue.otherRequirements ? '<p style="margin:10px 0 5px;color:#555;"><strong>Other Requirements:</strong> ' + targetVenue.otherRequirements + '</p>' : '') +
    (targetVenue.specialRequirements ? '<p style="margin:10px 0 5px;color:#555;"><strong>Special Requirements:</strong> ' + targetVenue.specialRequirements + '</p>' : '');

  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:20px;background-color:#f9f9f9;">' +
    '<div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #8e44ad;padding-bottom:10px;"><h2 style="color:#8e44ad;margin:0;">Audio Duty Allocation</h2></div>' +
    '<p>Dear Staff Member,</p><p>You have been allocated Audio duty for an upcoming event. Please find the details below:</p>' +
    '<div style="background:#f5eef8;border-left:4px solid #8e44ad;padding:15px;margin:20px 0;border-radius:4px;">' +
    '<p><strong>Event Name:</strong> ' + eventName + '</p>' +
    '<p><strong>Department:</strong> ' + organizingDepartment + '</p>' +
    '<p><strong>Date:</strong> ' + new Date(eventDate).toLocaleDateString() + '</p>' +
    '<p><strong>Venue:</strong> ' + venueName + '</p>' +
    '<p><strong>Timing:</strong> ' + timing + '</p></div>' +
    '<h3 style="color:#444;border-bottom:1px solid #ddd;padding-bottom:5px;">Audio Requirements Details</h3>' +
    '<div style="background:#fff;padding:15px;border-radius:4px;border:1px solid #eee;">' +
    audioItemsHtml + '<div style="margin-top:10px;color:#555;">' + flagsHtml + '</div>' + extraHtml + '</div>' +
    '<h3 style="color:#444;border-bottom:1px solid #ddd;padding-bottom:5px;">Organizer Details</h3>' +
    '<div style="background:#fff;padding:15px;border-radius:4px;border:1px solid #eee;">' +
    '<p style="margin:5px 0;"><strong>Name:</strong> ' + organizerDetails.name + '</p>' +
    '<p style="margin:5px 0;"><strong>Email:</strong> ' + organizerDetails.email + '</p>' +
    '<p style="margin:5px 0;"><strong>Phone:</strong> ' + organizerDetails.mobile + '</p></div>' +
    '<p style="margin-top:20px;color:#555;">Please coordinate with the organizer for any further requirements or clarifications.</p>' +
    '<p style="text-align:center;margin-top:30px;color:#888;font-size:14px;">Regards,<br><a href="https://srieshwarevents.com" target="_blank" style="color:#8e44ad;text-decoration:none;font-weight:bold;">Sri Eshwar Events</a></p>' +
    '</div>';
};
