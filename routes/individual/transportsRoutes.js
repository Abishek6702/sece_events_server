const express = require("express");
const router = express.Router();

const {
  createTransport,
  getAllTransports,
  getSingleTransport,
  updateTransport,
  deleteTransport,
  patchTransport,getTransportDashboard
} = require("../../controllers/individual/transportController");

// CREATE
router.post("/", createTransport);

// GET ALL
router.get("/", getAllTransports);

// GET SINGLE
router.get("/:id", getSingleTransport);

// UPDATE
router.put("/:id", updateTransport);

// DELETE
router.delete("/:id", deleteTransport);
//patch
router.patch(
  "/:id",patchTransport
);
//dashboard
router.get("/", getTransportDashboard);
module.exports = router;