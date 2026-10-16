const mongoose = require("mongoose");
const IndividualEventAttending = require("../../models/individual/IndividualEventAttending");
const IndividualAttendanceDocument = require("../../models/individual/IndividualAttendanceDocument");

const requiredDocumentNames = [
  "Jio Tag Required Document",
  "Report Required Document",
  "Certificate Required Document",
];
const validateDocumentUrl = (value) => {
  if (value === "") return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const normalizeDocuments = (documents) => {
  if (!Array.isArray(documents) || documents.length !== requiredDocumentNames.length) {
    return {
      error: "documents must contain exactly the three required document records.",
    };
  }

  const seenNames = new Set();
  const normalizedDocuments = [];

  for (const document of documents) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return { error: "Each document must be an object." };
    }

    const { documentName } = document;
    const suppliedUrl = document.documentUrl ?? "";

    if (!requiredDocumentNames.includes(documentName) || seenNames.has(documentName)) {
      return {
        error: "documents must contain each required document name exactly once.",
      };
    }
    seenNames.add(documentName);

    if (typeof suppliedUrl !== "string" || !validateDocumentUrl(suppliedUrl.trim())) {
      return {
        error: `documentUrl for '${documentName}' must be empty or a valid HTTP(S) URL.`,
      };
    }

    const normalizedUrl = suppliedUrl.trim();
    normalizedDocuments.push({
      documentName,
      documentUrl: normalizedUrl,
      status: normalizedUrl ? "Submitted" : "Not Submitted",
    });
  }

  return { documents: normalizedDocuments };
};

const isValidEventId = (eventId) =>
  typeof eventId === "string" && mongoose.isValidObjectId(eventId);

const toResponseData = (checklist) => ({
  event: checklist.event.toString(),
  documents: checklist.documents.map(({ documentName, documentUrl, status }) => ({
    documentName,
    documentUrl,
    status,
  })),
});

const respondWithError = (res, error, operation) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Attendance documents already exist for this event.",
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ success: false, message: error.message });
  }

  console.error(`Error ${operation} individual attendance documents:`, error);
  return res.status(500).json({
    success: false,
    message: `Failed to ${operation} individual attendance documents.`,
  });
};

exports.createDocuments = async (req, res) => {
  const { event, documents } = req.body || {};

  if (!isValidEventId(event)) {
    return res.status(400).json({
      success: false,
      message: "event must be a valid event ID.",
    });
  }

  const normalized = normalizeDocuments(documents);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }

  try {
    const existingRequest = await IndividualEventAttending.findById(event).select("_id");
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Individual event attending request not found.",
      });
    }

    const existingChecklist = await IndividualAttendanceDocument.findOne({ event }).select("_id");
    if (existingChecklist) {
      return res.status(409).json({
        success: false,
        message: "Attendance documents already exist for this event.",
      });
    }

    const checklist = await IndividualAttendanceDocument.create({
      event,
      documents: normalized.documents,
    });

    return res.status(201).json({
      success: true,
      message: "Documents processed successfully",
      data: toResponseData(checklist),
    });
  } catch (error) {
    return respondWithError(res, error, "create");
  }
};

exports.getDocuments = async (_req, res) => {
  try {
    const checklists = await IndividualAttendanceDocument.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: checklists.length,
      data: checklists.map(toResponseData),
    });
  } catch (error) {
    return respondWithError(res, error, "fetch");
  }
};

exports.getDocumentsByEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidEventId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID." });
  }

  try {
    const checklist = await IndividualAttendanceDocument.findOne({ event: eventId }).lean();
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Attendance documents not found for this event.",
      });
    }

    return res.status(200).json({ success: true, data: toResponseData(checklist) });
  } catch (error) {
    return respondWithError(res, error, "fetch");
  }
};

exports.updateDocuments = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidEventId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID." });
  }

  const normalized = normalizeDocuments(req.body?.documents);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }

  try {
    const checklist = await IndividualAttendanceDocument.findOne({ event: eventId });
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Attendance documents not found for this event.",
      });
    }

    checklist.documents = normalized.documents;
    await checklist.save();

    return res.status(200).json({
      success: true,
      message: "Individual attendance documents updated successfully.",
      data: toResponseData(checklist),
    });
  } catch (error) {
    return respondWithError(res, error, "update");
  }
};

exports.deleteDocuments = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidEventId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID." });
  }

  try {
    const checklist = await IndividualAttendanceDocument.findOneAndDelete({ event: eventId });
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Attendance documents not found for this event.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Individual attendance documents deleted successfully.",
      data: toResponseData(checklist),
    });
  } catch (error) {
    return respondWithError(res, error, "delete");
  }
};
