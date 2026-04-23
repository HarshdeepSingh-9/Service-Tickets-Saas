const mongoose = require("mongoose");

const AuthSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userRef: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "userModel" },
    userModel: { type: String, enum: ["User", "Agent"], required: true },
    role: { type: String, enum: ["user", "agent"], required: true },
    username: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuthSession", AuthSessionSchema);
