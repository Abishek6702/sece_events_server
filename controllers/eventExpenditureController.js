const EventExpenditure = require("../models/EventExpenditure");
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

// Utility to find files by fieldname prefix/pattern
const findFilesByFieldname = (files, fieldnamePattern) => {
  if (!files || !Array.isArray(files)) return [];
  // Exact match for the fieldname
  return files.filter((file) => file.fieldname === fieldnamePattern);
};

// Calculate total expenditure amount
const calculateTotalAmount = (expenditureData) => {
  let total = 0;
  const sections = ["food", "accommodation", "transport", "remuneration", "gifts", "kits", "miscellaneous"];
  
  for (const section of sections) {
    if (Array.isArray(expenditureData[section])) {
      total += expenditureData[section].reduce((sum, item) => sum + (Number(item.billAmount) || 0), 0);
    }
  }
  return total;
};

// Process an expenditure section, attaching uploaded files and keeping existing ones
const processExpenditureSection = (sectionData, files) => {
  if (!Array.isArray(sectionData)) return [];

  return sectionData.map((item) => {
    const processedItem = { ...item };

    const supportingDocuments = [];

    // Process supporting documents
    if (Array.isArray(item.supportingDocuments)) {
      item.supportingDocuments.forEach((doc) => {
        if (doc.fileRef) {
          const uploadedFiles = findFilesByFieldname(
            files,
            doc.fileRef
          );

          uploadedFiles.forEach((file) => {
            supportingDocuments.push({
              url: file.path,
              publicId: file.filename,
            });
          });
        }

        // Keep existing Cloudinary document
        if (doc.url && doc.publicId) {
          supportingDocuments.push({
            url: doc.url,
            publicId: doc.publicId,
          });
        }
      });
    }

    processedItem.supportingDocuments = supportingDocuments;

    return processedItem;
  });
};

// Get all publicIds from a nested expenditure object
const extractAllPublicIds = (expenditureObj) => {
  let ids = [];
  const sections = ["food", "accommodation", "transport", "remuneration", "gifts", "kits", "miscellaneous"];
  
  for (const section of sections) {
    if (Array.isArray(expenditureObj[section])) {
      for (const item of expenditureObj[section]) {
        if (Array.isArray(item.supportingDocuments)) {
          ids = ids.concat(item.supportingDocuments.map(doc => doc.publicId).filter(Boolean));
        }
      }
    }
  }
  return ids;
};

exports.createEventExpenditure = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: "Missing data field in request" });
    }

    const parsedData = parseData(data);
    const { eventId } = parsedData;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required" });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.status !== "Approved") {
      return res.status(403).json({ success: false, message: "Only approved events can have expenditures" });
    }

    // Check for duplicate
    const existingExp = await EventExpenditure.findOne({ eventId });
    if (existingExp) {
      return res.status(409).json({ success: false, message: "Expenditure record already exists for this event" });
    }

    const sections = ["food", "accommodation", "transport", "remuneration", "gifts", "kits", "miscellaneous"];
    
    if (!parsedData.expenditure) {
      parsedData.expenditure = {};
    }

    for (const section of sections) {
      if (parsedData.expenditure[section]) {
        parsedData.expenditure[section] = processExpenditureSection(parsedData.expenditure[section], req.files, section);
      }
    }

    parsedData.expenditure.totalAmount = calculateTotalAmount(parsedData.expenditure);

    const newExpenditure = new EventExpenditure(parsedData);
    await newExpenditure.save();

    // Update event flag
    event.isExpenditureCompleted = true;
    await event.save();

    res.status(201).json({
      success: true,
      message: "Event expenditure created successfully",
      data: newExpenditure,
    });
  } catch (error) {
    console.error("Error creating expenditure:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getEventExpenditures = async (req, res) => {
  try {
    const expenditures = await EventExpenditure.find().populate("eventId", "requestDetails.eventDetails.eventName iqacNumber status");
    res.status(200).json({
      success: true,
      count: expenditures.length,
      data: expenditures,
    });
  } catch (error) {
    console.error("Error fetching expenditures:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEventExpenditureById = async (req, res) => {
  try {
    const expenditure = await EventExpenditure.findById(req.params.id).populate("eventId", "requestDetails.eventDetails.eventName iqacNumber status");
    if (!expenditure) {
      return res.status(404).json({ success: false, message: "Expenditure not found" });
    }
    res.status(200).json({ success: true, data: expenditure });
  } catch (error) {
    console.error("Error fetching expenditure by ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEventExpenditureByEventId = async (req, res) => {
  try {
    const expenditure = await EventExpenditure.findOne({ eventId: req.params.eventId }).populate("eventId", "requestDetails.eventDetails.eventName iqacNumber status");
    if (!expenditure) {
      return res.status(404).json({ success: false, message: "No expenditure found for this event" });
    }
    res.status(200).json({ success: true, data: expenditure });
  } catch (error) {
    console.error("Error fetching expenditure by event ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateEventExpenditure = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: "Missing data field in request" });
    }

    const parsedData = parseData(data);
    const existingExpRecord = await EventExpenditure.findById(id).populate("eventId", "status");
    
    if (!existingExpRecord) {
      return res.status(404).json({ success: false, message: "Expenditure record not found" });
    }

    if (existingExpRecord.eventId && existingExpRecord.eventId.status !== "Approved") {
      return res.status(403).json({ success: false, message: "Cannot update expenditures for a non-approved event" });
    }

    const oldPublicIds = extractAllPublicIds(existingExpRecord.expenditure || {});
    
    if (!parsedData.expenditure) {
      parsedData.expenditure = {};
    }

    const sections = ["food", "accommodation", "transport", "remuneration", "gifts", "kits", "miscellaneous"];
    
    for (const section of sections) {
      if (parsedData.expenditure[section]) {
        parsedData.expenditure[section] = processExpenditureSection(parsedData.expenditure[section], req.files, section);
      } else {
         // Keep existing if not provided, or clear if explicitly sent as empty array. Assuming full replace of sections provided.
         // If a section is missing from payload, it's safer to retain existing or overwrite based on frontend design.
         // Given standard PUT behavior, we replace. So we should set to empty if not provided.
         parsedData.expenditure[section] = [];
      }
    }

    parsedData.expenditure.totalAmount = calculateTotalAmount(parsedData.expenditure);
    
    // Determine new public IDs
    const newPublicIdsToKeep = extractAllPublicIds(parsedData.expenditure);

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

    // Merge non-expenditure fields
    const updatedFields = {
        ...parsedData,
        expenditure: {
           ...existingExpRecord.expenditure.toObject(),
           ...parsedData.expenditure
        }
    };

    if (parsedData.editRemark !== undefined) {
      updatedFields.editRemark = parsedData.editRemark;
      updatedFields.editedAt = new Date();
    }

    const updatedExp = await EventExpenditure.findByIdAndUpdate(
        id, 
        updatedFields, 
        { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Event expenditure updated successfully",
      data: updatedExp,
    });
  } catch (error) {
    console.error("Error updating expenditure:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
