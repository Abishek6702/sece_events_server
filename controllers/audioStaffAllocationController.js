const Event = require('../models/Event.js');
const sendMail = require('../utils/sendMail');
const audioStaffAllocationToStaffTemplate = require('../utils/mailTemplates/audioStaffAllocationToStaff');
const audioStaffAllocationToOrganizerTemplate = require('../utils/mailTemplates/audioStaffAllocationToOrganizer');

exports.allocateAudioStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { venueName, dayIndex, staff } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the specific audio venue requirement
    let targetVenue = null;

    // 1. Try to match by both venueName AND dayIndex
    if (venueName !== undefined && dayIndex !== undefined) {
      targetVenue = event.audioDetails.audios.find(
        (v) => v.venueName === venueName && v.dayIndex === dayIndex
      );
    }

    // 2. Fallback: match by unique _id of the audio sub-document
    if (!targetVenue) {
      const entryId = req.body._id || req.body.venueId;
      if (entryId) {
        targetVenue = event.audioDetails.audios.find(
          (v) => v._id && v._id.toString() === entryId
        );
      }
    }

    if (!targetVenue) {
      return res.status(404).json({
        message: 'Audio requirements for the specified venue and day not found',
      });
    }

    // Assign staff
    targetVenue.staff = staff;

    await event.save();

    // Prepare data for emails
    const eventName = event.requestDetails?.eventDetails?.eventName || 'Untitled Event';
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || '';

    const eventDay =
      event.requestDetails?.eventDetails?.eventSchedule?.find(
        (d) => d.dayIndex === targetVenue.dayIndex
      ) || event.requestDetails?.eventDetails?.eventSchedule?.[0];

    const eventDate = eventDay?.eventDate || new Date();
    const timing =
      eventDay?.startTime && eventDay?.endTime
        ? eventDay.startTime + ' - ' + eventDay.endTime
        : 'Not Specified';
    const emailVenueName = targetVenue.venueName || 'Venue not specified';
    const organizer = event.requestDetails?.organizerDetails?.organizers?.[0] || {};

    const organizerDetails = {
      name: organizer.name || 'Organizer',
      email: organizer.email || '',
      mobile: organizer.mobile || '',
    };

    // Send email to allocated staff
    if (staff.email) {
      try {
        const staffHtml = audioStaffAllocationToStaffTemplate({
          eventName,
          organizingDepartment,
          eventDate,
          venueName: emailVenueName,
          timing,
          targetVenue,
          organizerDetails,
        });
        await sendMail(
          staff.email,
          '[SECE Events] Audio Duty Allocation: ' + eventName,
          staffHtml
        );
      } catch (err) {
        console.error('Failed to send email to Audio staff', err);
      }
    }

    // Send email to organizer
    if (organizerDetails.email) {
      try {
        const organizerHtml = audioStaffAllocationToOrganizerTemplate({
          eventName,
          venueName: emailVenueName,
          eventDate,
          timing,
          staffDetails: staff,
        });
        await sendMail(
          organizerDetails.email,
          '[SECE Events] Audio Staff Allocated: ' + eventName,
          organizerHtml
        );
      } catch (err) {
        console.error('Failed to send email to Organizer', err);
      }
    }

    res.status(200).json({
      message: 'Staff allocated successfully',
      data: event,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
