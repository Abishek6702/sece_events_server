const EventType = require("../models/EventType");

// Create Event Type
exports.createEventType = async (req, res) => {
  try {
    const { eventType, documents } = req.body;

    const exists = await EventType.findOne({ eventType });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Event type already exists",
      });
    }

    const event = await EventType.create({
      eventType,
      documents,
    });

    return res.status(201).json({
      success: true,
      message: "Event type created successfully",
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Event Types
exports.getAllEventTypes = async (req, res) => {
  try {
    const events = await EventType.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Event Type
exports.getEventType = async (req, res) => {
  try {
    const event = await EventType.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event type not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Event Type (Replace whole document list)
exports.updateEventType = async (req, res) => {
  try {
    const { eventType, documents } = req.body;

    const event = await EventType.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event type not found",
      });
    }

    event.eventType = eventType;
    event.documents = documents;

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event type updated successfully",
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Entire Event Type
exports.deleteEventType = async (req, res) => {
  try {
    const event = await EventType.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event type not found",
      });
    }

    await EventType.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Event type deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Particular Document
exports.deleteDocument = async (req, res) => {
  try {
    const { eventId, documentId } = req.params;

    const event = await EventType.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event type not found",
      });
    }

    event.documents = event.documents.filter(
      (doc) => doc._id.toString() !== documentId
    );

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Document removed successfully",
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle Document Active Status
exports.toggleDocumentStatus = async (req, res) => {
  try {
    const { eventId, documentId } = req.params;

    const event = await EventType.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event type not found",
      });
    }

    const document = event.documents.id(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    document.isActive = !document.isActive;

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Document status updated",
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};