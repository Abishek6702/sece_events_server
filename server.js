const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const venueRoutes = require("./routes/venueRoutes");
const eventRoutes = require("./routes/eventRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const foodRoutes = require("./routes/individual/foodRoutes");
const individualMediaRoutes = require("./routes/individual/mediaRoutes");
const transportRoutes = require("./routes/individual/transportsRoutes");
const purchaseRoutes = require("./routes/individual/purchaseRoutes");
const feedbackRoutes = require("./routes/feedackRoutes");
const mediaStaffChangeRoutes = require("./routes/mediaStaffChangeRoutes");
const transportInventoryRoutes = require("./routes/transportInventoryRoutes");
const tableRoutes = require("./routes/tableRoutes");
const eventTypeRoutes = require("./routes/eventTypeRoutes");

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

connectDB();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/individual-media", individualMediaRoutes);
app.use("/api/transports", transportRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/media-staff-change", mediaStaffChangeRoutes);
app.use("/api/transport-inventory", transportInventoryRoutes);
app.use("/api/table", tableRoutes);
app.use("/api/eventTypes", eventTypeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
