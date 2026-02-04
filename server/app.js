const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const eventRoutes = require("./routes/eventRoutes");
const skillSwapRoutes = require("./routes/skillSwapRoutes");
const studyBuddyRoutes = require("./routes/studyBuddyRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/skill-swap", skillSwapRoutes);
app.use("/api/study-buddy", studyBuddyRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

module.exports = app;
