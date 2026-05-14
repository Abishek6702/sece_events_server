const Transport = require("../../models/individual/IndividualTransport");

// ==============================
// CREATE TRANSPORT
// ==============================
exports.createTransport = async (req, res) => {
  try {
    const transport = await Transport.create(req.body);

    res.status(201).json({
      success: true,
      message: "Transport created successfully",
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ALL TRANSPORTS
// ==============================
exports.getAllTransports = async (req, res) => {
  try {
    const transports = await Transport.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transports.length,
      data: transports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE TRANSPORT
// ==============================
exports.getSingleTransport = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id).populate(
      "employee"
    );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE TRANSPORT
// ==============================
exports.updateTransport = async (req, res) => {
  try {
    const transport = await Transport.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transport updated successfully",
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DELETE TRANSPORT
// ==============================
exports.deleteTransport = async (req, res) => {
  try {
    const transport = await Transport.findByIdAndDelete(req.params.id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transport deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==============================
// PATCH TRANSPORT
// ==============================
exports.patchTransport = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    // Update only provided fields
    Object.keys(req.body).forEach((key) => {
      transport[key] = req.body[key];
    });

    await transport.save();

    res.status(200).json({
      success: true,
      message: "Transport patched successfully",
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};