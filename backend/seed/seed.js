const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Agent = require("../models/Agent");
const Ticket = require("../models/Ticket");

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw || "[]");
}

async function seedUsersIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const usersPath = path.join(__dirname, "../data/users.json");
  const users = readJSON(usersPath);

  const docs = [];
  for (const u of users) {
    docs.push({
      legacyId: u.id,
      username: u.username,
      displayName: u.username,
      email: u.username.includes("@") ? u.username : `${u.username}@demo.local`,
      passwordHash: await bcrypt.hash(u.password, 10)
    });
  }

  if (docs.length) {
    await User.insertMany(docs, { ordered: false });
    console.log(`Seeded Users (${docs.length})`);
  }
}

async function seedAgentsIfEmpty() {
  const count = await Agent.countDocuments();
  if (count > 0) return;

  const agentsPath = path.join(__dirname, "../data/agents.json");
  const agents = readJSON(agentsPath);

  const docs = [];
  for (const a of agents) {
    docs.push({
      legacyId: a.id,
      username: a.username,
      displayName: a.username,
      passwordHash: await bcrypt.hash(a.password, 10)
    });
  }

  if (docs.length) {
    await Agent.insertMany(docs, { ordered: false });
    console.log(`Seeded Agents (${docs.length})`);
  }
}

async function seedTicketsIfEmpty() {
  const count = await Ticket.countDocuments();
  if (count > 0) return;

  const ticketsPath = path.join(__dirname, "../data/tickets.json");
  const tickets = readJSON(ticketsPath);
  const users = await User.find({}, { _id: 1, legacyId: 1, username: 1, email: 1, displayName: 1 }).lean();

  function pickUser(email) {
    const needle = String(email || "").toLowerCase();
    return users.find((u) => String(u.email || "").toLowerCase() === needle)
      || users.find((u) => String(u.username || "").toLowerCase() === needle)
      || users[0];
  }

  const docs = tickets.map((t) => {
    const owner = pickUser(t.userEmail);
    return {
      legacyId: t.id,
      userId: owner ? owner._id : undefined,
      userLegacyId: owner ? owner.legacyId : undefined,
      userEmail: owner?.email || t.userEmail || owner?.username,
      title: t.title,
      type: t.type || "support",
      description: t.description,
      status: t.status === "Resolved" ? "Resolved" : "Open",
      priority: "Normal",
      messages: [
        {
          message: t.description,
          authorRole: "user",
          authorName: owner?.displayName || owner?.username || "User",
          internal: false,
          timestamp: new Date()
        },
        ...(Array.isArray(t.messages)
          ? t.messages.map((m) => ({
              message: m.message,
              authorRole: "agent",
              authorName: m.agent || "Agent",
              internal: false,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
            }))
          : [])
      ]
    };
  }).filter((d) => d.userId);

  if (docs.length) {
    await Ticket.insertMany(docs, { ordered: false });
    console.log(`Seeded Tickets (${docs.length})`);
  }
}

async function seedIfEmpty() {
  await seedUsersIfEmpty();
  await seedAgentsIfEmpty();
  await seedTicketsIfEmpty();
}

module.exports = { seedIfEmpty };
