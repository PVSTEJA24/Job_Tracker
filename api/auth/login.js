import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { dbEnabled } from "../../server/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!dbEnabled()) return res.status(503).json({ error: "database not configured" });
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  try {
    const { query } = await import("../../server/db.js");
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
}
