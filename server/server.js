import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { dbEnabled } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());

const STATUSES = ["Applied", "Phone Screen", "Interviewing", "Offer", "Rejected"];
const DEFAULT_INTERVIEW_ROUND = 1;

function requireAuthIfDb(req, res, next) {
  if (!dbEnabled()) return next();
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: "missing token" });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}

app.get("/api/statuses", (_req, res) => {
  res.json(STATUSES);
});

app.post("/api/auth/signup", async (req, res) => {
  if (!dbEnabled()) return res.status(503).json({ error: "database not configured" });
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  try {
    const { query } = await import("./db.js");
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows[0]) return res.status(409).json({ error: "email already exists" });
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await query("INSERT INTO users (id, email, password_hash, name) VALUES ($1,$2,$3,$4)", [id, email, hash, name || null]);
    const token = jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token });
  } catch {
    res.status(500).json({ error: "signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!dbEnabled()) return res.status(503).json({ error: "database not configured" });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  try {
    const { query } = await import("./db.js");
    const user = await query("SELECT id, password_hash FROM users WHERE email = $1", [email]);
    const row = user.rows[0];
    if (!row) return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const token = jwt.sign({ sub: row.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch {
    res.status(500).json({ error: "login failed" });
  }
});

app.get("/api/applications", requireAuthIfDb, async (req, res) => {
  const userId = dbEnabled() ? req.user.id : null;
  const data = await storage.listApplications(userId);
  res.json(data);
});

app.post("/api/applications", requireAuthIfDb, async (req, res) => {
  const { company, role, source, portalUrl, loginId, loginNotes, status, notes, appliedDate, interviewRound } = req.body || {};
  if (!company || !role) {
    return res.status(400).json({ error: "company and role are required" });
  }
  const safeStatus = STATUSES.includes(status) ? status : STATUSES[0];
  const payload = {
    company,
    role,
    source,
    portalUrl,
    loginId,
    loginNotes,
    status: safeStatus,
    notes,
    appliedDate,
    interviewRound: safeStatus === "Interviewing" ? (Number.isInteger(interviewRound) ? interviewRound : DEFAULT_INTERVIEW_ROUND) : null,
  };
  const created = await storage.createApplication(dbEnabled() ? req.user.id : null, payload);
  res.status(201).json(created);
});

app.patch("/api/applications/:id", requireAuthIfDb, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  if (updates.status && !STATUSES.includes(updates.status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const currentStatus = updates.status;
  if (currentStatus === "Interviewing") {
    const r = updates.interviewRound;
    updates.interviewRound = Number.isInteger(r) ? r : DEFAULT_INTERVIEW_ROUND;
  } else if (currentStatus && currentStatus !== "Interviewing") {
    updates.interviewRound = null;
  }
  const next = await storage.updateApplication(dbEnabled() ? req.user.id : null, id, updates);
  if (!next) return res.status(404).json({ error: "application not found" });
  res.json(next);
});

app.delete("/api/applications/:id", requireAuthIfDb, async (req, res) => {
  const { id } = req.params;
  const ok = await storage.deleteApplication(dbEnabled() ? req.user.id : null, id);
  if (!ok) return res.status(404).json({ error: "application not found" });
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
