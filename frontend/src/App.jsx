import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { loadAuth, clearAuth } from "./components/auth.js";
import { resetSocket } from "./components/socket.js";
import { apiPost } from "./components/api.js";

import Landing from "./pages/Landing.jsx";
import UserLogin from "./pages/UserLogin.jsx";
import AgentLogin from "./pages/AgentLogin.jsx";
import UserSignup from "./pages/UserSignup.jsx";

import UserDashboard from "./pages/user/UserDashboard.jsx";
import UserNewTicket from "./pages/user/UserNewTicket.jsx";
import UserTicketDetail from "./pages/user/UserTicketDetail.jsx";

import AgentDashboard from "./pages/agent/AgentDashboard.jsx";
import AgentTicketDetail from "./pages/agent/AgentTicketDetail.jsx";

function Guard({ role, children }) {
  const auth = loadAuth();
  const loc = useLocation();
  if (!auth?.token) return <Navigate to="/login-user" replace state={{ from: loc.pathname }} />;
  if (role && auth.role !== role) return <Navigate to="/" replace />;
  return children;
}

function MetricChip({ children }) {
  return <div className="metricChip">{children}</div>;
}

function Shell({ children }) {
  const auth = loadAuth();
  const loc = useLocation();

  const links = auth?.role === "agent"
    ? [{ to: "/agent", label: "Agent Command Center" }]
    : auth?.role === "user"
      ? [
          { to: "/user", label: "My Workspace" },
          { to: "/user/new", label: "Create Ticket" }
        ]
      : [
          { to: "/login-user", label: "User Login" },
          { to: "/signup", label: "User Sign Up" },
          { to: "/login-agent", label: "Agent Login" }
        ];

  const active = (to) => loc.pathname === to || loc.pathname.startsWith(to + "/");

  async function logout() {
    try {
      if (auth?.token) await apiPost("/api/auth/logout", {});
    } catch {}
    resetSocket();
    clearAuth();
    window.location.href = "/";
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brandCard">
          <div className="brandIcon">S</div>
          <div>
            <div className="brandTitle">SolveX Support</div>
          </div>
        </div>

        <div className="sideSection">
          <div className="small sideLabel">Navigation</div>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={`navlink ${active(l.to) ? "active" : ""}`}>
              <span className="navBullet">→</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>


        <div className="sideSection pushBottom">
          {auth?.token ? (
            <>
              <div className="userCard">
                <div className="small">Signed in</div>
                <strong>{auth.displayName || auth.username}</strong>
                <div className="small">{auth.role.toUpperCase()}</div>
              </div>
              <button className="danger full" onClick={logout}>Log out</button>
            </>
          ) : (
            <div className="small">Sign in to create tickets, respond in real time, and see live dashboard updates.</div>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login-user" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/login-agent" element={<AgentLogin />} />
        <Route path="/user" element={<Guard role="user"><UserDashboard /></Guard>} />
        <Route path="/user/new" element={<Guard role="user"><UserNewTicket /></Guard>} />
        <Route path="/user/tickets/:id" element={<Guard role="user"><UserTicketDetail /></Guard>} />
        <Route path="/agent" element={<Guard role="agent"><AgentDashboard /></Guard>} />
        <Route path="/agent/tickets/:id" element={<Guard role="agent"><AgentTicketDetail /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
