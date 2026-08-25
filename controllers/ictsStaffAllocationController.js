const Event = require("../models/Event.js");
const sendMail = require("../utils/sendMail");
const ictsStaffAllocationToStaffTemplate = require("../utils/mailTemplates/ictsStaffAllocationToStaff");
const ictsStaffAllocationToOrganizerTemplate = require("../utils/mailTemplates/ictsStaffAllocationToOrganizer");

exports.allocateIctsStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { venueName, dayIndex, staff } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Find the specific ICTS venue requirement
    let targetVenue = null;
    
    // 1. Try to match by both venueName AND dayIndex
    if (venueName !== undefined && dayIndex !== undefined) {
      targetVenue = event.ictsDetails.ictses.find(v => 
        v.venueName === venueName && v.dayIndex === dayIndex
      );
    }
    
    // 2. Fallback if they pass the unique _id of the icts sub-document
    if (!targetVenue) {
      const entryId = req.body._id || req.body.venueId;
      if (entryId) {
        targetVenue = event.ictsDetails.ictses.find(v => v._id && v._id.toString() === entryId);
      }
    }

    if (!targetVenue) {
      return res.status(404).json({
        message: "ICTS requirements for the specified venue and day not found",
      });
    }

    // Assign staff
    targetVenue.staff = staff;

    await event.save();

    // Prepare data for emails
    const eventName = event.requestDetails?.eventDetails?.eventName || "Untitled Event";
    const organizingDepartment = event.requestDetails?.organizerDetails?.organizingDepartment || "";
    
    // Find event day
    const eventDay = event.requestDetails?.eventDetails?.eventSchedule?.find(d => d.dayIndex === targetVenue.dayIndex) 
      || event.requestDetails?.eventDetails?.eventSchedule?.[0]; // fallback
      
    const eventDate = eventDay?.eventDate || new Date();
    const timing = (eventDay?.startTime && eventDay?.endTime) ? `${eventDay.startTime} - ${eventDay.endTime}` : "Not Specified";
    const emailVenueName = targetVenue.venueName || "Venue not specified";
    const ictsRequirements = targetVenue.requirements || [];
    const organizer = event.requestDetails?.organizerDetails?.organizers?.[0] || {};
    
    const organizerDetails = {
      name: organizer.name || "Organizer",
      email: organizer.email || "",
      mobile: organizer.mobile || ""
    };

    // Send email to allocated staff
    if (staff.email) {
      try {
        const staffHtml = ictsStaffAllocationToStaffTemplate({
          eventName,
          organizingDepartment,
          eventDate,
          venueName: emailVenueName,
          timing,
          targetVenue,
          organizerDetails
        });
        await sendMail(staff.email, `[SECE Events] ICTS Duty Allocation: ${eventName}`, staffHtml);
      } catch (err) {
        console.error("Failed to send email to ICTS staff", err);
      }
    }

    // Send email to organizer
    if (organizerDetails.email) {
      try {
        const organizerHtml = ictsStaffAllocationToOrganizerTemplate({
          eventName,
          venueName: emailVenueName,
          eventDate,
          timing,
          staffDetails: staff
        });
        await sendMail(organizerDetails.email, `[SECE Events] ICTS Staff Allocated: ${eventName}`, organizerHtml);
      } catch (err) {
         console.error("Failed to send email to Organizer", err);
      }
    }

    res.status(200).json({
      message: "Staff allocated successfully",
      data: event,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};
