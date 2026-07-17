// controllers/individual/mediaController.js

const IndividualMedia = require("../../models/individual/IndividualMedia");

// ==============================


// ==============================
// NORMALIZE FILE
// ==============================
const normalizeFileReference = (file) => {
  if (!file) return null;

  return {
    url:
      file.path ||
      file.secure_url ||
      file.url ||
      "",

    publicId:
      file.filename ||
      file.public_id ||
      "",
  };
};

// ==============================
// SAFE ARRAY
// ==============================
const makeArray = (value) => {
  if (!value) return [];

  return Array.isArray(value)
    ? value
    : [value];
};

// ==============================
// CREATE
// ==============================
exports.createIndividualMedia = async (req, res) => {
  try {
    console.log(
      "BODY =>",
      JSON.stringify(req.body, null, 2)
    );

    console.log(
      "FILES =>",
      req.files
    );

    const body = {
      employee: req.body.employee,

      dayIndex: Number(
        req.body.dayIndex
      ),

      status:
        req.body.status || "Pending",

      typeOfMedia: makeArray(
        req.body.typeOfMedia
      ),

      principalApprovalForm: null,

      files: [],

      poster: {
        posterContent:
          req.body.poster?.posterContent ||
          "",

        certificateContent:
          req.body.poster?.certificateContent ||
          "",

        trophyContent:
          req.body.poster?.trophyContent ||
          "",

        priority:
          req.body.poster?.priority ||
          "Medium",

        specialRequirements:
          req.body.poster
            ?.specialRequirements || "",

        displayNeeded: makeArray(
          req.body.poster?.displayNeeded
        ),

        sizes:
          req.body.poster?.sizes || [],

        deliveryDate:
          req.body.poster?.deliveryDate ||
          null,

        referencePosterFiles: [],

        referenceCertificateFiles: [],
      },

      video: {
        videoContent:
          req.body.video?.videoContent ||
          "",

        priority:
          req.body.video?.priority ||
          "Medium",

        specialRequirements:
          req.body.video
            ?.specialRequirements || "",

        preEventVideos: makeArray(
          req.body.video?.preEventVideos
        ),

        eventCoverage: makeArray(
          req.body.video?.eventCoverage
        ),

        postEventVideos: makeArray(
          req.body.video?.postEventVideos
        ),

        specialVideos: makeArray(
          req.body.video?.specialVideos
        ),

        deliveryDate:
          req.body.video?.deliveryDate ||
          null,

        referenceFiles: [],
      },
    };

    // =================================
    // PRINCIPAL APPROVAL FORM
    // =================================

    if (
      req.files?.principalApprovalForm?.length
    ) {
      body.principalApprovalForm =
        normalizeFileReference(
          req.files.principalApprovalForm[0]
        );
    }

    // =================================
    // MAIN FILES
    // =================================

    if (req.files?.files?.length) {
      body.files =
        req.files.files
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    // =================================
    // POSTER FILES
    // =================================

    if (
      req.files?.referencePosterFiles?.length
    ) {
      body.poster.referencePosterFiles =
        req.files.referencePosterFiles
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    // =================================
    // CERTIFICATE FILES
    // =================================

    if (
      req.files
        ?.referenceCertificateFiles?.length
    ) {
      body.poster.referenceCertificateFiles =
        req.files.referenceCertificateFiles
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    // =================================
    // VIDEO FILES
    // =================================

    if (
      req.files?.referenceFiles?.length
    ) {
      body.video.referenceFiles =
        req.files.referenceFiles
          .map(normalizeFileReference)
          .filter(Boolean);
    }

    // =================================
    // CREATE
    // =================================

    const media =
      await IndividualMedia.create(body);

    res.status(201).json({
      success: true,
      message:
        "Individual media created successfully",
      data: media,
    });
  } catch (error) {
    console.log(
      "ERROR =>",
      error
    );

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
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE
// ==============================
exports.getSingleIndividualMedia = async (req, res) => {
  try {
    const media = await IndividualMedia.findById(
      req.params.id
    ).populate("employee");

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
    console.log(error);

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
      message:
        "Individual media updated successfully",
      data: media,
    });
  } catch (error) {
    console.log(error);

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
    const media =
      await IndividualMedia.findByIdAndDelete(
        req.params.id
      );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Individual media deleted successfully",
    });
  } catch (error) {
    console.log(error);

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
    console.log("BODY =>", req.body);

    if (
      !req.body ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
      });
    }

    const media = await IndividualMedia.findById(
      req.params.id
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Individual media not found",
      });
    }

    // UPDATE ONLY SENT FIELDS
    Object.keys(req.body).forEach((key) => {
      media[key] = req.body[key];
    });

    await media.save();

    res.status(200).json({
      success: true,
      message:
        "Individual media patched successfully",
      data: media,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// controllers/posterDashboardController.js
exports.getPosterDashboard =
  async (req, res) => {
    try {
      // ONLY POSTER REQUESTS
      const filter = {
        typeOfMedia: "Poster",
      };

      // ==============================
      // CARD COUNTS
      // ==============================

      const totalRequests =
        await IndividualMedia.countDocuments(
          filter
        );

      const completedRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Completed",
        });

      const acknowledgedRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Approved",
        });

      const pendingAcknowledgementRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Pending",
        });

      // ==============================
      // DEPARTMENT WISE
      // ==============================

      const departmentWise =
        await IndividualMedia.aggregate([
          {
            $match: filter,
          },

          {
            $lookup: {
              from: "faculties",
              localField: "employee",
              foreignField: "_id",
              as: "facultyData",
            },
          },

          {
            $unwind: "$facultyData",
          },

          {
            $group: {
              _id: "$facultyData.department",
              total: { $sum: 1 },
            },
          },

          {
            $project: {
              _id: 0,
              department: "$_id",
              total: 1,
            },
          },
        ]);

      // ==============================
      // LATEST REQUESTS
      // ==============================

      const latestRequests =
        await IndividualMedia.find(filter)
          .populate("employee")
          .sort({ createdAt: -1 })
          .limit(10);

      // ==============================
      // RESPONSE
      // ==============================

      res.status(200).json({
        success: true,

        cards: {
          totalRequests,
          completedRequests,
          acknowledgedRequests,
          pendingAcknowledgementRequests,
        },

        departmentWise,

        latestRequests,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  // controllers/videoDashboardController.js

exports.getVideoDashboard =
  async (req, res) => {
    try {
      // ONLY VIDEO REQUESTS
      const filter = {
        typeOfMedia: "Video",
      };

      // ==============================
      // CARD COUNTS
      // ==============================

      const totalRequests =
        await IndividualMedia.countDocuments(
          filter
        );

      const completedRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Completed",
        });

      const acknowledgedRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Approved",
        });

      const pendingAcknowledgementRequests =
        await IndividualMedia.countDocuments({
          ...filter,
          status: "Pending",
        });

      // ==============================
      // DEPARTMENT WISE
      // ==============================

      const departmentWise =
        await IndividualMedia.aggregate([
          {
            $match: filter,
          },

          {
            $lookup: {
              from: "faculties",
              localField: "employee",
              foreignField: "_id",
              as: "facultyData",
            },
          },

          {
            $unwind: "$facultyData",
          },

          {
            $group: {
              _id: "$facultyData.department",
              total: { $sum: 1 },
            },
          },

          {
            $project: {
              _id: 0,
              department: "$_id",
              total: 1,
            },
          },
        ]);

      // ==============================
      // LATEST REQUESTS
      // ==============================

      const latestRequests =
        await IndividualMedia.find(filter)
          .populate("employee")
          .sort({ createdAt: -1 })
          .limit(10);

      // ==============================
      // RESPONSE
      // ==============================

      res.status(200).json({
        success: true,

        cards: {
          totalRequests,
          completedRequests,
          acknowledgedRequests,
          pendingAcknowledgementRequests,
        },

        departmentWise,

        latestRequests,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };