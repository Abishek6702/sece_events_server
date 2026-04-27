const mongoose = require("mongoose");

// organizerDetails
const organizerSchema = new mongoose.Schema(
  {
    previousEventDocumentation: { type: Boolean, default: false },
    financeRequired: { type: Boolean, default: false },
    budgetApproved: { type: Boolean, default: false },
    requestDate: { type: Date },
    organizingDepartment: { type: String },
    organizerCount: { type: Number },
    organizers: [
      {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        mobile: { type: Number, required: true },
        email: { type: String, required: true },
        empId: { type: String, required: true },
        facultyId: {
          type: mongoose.Types.ObjectId,
          ref: "Faculty",
          required: true,
        },
      },
    ],
  },
  { _id: false },
);

// guest Schema
const guestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    organization: { type: String, required: true },
  },
  { _id: false },
);

// event day schema
const eventDaySchema = new mongoose.Schema(
  {
    eventDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    totalGuests: { type: Number, default: 0 },

    guests: [guestSchema],
  },
  { _id: false },
);

// eventDetails
const eventDetailsSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true },

    tagging: { type: String, required: true },
    taggingDetails: { type: String },

    eventType: { type: String, required: true },
    eventTypeOther: { type: String },

    professionalSociety: { type: String, required: true },
    professionalSocietyOther: { type: String },

    logosInPoster: { type: String, required: true },
    logosOther: { type: String },

    numberOfDays: { type: Number, required: true },

    targetAudience: {
      type: String,
      enum: ["Students", "Faculty", "Students/Faculty", "Others"],
      required: true,
    },

    // multi-day events
    eventSchedule: [eventDaySchema],
  },
  { _id: false },
);

// requirementDetails
const requirementSchema = new mongoose.Schema(
  {
    venueRequired: { type: Boolean, default: false },
    audioRequired: { type: Boolean, default: false },
    ictsRequired: { type: Boolean, default: false },
    transportRequired: { type: Boolean, default: false },
    accommodationRequired: { type: Boolean, default: false },
    mediaRequired: { type: Boolean, default: false },
    otherRequired: { type: Boolean, default: false },
  },
  { _id: false },
);

// requestDetails
const requestSchema = new mongoose.Schema(
  {
    organizerDetails: organizerSchema,
    eventDetails: eventDetailsSchema,
    requirementDetails: requirementSchema,
  },
  { _id: false },
);

// venueDetails
const venueSchema = new mongoose.Schema(
  {
    venues: [
      {
        eventDate: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },

        venueName: { type: String, required: true },
        otherVenue: { type: String }, // if "Others" selected

        numberOfParticipants: { type: Number, required: true },
        seatingCapacity: { type: Number, required: true },

        hallRequirements: [{ type: String }], 

        guestChairCount: { type: Number, default: 0 },
        waterBottleCount: { type: Number, default: 0 },
        diasTableCount: { type: Number, default: 0 },
        audienceChairCount: { type: Number, default: 0 },

        specialRequirements: { type: String },
      },
    ],
  },
  { _id: false },
);

// ictsDetails
const ictsSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);

// audioDetails
const audioSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);

// transportDetails
const transportSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);

// refreshmentDetails
const refreshmentSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);

// accommodationDetails
const accommodationSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);
// purchaseDetails
const purchaseSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);
// mediaRequirementDetails
const mediaRequirementSchema = new mongoose.Schema(
  { name: { type: String } },
  { _id: false },
);

// main event details
const eventSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    requestDetails: requestSchema,
    venueDetails: venueSchema,
    ictsDetails: ictsSchema,
    audioDetails: audioSchema,
    transportDetails: transportSchema,
    refreshmentDetails: refreshmentSchema,
    accommodationDetails: accommodationSchema,
    purchaseDetails: purchaseSchema,
    mediaRequirementDetails: mediaRequirementSchema,

    isSubmitted: { type: Boolean, default: false },

    // approvals
    isHodApproved: { type: Boolean, default: false },
    adminApproval: { type: Boolean, default: false },
    finalApproval: { type: Boolean, default: false },

    // status
    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "HodApproved",
        "AdminApproved",
        "DepartmentReview",
        "FinalApproved",
        "Closed",
        "Rejected",
      ],
      default: "Draft",
    },
  },
  { timestamps: true },
);
  
module.exports = mongoose.model("Event", eventSchema);

//   departmentApproval: [
//       {
//         department: String,
//         status: { type: String, enum: ["Pending", "Viewed", "Approved"] },
//       },
//     ],
