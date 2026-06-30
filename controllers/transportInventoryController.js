const TransportInventory = require("../models/TransportInventory");
const Event = require("../models/Event");

// ============================================
// CREATE INVENTORY
// ============================================

exports.createTransportInventory = async (req, res) => {
  try {
    const { vehicleType, totalCount, description } = req.body;

    const existing = await TransportInventory.findOne({
      vehicleType,
    });

    if (existing) {
      return res.status(400).json({
        message: "Vehicle type already exists",
      });
    }

    const inventory = await TransportInventory.create({
      vehicleType,
      totalCount,
      availableCount: totalCount,
      description,
    });

    res.status(201).json({
      message: "Transport inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================================
// GET ALL INVENTORY
// ============================================

exports.getAllTransportInventory = async (req, res) => {
  try {
    const inventory = await TransportInventory.find({
      isActive: true,
    }).sort({
      vehicleType: 1,
    });

    res.status(200).json({
      message: "Transport inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Fetch inventory error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================================
// GET SINGLE INVENTORY
// ============================================

exports.getTransportInventoryById = async (req, res) => {
  try {
    const inventory = await TransportInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    res.status(200).json({
      message: "Inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Fetch single inventory error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================================
// UPDATE INVENTORY
// ============================================

exports.updateTransportInventory = async (req, res) => {
  try {
    const inventory = await TransportInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    const { totalCount, description, isActive } = req.body;

    // =====================================
    // SAFE TOTAL COUNT UPDATE
    // =====================================

    if (totalCount !== undefined) {
      const bookedCount = inventory.totalCount - inventory.availableCount;

      // prevent invalid reduction

      if (totalCount < bookedCount) {
        return res.status(400).json({
          message: `Cannot reduce total count below booked count (${bookedCount})`,
        });
      }

      inventory.totalCount = totalCount;

      inventory.availableCount = totalCount - bookedCount;
    }

    // =====================================
    // DESCRIPTION
    // =====================================

    if (description !== undefined) {
      inventory.description = description;
    }

    // =====================================
    // ACTIVE STATUS
    // =====================================

    if (isActive !== undefined) {
      inventory.isActive = isActive;
    }

    await inventory.save();

    res.status(200).json({
      message: "Inventory updated successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================================
// DELETE INVENTORY
// ============================================

exports.deleteTransportInventory = async (req, res) => {
  try {
    const inventory = await TransportInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    // =====================================
    // PREVENT DELETE IF ACTIVE BOOKINGS
    // =====================================

    const bookedCount = inventory.totalCount - inventory.availableCount;

    if (bookedCount > 0) {
      return res.status(400).json({
        message: `Cannot delete. ${bookedCount} vehicles currently allocated`,
      });
    }

    // SOFT DELETE

    await TransportInventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Inventory deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


exports.getTransportAvailability = async (req, res) => {
  try {
    const {
      pickupDateTime,
      dropDateTime,
      eventId, // optional while editing existing event
    } = req.query;

    // ==========================
    // VALIDATION
    // ==========================

    if (!pickupDateTime || !dropDateTime) {
      return res.status(400).json({
        success: false,
        message:
          "pickupDateTime and dropDateTime are required",
      });
    }

    const requestedStart = new Date(pickupDateTime);
    const requestedEnd = new Date(dropDateTime);

    if (
      Number.isNaN(requestedStart.getTime()) ||
      Number.isNaN(requestedEnd.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (requestedStart >= requestedEnd) {
      return res.status(400).json({
        success: false,
        message:
          "dropDateTime must be greater than pickupDateTime",
      });
    }

    // ==========================
    // FETCH EVENTS
    // ==========================

    const eventQuery = {
      status: {
        $in: [
          "Submitted",
          "HodApproved",
          "Approved",
          "DepartmentReview",
        ],
      },
    };

    // Ignore current event while editing
    if (eventId) {
      eventQuery._id = { $ne: eventId };
    }

    const events = await Event.find(eventQuery)
      .select(
        "_id transportDetails.transports status"
      )
      .lean();

    const bookedVehicles = {};

    // ==========================
    // CALCULATE BOOKINGS
    // ==========================

    for (const event of events) {
      const transports =
        event.transportDetails?.transports || [];

      for (const transport of transports) {
        if (
          !transport.pickupDateTime ||
          !transport.dropDateTime
        ) {
          continue;
        }

        const bookingStart = new Date(
          transport.pickupDateTime
        );

        const bookingEnd = new Date(
          transport.dropDateTime
        );

        if (
          Number.isNaN(
            bookingStart.getTime()
          ) ||
          Number.isNaN(
            bookingEnd.getTime()
          )
        ) {
          continue;
        }

        // ==================================
        // TIME OVERLAP CHECK
        // ==================================
        //
        // Existing: 01:30 - 02:30
        // Request : 01:45 - 02:00
        // => OVERLAP
        //
        // Existing: 01:30 - 02:30
        // Request : 03:00 - 04:00
        // => NO OVERLAP
        //
        // ==================================

        const overlap =
          bookingStart < requestedEnd &&
          bookingEnd > requestedStart;

        if (!overlap) {
          continue;
        }

        const vehicles =
          transport.vehicles || [];

        for (const vehicle of vehicles) {
          if (
            !vehicle.type ||
            !vehicle.count
          ) {
            continue;
          }

          bookedVehicles[
            vehicle.type
          ] =
            (bookedVehicles[
              vehicle.type
            ] || 0) + vehicle.count;
        }
      }
    }

    // ==========================
    // INVENTORY
    // ==========================

    const inventory =
      await TransportInventory.find({
        isActive: true,
      })
        .sort({ vehicleType: 1 })
        .lean();

    const availability =
      inventory.map((item) => {
        const bookedCount =
          bookedVehicles[
            item.vehicleType
          ] || 0;

        const availableCount =
          Math.max(
            item.totalCount -
              bookedCount,
            0
          );

        return {
          vehicleType:
            item.vehicleType,

          totalCount:
            item.totalCount,

          bookedCount,

          availableCount,

          available:
            availableCount > 0,
        };
      });

    // ==========================
    // RESPONSE
    // ==========================

    return res.status(200).json({
      success: true,

      requestedWindow: {
        pickupDateTime:
          requestedStart,
        dropDateTime:
          requestedEnd,
      },

      data: availability,
    });
  } catch (error) {
    console.error(
      "Transport availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch transport availability",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};