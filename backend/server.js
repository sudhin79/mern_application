const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = 5003;

/* -----------------------
   Middleware
------------------------ */
app.use(express.json());

/* -----------------------
   MongoDB Connection
------------------------ */
const MONGO_USER = process.env.MONGO_INITDB_ROOT_USERNAME;
const MONGO_PASS = process.env.MONGO_INITDB_ROOT_PASSWORD;
const MONGO_DB   = process.env.MONGO_DB_NAME || "appdb";
const MONGO_HOST = process.env.MONGO_HOST || "mongodb";

const mongoURL = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:27017/${MONGO_DB}?authSource=admin`;

mongoose.connect(mongoURL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

/* -----------------------
   Database Schema
------------------------ */
const DataSchema = new mongoose.Schema({
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const DataModel = mongoose.model("Data", DataSchema);

/* -----------------------
   Simple Auth Middleware
------------------------ */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme";

function authMiddleware(req, res, next) {
  const token = req.headers["x-admin-token"];

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  next();
}

/* -----------------------
   Public API
   Anyone can submit data
------------------------ */
app.post("/submit", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const entry = new DataModel({ message });
    await entry.save();

    res.status(201).json({ success: true, message: "Data saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to save data" });
  }
});

/* -----------------------
   Protected API
   Only authorized users can view data
------------------------ */
app.get("/data", authMiddleware, async (req, res) => {
  try {
    const allData = await DataModel.find().sort({ createdAt: -1 });
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

/* -----------------------
   Health Check
------------------------ */
app.get("/", (req, res) => {
  res.json({ status: "Backend running" });
});

/* -----------------------
   Start Server
------------------------ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
});

