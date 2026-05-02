const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const { getDashboardStats,getDepartmentWiseStats } = require("../controllers/dashboardController");

router.get('/stats', getDashboardStats);
router.get("/department-wise", getDepartmentWiseStats);

module.exports = router;