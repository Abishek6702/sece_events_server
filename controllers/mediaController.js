const IndividualMedia = require("../models/IndividualMedia");
require("../models/Faculty");

// ==============================
// CREATE
// ==============================
exports.createIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.create(req.body);

    res.status(201).json({
      success: true,
      message: "Individual media created successfully",
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ALL
// ==============================
exports.getAllIndividualMedia = async (req, res) => {
  try {
    const mediaList = await IndividualMedia.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mediaList.length,
      data: mediaList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE BY ID
// ==============================
exports.getSingleIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.findById(req.params.id).populate(
      "employee"
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE
// ==============================
exports.updateIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Individual media updated successfully",
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DELETE
// ==============================
exports.deleteIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.findByIdAndDelete(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Individual media deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// PATCH
// ==============================
exports.patchIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    // Update only provided fields
    Object.keys(req.body).forEach((key) => {
      media[key] = req.body[key];
    });

    await media.save();

    res.status(200).json({
      success: true,
      message: "Individual media patched successfully",
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// CREATE API
// {
//   "employee": "664f1d2c9a1234567890abcd",
//   "dayIndex": 1,

//   "typeOfMedia": ["Poster", "Video"],

//   "poster": {
//     "posterContent": "Need promotional poster for annual event",

//     "referencePosterFiles": [
//       {
//         "fileUrl": "https://example.com/poster1.jpg",
//         "fileName": "poster1.jpg"
//       },
//       {
//         "fileUrl": "https://example.com/poster2.jpg",
//         "fileName": "poster2.jpg"
//       }
//     ],

//     "certificateContent": "Certificate design for winners",

//     "referenceCertificateFiles": [
//       {
//         "fileUrl": "https://example.com/certificate.pdf",
//         "fileName": "certificate.pdf"
//       }
//     ],

//     "trophyContent": "Golden trophy design with company logo",

//     "displayNeeded": [
//       "Digital Signage",
//       "Standee",
//       "Social Media"
//     ],

//     "sizes": [
//       {
//         "type": "Width",
//         "value": 1920
//       },
//       {
//         "type": "Height",
//         "value": 1080
//       },
//       {
//         "type": "Banner",
//         "value": 12
//       }
//     ],

//     "deliveryDate": "2026-05-20T00:00:00.000Z",

//     "priority": "High",

//     "specialRequirements": "Use company brand colors and modern style"
//   },

//   "video": {
//     "videoContent": "Need event teaser and full coverage video",

//     "preEventVideos": [
//       "Invitation Video",
//       "Promo Teaser"
//     ],

//     "eventCoverage": [
//       "Stage Performance",
//       "Audience Reactions",
//       "Award Ceremony"
//     ],

//     "postEventVideos": [
//       "Highlights Video",
//       "Thank You Video"
//     ],

//     "specialVideos": [
//       "CEO Speech Edit",
//       "Instagram Reel"
//     ],

//     "referenceFiles": [
//       {
//         "fileUrl": "https://example.com/video-reference.mp4",
//         "fileName": "video-reference.mp4"
//       }
//     ],

//     "deliveryDate": "2026-05-25T00:00:00.000Z",

//     "priority": "Urgent",

//     "specialRequirements": "Need cinematic editing with subtitles"
//   },

//   "status": "Pending"
// }

// GET

// /api/individual-media

// GET

// /api/individual-media/:id

// PUT

// /api/individual-media/:id

// DELETE

// /api/individual-media/:id