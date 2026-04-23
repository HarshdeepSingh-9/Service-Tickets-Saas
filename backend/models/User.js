const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);