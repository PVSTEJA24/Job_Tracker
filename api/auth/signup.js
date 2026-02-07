import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { dbEnabled } from "../../server/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!dbEnabled()) return res.status(503).json({ error: "database not configured" });
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  try {
    const { query } = await import("../../server/db.js");
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows[0]) return res.status(409).json({ error: "email already exists" });
    const { v4: uuidv4 } = await import("uuid");
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await query("INSERT INTO users (id, email, password_hash, name) VALUES ($1,$2,$3,$4)", [id, email, hash, name || null]);
    const token = jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token });
  } catch {
    res.status(500).json({ error: "signup failed" });
  }
}
