import jwt from "jsonwebtoken";
import { storage } from "../../server/storage.js";
import { dbEnabled } from "../../server/db.js"

const STATUSES = ["Applied", "Phone Screen", "Interviewing", "Offer", "Rejected"];
const DEFAULT_INTERVIEW_ROUND = 1;

function getUserId(req) {
  if (!dbEnabled()) return null;
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return null;
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (dbEnabled() && !userId) return res.status(401).json({ error: "missing or invalid token" });
  if (req.method === "GET") {
    const data = await storage.listApplications(userId);
    return res.status(200).json(data);
  }
  if (req.method === "POST") {
    const { company, role, source, portalUrl, loginId, loginNotes, status, notes, appliedDate, interviewRound } = req.body || {};
    if (!company || !role) return res.status(400).json({ error: "company and role are required" });
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
    const created = await storage.createApplication(userId, payload);
    return res.status(201).json(created);
  }
  return res.status(405).end();
}
