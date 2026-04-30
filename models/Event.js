const mongoose = require("mongoose");

const departmentStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Acknowledged", "Waiting for Acknowledge"],
    default: "Waiting for Acknowledge",
  },
  remarks: { type: String },
});

const fileReferenceSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

// organizerDetails (finalized)
const organizerSchema = new mongoose.Schema(
  {
    previousEventDocumentation: { type: Boolean, default: false },
    previousEventDocumentationDetails: fileReferenceSchema,
    previousEventReason: { type: String },

    isBudgetApproved: { type: Boolean, default: false },
    financeRequired: { type: Boolean, default: false },

    organizingDepartment: { type: String },
    organizerCount: { type: Number },

    organizers: [
      {
        name: { type: String },
        department: { type: String },
        mobile: { type: Number },
        designation: { type: String },
        email: { type: String },
        empId: { type: String },
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

// guest Schema (finalized)
const guestSchema = new mongoose.Schema(
  {
    name: { type: String },
    organization: { type: String },
    designation: { type: String },
    mobile: { type: Number },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
  },
  { _id: false },
);

// event day schema (finalized)
const eventDaySchema = new mongoose.Schema(
  {
    eventDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },

    totalGuests: { type: Number, default: 0 },

    guests: [guestSchema],
  },
  { _id: false },
);

// eventDetails (finalized)
const eventDetailsSchema = new mongoose.Schema(
  {
    eventName: { type: String, trim: true },

    involvedIIC: { type: Boolean, default: false },

    eventType: { type: String },
    eventTypeOther: { type: String },

    professionalSociety: { type: [String] },
    professionalSocietyOther: { type: String },

    logosInPoster: { type: [String] },
    logosOther: { type: String },

    targetAudience: {
      type: String,
      enum: ["Students", "Faculty", "Students/Faculty", "Others"],
    },

    numberOfDays: { type: Number },

    // multi-day events
    eventSchedule: [eventDaySchema],
  },
  { _id: false },
);

// requirementDetails (finalized)
const requirementSchema = new mongoose.Schema(
  {
    venueRequired: { type: Boolean, default: false },
    audioRequired: { type: Boolean, default: false },
    ictsRequired: { type: Boolean, default: false },
    transportRequired: { type: Boolean, default: false },
    accommodationRequired: { type: Boolean, default: false },
    mediaRequired: { type: Boolean, default: false },
  },
  { _id: false },
);

// requestDetails (finalized)
const requestSchema = new mongoose.Schema(
  {
    organizerDetails: organizerSchema,
    eventDetails: eventDetailsSchema,
    requirementDetails: requirementSchema,
  },
  { _id: false },
);

// venueDetails (finalized)
const venueSchema = new mongoose.Schema(
  {
    totalParticipants: { type: Number },
    venues: [
      {
        dayIndex: { type: Number },

        venueName: { type: String, trim: true },

        numberOfParticipants: { type: Number },
        seatingCapacity: { type: Number },

        hallRequirements: {
          type: [
            {
              type: {
                type: String,
              },
              quantity: { type: Number, min: 1 },
            },
          ],
          validate: (v) => v.length > 0,
        },

        specialRequirements: { type: String },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// ictsDetails (finalized)
const ictsSchema = new mongoose.Schema(
  {
    ictses: [
      {
        dayIndex: { type: Number },

        venueId: {
          type: mongoose.Types.ObjectId,
        },

        venueName: { type: String, trim: true },

        desktopLaptop: {
          type: Boolean,
          default: false,
        },

        internetFacility: {
          type: String,
        },

        expectedInternetUsers: { type: Number, default: 0 },

        proctoringUsers: { type: Number, default: 0 },

        guestWifiNeeded: {
          type: Boolean,
          default: false,
        },

        guestWifiExceed5: {
          type: Boolean,
          default: false,
        },

        totalGuestCount: { type: Number, default: 0 },

        requirements: [{ type: String }],

        otherRequirements: { type: String },

        specialRequirements: { type: String },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// audioDetails (finalized)
const audioSchema = new mongoose.Schema(
  {
    audios: [
      {
        dayIndex: { type: Number },

        venueId: {
          type: mongoose.Types.ObjectId,
        },

        venueName: { type: String, trim: true },

        audioItems: {
          type: [
            {
              type: {
                type: String,
              },
              quantity: { type: Number, min: 1 },
            },
          ],
          validate: (v) => v.length > 0,
        },

        otherRequirements: { type: String },
        specialRequirements: { type: String },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// transportDetails (finalized)
const transportSchema = new mongoose.Schema(
  {
    transports: [
      {
        pickupDateTime: { type: Date },
        dropDateTime: { type: Date },

        pickupLocation: { type: String, trim: true },

        checkpoints: [{ location: { type: String, trim: true } }],

        dropLocation: { type: String, trim: true },

        totalPassengers: Number,

        vehicles: [
          {
            type: { type: String },
            count: Number,
          },
        ],

        accompanyingStaff: [
          {
            name: { type: String, trim: true },
            mobile: { type: Number },
          },
        ],

        specialRequirements: { type: String, trim: true },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// refreshmentDetails (finalized)
const refreshmentSchema = new mongoose.Schema(
  {
    refreshments: [
      {
        date: { type: Date },

        resourcePersonType: [{ type: String, trim: true }],

        numberOfResourcePersons: { type: Number },

        numberOfInternalAccompanyingStaff: { type: Number },

        accompanyingStaff: [
          {
            name: { type: String, trim: true },
            mobile: { type: Number },
          },
        ],

        foodTypes: [
          {
            type: { type: String },

            participants: {
              vegCount: Number,
              nonVegCount: Number,
            },

            vipGuests: {
              vegCount: Number,
              nonVegCount: Number,
            },
          },
        ],

        specialRequirements: String,
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// accommodationDetails (finalized)
const accommodationSchema = new mongoose.Schema(
  {
    accommodations: [
      {
        checkInDateTime: Date,
        checkOutDateTime: Date,

        guests: [
          {
            guestId: {
              type: mongoose.Types.ObjectId,
            },
            name: String,
            mobile: Number,
            gender: String,
          },
        ],

        roomOccupancy: [
          {
            type: { type: String },
            count: Number,
          },
        ],

        roomCategory: [
          {
            type: { type: String },
            count: Number,
          },
        ],

        dineInRequired: Boolean,

        dineInCounts: [
          {
            type: { type: String },
            count: Number,
          },
        ],

        specialRequirements: String,
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// purchaseDetails (finalized)
const purchaseSchema = new mongoose.Schema(
  {
    purchases: [
      {
        dayIndex: Number,

        requirementNeeded: [
          {
            type: { type: String },
            hardCount: Number,
            softCount: Number,
          },
        ],

        requiredFor: [String],

        students: {
          giftItems: [
            {
              giftType: String,

              trophy: [
                {
                  trophyType: String,
                  quantity: Number,
                },
              ],

              cashPrizeAmount: Number,

              voucherAmount: Number,
            },
          ],

          registrationKitNeeded: Boolean,
          registrationKitQty: Number,

          specialRequirements: String,
        },

        guests: {
          giftItems: [
            {
              giftType: String,

              trophy: [
                {
                  trophyType: String,
                  quantity: Number,
                },
              ],

              glassCupQty: Number,

              voucherAmount: Number,
            },
          ],

          registrationKitNeeded: Boolean,
          registrationKitQty: Number,

          specialRequirements: String,
        },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// mediaRequirementDetails (finalized)
const mediaRequirementSchema = new mongoose.Schema(
  {
    mediaRequirements: [
      {
        dayIndex: Number,
        typeOfMedia: [String], // poster / video

        poster: {
          posterContent: String,
          referencePosterFiles: [fileReferenceSchema],

          certificateContent: String,
          referenceCertificateFiles: [fileReferenceSchema],

          trophyContent: String,

          displayNeeded: [String],

          sizes: [
            {
              type: { type: String },
              value: Number,
            },
          ],

          deliveryDate: Date,
          priority: String,

          specialRequirements: String,
        },

        video: {
          videoContent: String,

          preEventVideos: [String],
          eventCoverage: [String],
          postEventVideos: [String],
          specialVideos: [String],

          referenceFiles: [fileReferenceSchema],

          deliveryDate: Date,
          priority: String,

          specialRequirements: String,
        },
      },
    ],
    status: departmentStatusSchema,
  },
  { _id: false },
);

// main event details (finalized)
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
        "DepartmentReview",
        "Approved",
        "Closed",
        "Rejected",
      ],
      default: "Draft",
    },
  },
  { timestamps: true },
);

eventSchema.index({ organizerId: 1 });

eventSchema.index({
  "venueDetails.venues.dayIndex": 1,
  "venueDetails.venues.venueName": 1,
});

eventSchema.index({
  "ictsDetails.ictses.dayIndex": 1,
  "ictsDetails.ictses.venueId": 1,
});

eventSchema.index({
  "audioDetails.audios.dayIndex": 1,
  "audioDetails.audios.venueId": 1,
});

eventSchema.index({
  "purchaseDetails.purchases.dayIndex": 1,
});

eventSchema.index({
  "mediaRequirementDetails.mediaRequirements.dayIndex": 1,
});

module.exports = mongoose.model("Event", eventSchema);
