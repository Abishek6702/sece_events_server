const EventClosingDocument = require("../models/EventClosingDocumentSchema");
const Event = require("../models/Event");
const cloudinary = require("cloudinary").v2;

// Utility to parse JSON safely
const parseData = (dataStr) => {
  try {
    return typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
  } catch (err) {
    throw new Error("Invalid JSON data format");
  }
};

// Utility to find file by fieldname from multer upload.any()
const findFileByFieldname = (files, fieldname) => {
  if (!files || !Array.isArray(files)) return null;
  return files.find((file) => file.fieldname === fieldname);
};

exports.createEventClosingDocument = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: "Missing data field in request" });
    }

    const parsedData = parseData(data);
    const { eventId, documents } = parsedData;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required" });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.status !== "Approved") {
      return res.status(403).json({ success: false, message: "Only approved events can have closing documents" });
    }

    // Check for duplicate
    const existingDoc = await EventClosingDocument.findOne({ eventId });
    if (existingDoc) {
      return res.status(409).json({ success: false, message: "Closing documents already exist for this event" });
    }

    // Process documents and attach uploaded files
    const processedDocuments = [];
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.fileRef) {
          const file = findFileByFieldname(req.files, doc.fileRef);
          if (file) {
            processedDocuments.push({
              key: doc.key,
              label: doc.label,
              file: {
                url: file.path,
                publicId: file.filename,
              },
            });
          }
        }
      }
    }

    const newClosingDocument = new EventClosingDocument({
      eventId,
      documents: processedDocuments,
    });

    await newClosingDocument.save();

    // Update event flag
    event.isDocumentsCompleted = true;
    await event.save();

    res.status(201).json({
      success: true,
      message: "Event closing documents created successfully",
      data: newClosingDocument,
    });
  } catch (error) {
    console.error("Error creating closing document:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getEventClosingDocuments = async (req, res) => {
  try {
    const documents = await EventClosingDocument.find().populate("eventId", "requestDetails.eventDetails.eventName iqacNumber status");
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Error fetching closing documents:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEventClosingDocumentById = async (req, res) => {
  try {
    const document = await EventClosingDocument.findById(req.params.id).populate("eventId", "requestDetails.eventDetails.eventName iqacNumber status");
    if (!document) {
      return res.status(404).json({ success: false, message: "Closing document not found" });
    }
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    console.error("Error fetching closing document by ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEventClosingDocumentByEventId = async (req, res) => {
  try {
    const document = await EventClosingDocument.findOne({ eventId: req.params.eventId }).populate("eventId");
    if (!document) {
      return res.status(404).json({ success: false, message: "No closing document found for this event" });
    }
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    console.error("Error fetching closing document by event ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEventClosingDocumentsByFacultyId = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Find all events where the faculty is the organizer
    const events = await Event.find(
      { organizerId: facultyId },
      "_id",
    );

    if (!events.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No events found for this faculty",
      });
    }

    const eventIds = events.map((e) => e._id);

    const documents = await EventClosingDocument.find({
      eventId: { $in: eventIds },
    }).populate(
      "eventId",
      "requestDetails.eventDetails.eventName iqacNumber status",
    );

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Error fetching closing documents by faculty ID:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.updateEventClosingDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: "Missing data field in request" });
    }

    const parsedData = parseData(data);
    const { documents, editRemark } = parsedData;

    const existingDocRecord = await EventClosingDocument.findById(id).populate("eventId", "status");
    if (!existingDocRecord) {
      return res.status(404).json({ success: false, message: "Closing document not found" });
    }

    if (existingDocRecord.eventId && existingDocRecord.eventId.status !== "Approved") {
      return res.status(403).json({ success: false, message: "Cannot update documents for a non-approved event" });
    }

    // Keep track of existing publicIds to determine which ones to delete
    const oldPublicIds = existingDocRecord.documents.map((d) => d.file.publicId);
    const newPublicIdsToKeep = [];

    const processedDocuments = [];
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.fileRef) {
          // It's a newly uploaded file
          const file = findFileByFieldname(req.files, doc.fileRef);
          if (file) {
            processedDocuments.push({
              key: doc.key,
              label: doc.label,
              file: {
                url: file.path,
                publicId: file.filename,
              },
            });
          }
        } else if (doc.file && doc.file.publicId) {
          // It's an existing file being kept
          newPublicIdsToKeep.push(doc.file.publicId);
          processedDocuments.push({
            key: doc.key,
            label: doc.label,
            file: {
              url: doc.file.url,
              publicId: doc.file.publicId,
            },
          });
        }
      }
    }

    // Identify and delete orphaned Cloudinary files
    const publicIdsToDelete = oldPublicIds.filter((id) => !newPublicIdsToKeep.includes(id));
    for (const publicId of publicIdsToDelete) {
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error(`Failed to delete cloudinary asset: ${publicId}`, err);
        }
      }
    }

    existingDocRecord.documents = processedDocuments;
    if (editRemark !== undefined) {
      existingDocRecord.editRemark = editRemark;
      existingDocRecord.editedAt = new Date();
    }
    await existingDocRecord.save();

    res.status(200).json({
      success: true,
      message: "Event closing documents updated successfully",
      data: existingDocRecord,
    });
  } catch (error) {
    console.error("Error updating closing document:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
