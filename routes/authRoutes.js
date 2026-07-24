const express = require("express");
const {
  login,
  createAdmin,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  loginV1,
  verifyLoginOtp,
} = require("../controllers/authController");
const protect = require("../middleware/protect");

const router = express.Router();

router.post("/login/v1", loginV1);
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", changePassword);
router.post("/add-admin", createAdmin);
router.get("/me", protect, getProfile);

module.exports = router;
