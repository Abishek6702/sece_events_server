const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Base upload directory
const uploadDir = path.join(__dirname, "../uploads");

// Helper to slugify event names for safe filesystem filenames
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")         // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-");        // Replace multiple - with single -
};

// Setup Disk Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subDir = "individual";
    if (req.originalUrl.includes("/faculty")) {
      subDir = "profiles";
    } else if (req.originalUrl.includes("/events")) {
      subDir = "events";
    }
    
    file.subDir = subDir; // attach custom property to easily reference later

    const targetDir = path.join(uploadDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    let basePrefix = "";
    
    // 1. Check if event name is in req.body
    if (req.body.requestDetails) {
      try {
        const reqDetails = typeof req.body.requestDetails === "string"
          ? JSON.parse(req.body.requestDetails)
          : req.body.requestDetails;
        const eventName = reqDetails?.eventDetails?.eventName;
        if (eventName) {
          basePrefix = slugify(eventName);
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // 2. If no event name, check if it's faculty profile
    if (!basePrefix && req.originalUrl.includes("/faculty")) {
      const pathParts = req.originalUrl.split("?")[0].split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (/^[0-9a-fA-F]{24}$/.test(lastPart)) {
        basePrefix = `profile-${lastPart}`;
      } else {
        basePrefix = "profile";
      }
    }
    
    // 3. Fallback to just the field name
    if (!basePrefix) {
      basePrefix = file.fieldname || "file";
    } else {
      // Append fieldname
      basePrefix = `${basePrefix}-${file.fieldname || "file"}`;
    }
    
    // Generate unique name: basePrefix + timestamp + random suffix + original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${basePrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File Filter 
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, .png, .pdf allowed"));
  }
};

// Create Multer Upload Middleware
const upload = multer({ storage, fileFilter });

// Wrapper to modify the file paths to HTTP URLs dynamically
const wrapMiddleware = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      const hostUrl = `${req.protocol}://${req.get("host")}`;
      
      if (req.file) {
        const sub = req.file.subDir || "individual";
        req.file.path = `${hostUrl}/uploads/${sub}/${req.file.filename}`;
      }
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach(file => {
            const sub = file.subDir || "individual";
            file.path = `${hostUrl}/uploads/${sub}/${file.filename}`;
          });
        } else {
          Object.keys(req.files).forEach(fieldName => {
            if (Array.isArray(req.files[fieldName])) {
              req.files[fieldName].forEach(file => {
                const sub = file.subDir || "individual";
                file.path = `${hostUrl}/uploads/${sub}/${file.filename}`;
              });
            }
          });
        }
      }
      
      next();
    });
  };
};

module.exports = {
  single: (fieldname) => wrapMiddleware(upload.single(fieldname)),
  array: (fieldname, maxCount) => wrapMiddleware(upload.array(fieldname, maxCount)),
  fields: (fields) => wrapMiddleware(upload.fields(fields)),
  none: () => wrapMiddleware(upload.none()),
  any: () => wrapMiddleware(upload.any()),
};
