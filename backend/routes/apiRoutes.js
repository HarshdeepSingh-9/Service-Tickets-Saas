const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/User");
const Agent = require("../models/Agent");
const Ticket = require("../models/Ticket");
const AuthSession = require("../models/AuthSession");
const { requireAuth, requireRole, JWT_SECRET } = require("./auth");

const router = express.Router();
const TOKEN_EXPIRES = "8h";

function signToken({ id, role, username, sessionId }) {
  return jwt.sign({ sub: String(id), role, username, jti: sessionId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

function ticketScope(auth) {
  return auth.role === "agent" ? {} : { userId: auth.sub };
}

async function emitTicketAndDash(io, ticketId) {
  if (!io) return;
  const ticket = await Ticket.findById(ticketId).lean();
  if (!ticket) return;

  io.to(`ticket:${ticketId}`).emit("ticket:updated", ticket);

  const userCounts = await Ticket.aggregate([
    { $match: { userId: ticket.userId } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  io.to(`user:${ticket.userId}`).emit("dashboard:updated", {
    scope: "user",
    userId: String(ticket.userId),
    counts: userCounts
  });

  const globalCounts = await Ticket.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  io.to("agents").emit("dashboard:updated", {
    scope: "agent",
    counts: globalCounts
  });
}

// ----------------------- AUTH -----------------------

router.post("/auth/user/signup", async (req, res) => {
  try {
    const { username, password, email, displayName } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: "Username already exists" });

    const legacyId = Date.now();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      legacyId,
      username,
      email: email || (username.includes("@") ? username : ""),
      displayName: displayName || username,
      passwordHash
    });

    const sessionId = uuidv4();
    await AuthSession.create({
      sessionId,
      userRef: user._id,
      userModel: "User",
      role: "user",
      username: user.username
    });

    const token = signToken({ id: user._id, role: "user", username: user.username, sessionId });
    return res.status(201).json({
      token,
      role: "user",
      userId: user._id,
      legacyId: user.legacyId,
      username: user.username,
      displayName: user.displayName
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Duplicate" });
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/user/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const sessionId = uuidv4();
    await AuthSession.create({
      sessionId,
      userRef: user._id,
      userModel: "User",
      role: "user",
      username: user.username
    });

    const token = signToken({ id: user._id, role: "user", username: user.username, sessionId });
    return res.json({
      token,
      role: "user",
      userId: user._id,
      legacyId: user.legacyId,
      username: user.username,
      displayName: user.displayName
    });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/agent/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    const agent = await Agent.findOne({ username });
    if (!agent) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, agent.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const sessionId = uuidv4();
    await AuthSession.create({
      sessionId,
      userRef: agent._id,
      userModel: "Agent",
      role: "agent",
      username: agent.username
    });

    const token = signToken({ id: agent._id, role: "agent", username: agent.username, sessionId });
    return res.json({
      token,
      role: "agent",
      agentId: agent._id,
      legacyId: agent.legacyId,
      username: agent.username,
      displayName: agent.displayName
    });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  await AuthSession.updateOne({ sessionId: req.auth.jti }, { $set: { active: false, lastSeenAt: new Date() } });
  return res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    role: req.auth.role,
    userId: req.auth.sub,
    username: req.auth.username,
    sessionId: req.auth.jti
  });
});

// ----------------------- USER TICKETS -----------------------

router.post("/user/tickets", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const { title, type, description, priority } = req.body || {};
    if (!title || !description) return res.status(400).json({ error: "title and description required" });

    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(401).json({ error: "Invalid user" });

    const ticket = await Ticket.create({
      legacyId: Date.now(),
      userId: user._id,
      userLegacyId: user.legacyId,
      userEmail: user.email || user.username,
      title,
      type: type || "support",
      description,
      status: "Open",
      priority: priority || "Normal",
      messages: [
        {
          message: description,
          authorRole: "user",
          authorName: user.displayName || user.username,
          internal: false
        }
      ]
    });

    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.status(201).json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/tickets", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.auth.sub }).sort({ updatedAt: -1 });
    return res.json(tickets);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/tickets/:id", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.auth.sub });
    if (!ticket) return res.status(404).json({ error: "Not found" });
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/user/tickets/:id/messages", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });

    const user = await User.findById(req.auth.sub);
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.sub },
      {
        $push: {
          messages: {
            message,
            authorRole: "user",
            authorName: user?.displayName || user?.username || "User",
            internal: false,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: "Not found" });
    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/user/tickets/:id", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ _id: req.params.id, userId: req.auth.sub });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// ----------------------- AGENT TICKETS -----------------------

router.get("/agent/tickets", requireAuth, requireRole("agent"), async (_req, res) => {
  try {
    const tickets = await Ticket.find().sort({ updatedAt: -1 });
    return res.json(tickets);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/agent/tickets/:id", requireAuth, requireRole("agent"), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Not found" });
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/agent/tickets/:id", requireAuth, requireRole("agent"), async (req, res) => {
  try {
    const safe = {
      status: req.body?.status,
      priority: req.body?.priority,
      description: req.body?.description,
      assignedAgentName: req.body?.assignedAgentName
    };

    const agent = await Agent.findById(req.auth.sub);
    const update = { $set: {} };
    if (safe.status) update.$set.status = safe.status;
    if (safe.priority) update.$set.priority = safe.priority;
    if (typeof safe.description === "string") update.$set.description = safe.description;
    update.$set.assignedAgentId = agent?._id || null;
    update.$set.assignedAgentName = safe.assignedAgentName || agent?.displayName || agent?.username || "Agent";

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ error: "Not found" });

    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/agent/tickets/:id/reply", requireAuth, requireRole("agent"), async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });

    const agent = await Agent.findById(req.auth.sub);

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          assignedAgentId: agent?._id || null,
          assignedAgentName: agent?.displayName || agent?.username || "Agent",
          status: "In Progress"
        },
        $push: {
          messages: {
            message,
            authorRole: "agent",
            authorName: agent?.displayName || agent?.username || "Agent",
            internal: false,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: "Not found" });
    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/agent/tickets/:id/notes", requireAuth, requireRole("agent"), async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });

    const agent = await Agent.findById(req.auth.sub);

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          assignedAgentId: agent?._id || null,
          assignedAgentName: agent?.displayName || agent?.username || "Agent"
        },
        $push: {
          messages: {
            message,
            authorRole: "agent",
            authorName: agent?.displayName || agent?.username || "Agent",
            internal: true,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: "Not found" });
    await emitTicketAndDash(req.app.get("io"), ticket._id);
    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
