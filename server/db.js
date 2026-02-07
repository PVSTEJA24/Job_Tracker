import { Pool } from "pg";

const hasDb = !!process.env.DATABASE_URL;
let pool = null;

export function dbEnabled() {
  return hasDb;
}

export async function getPool() {
  if (!hasDb) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
    await init();
  }
  return pool;
}

async function init() {
  const p = pool;
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      source TEXT,
      portal_url TEXT,
      login_id TEXT,
      login_notes TEXT,
      status TEXT,
      notes TEXT,
      applied_date DATE,
      interview_round INT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await p.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS portal_url TEXT;`);
  await p.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS login_id TEXT;`);
  await p.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS login_notes TEXT;`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);`);
}

export async function query(text, params) {
  const p = await getPool();
  return p.query(text, params);
}
