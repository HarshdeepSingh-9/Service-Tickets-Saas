const mongoose = require("mongoose");

const AgentSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", AgentSchema);