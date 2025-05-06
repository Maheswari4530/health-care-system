// server.js (Express Backend)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/healthcare", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const doctorSchema = new mongoose.Schema({
  name: String,
  specialty: String,
  available: Boolean,
});

const Doctor = mongoose.model("Doctor", doctorSchema);

// API to fetch doctors
app.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



