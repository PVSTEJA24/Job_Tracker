import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { dbEnabled, query } from "./db.js";

const fileDataDir = path.join(path.dirname(new URL(import.meta.url).pathname), "data");
const fileDataPath = path.join(fileDataDir, "applications.json");

function ensureFile() {
  if (!fs.existsSync(fileDataDir)) fs.mkdirSync(fileDataDir, { recursive: true });
  if (!fs.existsSync(fileDataPath)) fs.writeFileSync(fileDataPath, JSON.stringify([], null, 2));
}

export const storage = {
  async listApplications(userId) {
    if (dbEnabled()) {
      const res = await query("SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
      return res.rows.map(normalize);
    }
    ensureFile();
    const raw = JSON.parse(fs.readFileSync(fileDataPath, "utf-8"));
    return raw;
  },
  async createApplication(userId, payload) {
    if (dbEnabled()) {
      const id = uuidv4();
      const res = await query(
        `INSERT INTO applications (id, user_id, company, role, source, portal_url, login_id, login_notes, status, notes, applied_date, interview_round)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          id,
          userId,
          payload.company,
          payload.role,
          payload.source || "",
          payload.portalUrl || null,
          payload.loginId || null,
          payload.loginNotes || null,
          payload.status,
          payload.notes || "",
          payload.appliedDate || null,
          payload.interviewRound ?? null,
        ]
      );
      return normalize(res.rows[0]);
    }
    ensureFile();
    const raw = JSON.parse(fs.readFileSync(fileDataPath, "utf-8"));
    const item = {
      id: uuidv4(),
      company: payload.company,
      role: payload.role,
      source: payload.source || "",
      portalUrl: payload.portalUrl || "",
      loginId: payload.loginId || "",
      loginNotes: payload.loginNotes || "",
      status: payload.status,
      notes: payload.notes || "",
      appliedDate: payload.appliedDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      interviewRound: payload.interviewRound ?? null,
    };
    raw.push(item);
    fs.writeFileSync(fileDataPath, JSON.stringify(raw, null, 2));
    return item;
  },
  async updateApplication(userId, id, updates) {
    if (dbEnabled()) {
      const res = await query(
        `UPDATE applications
         SET company = COALESCE($3, company),
             role = COALESCE($4, role),
             source = COALESCE($5, source),
             portal_url = COALESCE($6, portal_url),
             login_id = COALESCE($7, login_id),
             login_notes = COALESCE($8, login_notes),
             status = COALESCE($9, status),
             notes = COALESCE($10, notes),
             applied_date = COALESCE($11, applied_date),
             interview_round = COALESCE($12, interview_round)
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          id,
          userId,
          updates.company ?? null,
          updates.role ?? null,
          updates.source ?? null,
          updates.portalUrl ?? null,
          updates.loginId ?? null,
          updates.loginNotes ?? null,
          updates.status ?? null,
          updates.notes ?? null,
          updates.appliedDate ?? null,
          updates.interviewRound ?? null,
        ]
      );
      if (!res.rows[0]) return null;
      return normalize(res.rows[0]);
    }
    ensureFile();
    const raw = JSON.parse(fs.readFileSync(fileDataPath, "utf-8"));
    const idx = raw.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const next = { ...raw[idx], ...updates };
    raw[idx] = next;
    fs.writeFileSync(fileDataPath, JSON.stringify(raw, null, 2));
    return next;
  },
  async deleteApplication(userId, id) {
    if (dbEnabled()) {
      const res = await query(`DELETE FROM applications WHERE id = $1 AND user_id = $2`, [id, userId]);
      return res.rowCount > 0;
    }
    ensureFile();
    const raw = JSON.parse(fs.readFileSync(fileDataPath, "utf-8"));
    const next = raw.filter((a) => a.id !== id);
    const ok = next.length !== raw.length;
    if (ok) fs.writeFileSync(fileDataPath, JSON.stringify(next, null, 2));
    return ok;
  },
};

function normalize(row) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    source: row.source,
    portalUrl: row.portal_url || "",
    loginId: row.login_id || "",
    loginNotes: row.login_notes || "",
    status: row.status,
    notes: row.notes,
    appliedDate: row.applied_date ? new Date(row.applied_date).toISOString().slice(0, 10) : "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    interviewRound: row.interview_round ?? null,
  };
}
