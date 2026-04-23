const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const AuthSession = require("./models/AuthSession");
const Ticket = require("./models/Ticket");
const { JWT_SECRET } = require("./routes/auth");

const app = express();
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const apiRoutes = require("./routes/apiRoutes");
app.use("/api", apiRoutes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));

    const payload = jwt.verify(token, JWT_SECRET);
    const session = await AuthSession.findOne({ sessionId: payload.jti, active: true });
    if (!session) return next(new Error("Session expired"));

    socket.auth = {
      sub: String(payload.sub),
      role: payload.role,
      username: payload.username,
      jti: payload.jti
    };
    await AuthSession.updateOne({ sessionId: payload.jti }, { $set: { lastSeenAt: new Date() } });
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const auth = socket.auth;
  if (auth.role === "agent") {
    socket.join("agents");
  } else {
    socket.join(`user:${auth.sub}`);
  }

  socket.on("ticket:join", async ({ ticketId }) => {
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return;
    if (auth.role === "agent" || String(ticket.userId) === String(auth.sub)) {
      socket.join(`ticket:${ticketId}`);
      socket.emit("ticket:joined", { ticketId });
    }
  });

  socket.on("ticket:typing", async ({ ticketId, isTyping }) => {
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return;
    if (auth.role !== "agent" && String(ticket.userId) !== String(auth.sub)) return;

    socket.to(`ticket:${ticketId}`).emit("ticket:typing", {
      ticketId,
      isTyping: Boolean(isTyping),
      role: auth.role,
      username: auth.username
    });
  });

  socket.on("disconnect", async () => {
    await AuthSession.updateOne({ sessionId: auth.jti }, { $set: { lastSeenAt: new Date() } });
  });
});

const { seedIfEmpty } = require("./seed/seed");

async function startServer() {
  try {
    const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/solvex_a3";
    await mongoose.connect(MONGO_URL);
    await seedIfEmpty();
    const PORT = Number(process.env.PORT || 8080);
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
