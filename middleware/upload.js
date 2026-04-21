const multer = require("multer");

// store file in memory (best for excel processing)
const storage = multer.memoryStorage();

// create upload instance
const upload = multer({ storage });

module.exports = upload;