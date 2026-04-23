const jwt = require("jsonwebtoken");
const AuthSession = require("../models/AuthSession");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const session = await AuthSession.findOne({ sessionId: payload.jti, active: true }).lean();
    if (!session) return res.status(401).json({ error: "Session expired" });

    req.auth = {
      sub: payload.sub,
      role: payload.role,
      username: payload.username,
      jti: payload.jti,
      session
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth || req.auth.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
