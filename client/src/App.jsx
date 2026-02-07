import React, { useEffect, useMemo, useState } from "react";
const API_BASE = import.meta.env.DEV ? "http://localhost:3001/api" : "/api";

const STATUSES = ["Applied", "Phone Screen", "Interviewing", "Offer", "Rejected"];

function useApplications(token) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/applications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setItems([]);
        setError("Please login to view applications");
      } else {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (e) {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  async function addApplication(payload) {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add");
    const item = await res.json();
    setItems((prev) => [item, ...prev]);
  }

  async function updateApplication(id, updates) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update");
    const next = await res.json();
    setItems((prev) => prev.map((x) => (x.id === id ? next : x)));
  }

  async function deleteApplication(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  useEffect(() => {
    load();
  }, [token]);

  return { items, loading, error, addApplication, updateApplication, deleteApplication, reload: load };
}

function LoginModal({ open, onClose, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e) {
    e.preventDefault();
    await onLogin({ email, password });
    onClose();
    setEmail("");
    setPassword("");
  }
  return (
    <div className={`modal ${open ? "open" : ""}`} onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Login</h3>
        <form onSubmit={submit} className="form">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="controls" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignupModal({ open, onClose, onSignup }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e) {
    e.preventDefault();
    await onSignup({ name, email, password });
    onClose();
    setName("");
    setEmail("");
    setPassword("");
  }
  return (
    <div className={`modal ${open ? "open" : ""}`} onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Sign Up</h3>
        <form onSubmit={submit} className="form">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="controls" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Create Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewApplicationModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    company: "",
    role: "",
    source: "",
    portalUrl: "",
    loginId: "",
    loginNotes: "",
    status: "Applied",
    notes: "",
    appliedDate: "",
    interviewRound: 1,
  });

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    await onCreate(form);
    onClose();
    setForm({ company: "", role: "", source: "", portalUrl: "", loginId: "", loginNotes: "", status: "Applied", notes: "", appliedDate: "", interviewRound: 1 });
  }

  return (
    <div className={`modal ${open ? "open" : ""}`} onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Add Application</h3>
        <form onSubmit={submit} className="form">
          <div className="field">
            <label>Company</label>
            <input value={form.company} onChange={(e) => setField("company", e.target.value)} required />
          </div>
          <div className="field">
            <label>Role</label>
            <input value={form.role} onChange={(e) => setField("role", e.target.value)} required />
          </div>
          <div className="field">
            <label>Source</label>
            <input value={form.source} onChange={(e) => setField("source", e.target.value)} placeholder="LinkedIn, Website, Referral" />
          </div>
          <div className="field">
            <label>Application Website</label>
            <input value={form.portalUrl} onChange={(e) => setField("portalUrl", e.target.value)} placeholder="https://company.jobs/apply" />
          </div>
          <div className="field">
            <label>Login ID (no passwords)</label>
            <input value={form.loginId} onChange={(e) => setField("loginId", e.target.value)} placeholder="email or username used to login" />
          </div>
          <div className="field">
            <label>Login Notes</label>
            <input value={form.loginNotes} onChange={(e) => setField("loginNotes", e.target.value)} placeholder="notes about SSO, MFA, etc." />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {form.status === "Interviewing" && (
            <div className="field">
              <label>Interview Round</label>
              <select value={form.interviewRound} onChange={(e) => setField("interviewRound", parseInt(e.target.value, 10))}>
                {[1,2,3,4,5].map((r) => (
                  <option key={r} value={r}>Round {r}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Applied Date</label>
            <input type="date" value={form.appliedDate} onChange={(e) => setField("appliedDate", e.target.value)} />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>
          <div className="controls" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Column({ title, items, onStatusChange, onRoundChange, onDelete }) {
  return (
    <div className="column">
      <div className="column-header">
        <span>{title}</span>
        <span className="badge">{items.length}</span>
      </div>
      <div className="list">
        {items.map((x) => (
          <div key={x.id} className="card">
            <div className="card-title">{x.company} — {x.role}</div>
            <div className="card-sub">
              {x.source} • {x.appliedDate}
              {x.portalUrl && (
                <> • <a href={x.portalUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Portal</a></>
              )}
              {x.loginId && (
                <> • Login: {x.loginId}</>
              )}
              {title === "Interviewing" && typeof x.interviewRound === "number" && (
                <> • Round {x.interviewRound}</>
              )}
            </div>
            <div className="card-footer">
              <div className="controls">
                <select value={x.status} onChange={(e) => onStatusChange(x.id, e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {title === "Interviewing" && (
                  <select value={typeof x.interviewRound === "number" ? x.interviewRound : 1} onChange={(e) => onRoundChange(x.id, parseInt(e.target.value, 10))}>
                    {[1,2,3,4,5].map((r) => (
                      <option key={r} value={r}>Round {r}</option>
                    ))}
                  </select>
                )}
              </div>
              <button className="btn danger" onClick={() => onDelete(x.id)}>Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card" style={{ color: "#8a94a6" }}>No applications</div>
        )}
      </div>
    </div>
  );
}

async function safeError(res) {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {}
  return "";
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const { items, loading, error, addApplication, updateApplication, deleteApplication } = useApplications(token);
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    const anyOpen = open || loginOpen || signupOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, loginOpen, signupOpen]);

  const grouped = useMemo(() => {
    const byStatus = {};
    STATUSES.forEach((s) => byStatus[s] = []);
    items.forEach((x) => {
      if (!byStatus[x.status]) byStatus[x.status] = [];
      byStatus[x.status].push(x);
    });
    return byStatus;
  }, [items]);

  async function handleCreate(form) {
    await addApplication(form);
  }

  async function handleStatus(id, status) {
    await updateApplication(id, { status });
  }
  async function handleRound(id, round) {
    await updateApplication(id, { interviewRound: round });
  }

  async function handleDelete(id) {
    await deleteApplication(id);
  }

  async function signup({ name, email, password }) {
    try {
      setAuthError("");
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const msg = await safeError(res);
        setAuthError(msg || "Signup failed");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch {
      setAuthError("Network error during signup");
    }
  }

  async function login({ email, password }) {
    try {
      setAuthError("");
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const msg = await safeError(res);
        setAuthError(msg || "Login failed");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch {
      setAuthError("Network error during login");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
  }

  return (
    <>
      <header className="app-header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>TrackMyProgress - Job Application Tracker</h2>
        </div>
        <div className="controls">
          {token ? (
            <>
              <span className="badge">Logged in</span>
              <button className="btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setLoginOpen(true)}>Login</button>
              <button className="btn" onClick={() => setSignupOpen(true)}>Sign Up</button>
            </>
          )}
          {authError && <span className="badge" style={{ color: "var(--warning)" }}>{authError}</span>}
          <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
          <button className="btn primary" onClick={() => setOpen(true)}>Add Application</button>
        </div>
      </header>
      {loading && <div style={{ padding: 16 }}>Loading…</div>}
      {error && <div style={{ padding: 16, color: "var(--warning)" }}>{error}</div>}
      <main className="board">
        {STATUSES.map((s) => (
          <Column
            key={s}
            title={s}
            items={grouped[s] || []}
            onStatusChange={handleStatus}
            onRoundChange={handleRound}
            onDelete={handleDelete}
          />
        ))}
      </main>
      <NewApplicationModal open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={login} />
      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} onSignup={signup} />
    </>
  );
}
