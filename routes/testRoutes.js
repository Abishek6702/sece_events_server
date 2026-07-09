const express = require("express");
const router = express.Router();

const generateIQACNumber = require("../utils/generateIQACNumber");

router.get("/test", async (req, res) => {
  const iqac = await generateIQACNumber("CSE");

  res.json({
    iqac,
  });
});

module.exports = router;