import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------------- OpenAI ---------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------------- Data directory ----------------
   Render persistent storage:
   - Create a Disk in Render
   - Mount path: /var/data
   - Set env: DATA_DIR=/var/data
*/
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------------- Auth config ----------------
   Set these in Render Environment variables:
   - APP_USERNAME=AIHero
   - APP_PASSWORD=AIHer0298765@s!!!
   - SESSION_SECRET=some-long-random-string
*/
const APP_USERNAME = process.env.APP_USERNAME || "";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

if (!SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET is not set. Set it in Render env for secure sessions.");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const sessions = new Map(); // sessionId -> { username, createdAt }

/* ---------------- Middleware ---------------- */
app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: [
      "https://elspaniard97.github.io",
      "http://localhost:5500",
      "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach(part => {
    const [k, ...v] = part.trim().split("=");
    out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(res, name) {
  res.setHeader("Set-Cookie", `${name}=; Path=/; Max-Age=0`);
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return res.status(401).json({ ok: false, error: "Not authenticated." });

  const sidHash = hashToken(`${sid}:${SESSION_SECRET || "no-secret"}`);
  const session = sessions.get(sidHash);
  if (!session) return res.status(401).json({ ok: false, error: "Invalid session." });

  req.user = session;
  next();
}

/* ---------------- Multer ---------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }
});

/* ---------------- Helpers ---------------- */
function parseHistory(raw) {
  if (!raw) return [];
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .slice(-12)
    .map(x => ({ role: x.role, content: x.content }));
}

function approvalStateFromMessage(message) {
  const head = String(message || "").split("\n")[0] || "";
  return head.includes("APPROVAL: APPROVED") ? "approved" : "not_approved";
}

function buildSystemPrompt(approvalState) {
  const base = `
You are Jenko, an enterprise infrastructure troubleshooting agent for:
- Networking (switches/routers)
- Server OS/services (Linux/Windows)
- Scripts/automation (PowerShell/Python/Bash/Ansible/Terraform/YAML/JSON)
- Hardware/component alerts (iDRAC/iLO/IPMI, RAID, thermals, PSU, ECC)

Operating rules:
1) Diagnostics-first: always clarify impact + collect evidence.
2) Ticket-safe output: never request or output secrets. Recommend redaction when needed.
3) Be explicit and structured: provide commands + what to look for.
4) Safety: avoid risky production-impacting changes unless APPROVAL is confirmed.

Approval policy:
- If approval is NOT confirmed: provide ONLY diagnostics, verification commands, and decision points.
- If approval IS confirmed: provide a remediation plan with rollback + validation steps.

Response format (always):
A) Quick Triage (2-6 bullets)
B) Likely Causes (ranked)
C) Evidence to Collect (commands + what to look for)
D) Decision Tree / Next Steps
E) If APPROVED: Remediation Plan (change steps + rollback + validation)
`;

  if (approvalState === "approved") {
    return base + "\nApproval status: APPROVED. Remediation plan is allowed if appropriate.\n";
  }
  return base + "\nApproval status: NOT APPROVED. Diagnostics only; do NOT provide production-impacting remediation steps.\n";
}

/* ---------------- Routes ---------------- */
app.get("/", (req, res) => {
  res.send("Jenko Backend is running. Use GET /healthz or POST /api/chat (auth required).");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* -------- AUTH -------- */
app.post("/auth/login", (req, res) => {
  if (!APP_USERNAME || !APP_PASSWORD) {
    return res.status(500).json({ ok: false, error: "Server auth not configured. Set APP_USERNAME and APP_PASSWORD." });
  }

  const { username, password } = req.body || {};
  if (String(username || "") !== APP_USERNAME || String(password || "") !== APP_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Invalid credentials." });
  }

  const sid = crypto.randomBytes(24).toString("hex");
  const sidHash = hashToken(`${sid}:${SESSION_SECRET || "no-secret"}`);
  sessions.set(sidHash, { username: APP_USERNAME, createdAt: Date.now() });

  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  setCookie(res, "sid", sid, {
    httpOnly: true,
    secure: isProd,            // Render uses HTTPS in prod
    sameSite: "None",          // required for cross-site cookies (GitHub Pages -> Render)
    path: "/",
    maxAge: 60 * 60 * 8        // 8 hours
  });

  return res.json({ ok: true, username: APP_USERNAME });
});

app.get("/auth/me", (req, res) => {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return res.status(401).json({ ok: false });

  const sidHash = hashToken(`${sid}:${SESSION_SECRET || "no-secret"}`);
  const session = sessions.get(sidHash);
  if (!session) return res.status(401).json({ ok: false });

  return res.json({ ok: true, username: session.username });
});

app.post("/auth/logout", (req, res) => {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) {
    const sidHash = hashToken(`${sid}:${SESSION_SECRET || "no-secret"}`);
    sessions.delete(sidHash);
  }
  clearCookie(res, "sid");
  return res.json({ ok: true });
});

/* -------- SETTINGS (server-side) -------- */
function settingsFileForUser(username) {
  return path.join(DATA_DIR, `settings_${username}.json`);
}

app.get("/api/settings", requireAuth, (req, res) => {
  const f = settingsFileForUser(req.user.username);
  if (!fs.existsSync(f)) return res.status(404).json({ ok: false, error: "No saved settings." });
  try {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    return res.json(data);
  } catch {
    return res.status(500).json({ ok: false, error: "Settings read failed." });
  }
});

app.post("/api/settings", requireAuth, (req, res) => {
  const payload = req.body || {};
  const safe = {
    theme: (payload.theme === "light" || payload.theme === "dark") ? payload.theme : "dark",
    remediationApproved: !!payload.remediationApproved
  };

  const f = settingsFileForUser(req.user.username);
  try {
    fs.writeFileSync(f, JSON.stringify(safe, null, 2), "utf8");
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Settings save failed." });
  }
});

/* -------- CHAT (auth required) -------- */
app.post("/api/chat", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY on server." });
    }

    const message = (req.body && req.body.message) ? String(req.body.message) : "";
    if (!message.trim()) {
      return res.status(400).json({ ok: false, error: "Message is required" });
    }

    const history = normalizeHistory(parseHistory(req.body?.history));
    const approvalState = approvalStateFromMessage(message);
    const system = buildSystemPrompt(approvalState);

    const hasImage = !!req.file;
    const userContent = hasImage
      ? `${message}\n\n[Note: User attached a screenshot image. Ask for visible error text if needed; do not assume OCR.]`
      : message;

    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: userContent }
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: messages
    });

    const text = response.output_text || "";
    return res.json({ ok: true, text });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Jenko server listening on ${PORT}`);
});
