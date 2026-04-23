const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const { Server } = require("socket.io");

// Dummy secret
const JWT_SECRET = "demo_secret";

// 🔥 Dummy in-memory data
let sessions = [
  { sessionId: "123", userId: "1", role: "user", username: "harsh", active: true }
];

let tickets = [
  { _id: "1", userId: "1", title: "Login issue" }
];

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Basic API
app.get("/api/tickets", (req, res) => {
  res.json(tickets);
});

app.get("/", (_req, res) => {
  res.send("Backend running 🚀");
});

// 🔥 Socket auth (NO DB)
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));

    const payload = jwt.verify(token, JWT_SECRET);

    const session = sessions.find(s => s.sessionId === payload.jti && s.active);
    if (!session) return next(new Error("Session expired"));

    socket.auth = {
      sub: payload.sub,
      role: payload.role,
      username: payload.username,
      jti: payload.jti
    };

    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

// 🔥 Socket logic
io.on("connection", (socket) => {
  const auth = socket.auth;

  if (auth.role === "agent") {
    socket.join("agents");
  } else {
    socket.join(`user:${auth.sub}`);
  }

  socket.on("ticket:join", ({ ticketId }) => {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;

    if (auth.role === "agent" || ticket.userId === auth.sub) {
      socket.join(`ticket:${ticketId}`);
      socket.emit("ticket:joined", { ticketId });
    }
  });

  socket.on("ticket:typing", ({ ticketId, isTyping }) => {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;

    if (auth.role !== "agent" && ticket.userId !== auth.sub) return;

    socket.to(`ticket:${ticketId}`).emit("ticket:typing", {
      ticketId,
      isTyping: Boolean(isTyping),
      role: auth.role,
      username: auth.username
    });
  });
});

// 🚀 Start server (NO DB)
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
