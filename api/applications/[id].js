import jwt from "jsonwebtoken";
import { storage } from "../../../server/storage.js";
import { dbEnabled } from "../../../server/db.js";

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
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "missing id" });
  if (req.method === "PATCH") {
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
    const next = await storage.updateApplication(userId, id, updates);
    if (!next) return res.status(404).json({ error: "application not found" });
    return res.status(200).json(next);
  }
  if (req.method === "DELETE") {
    const ok = await storage.deleteApplication(userId, id);
    if (!ok) return res.status(404).json({ error: "application not found" });
    return res.status(204).end();
  }
  return res.status(405).end();
}
