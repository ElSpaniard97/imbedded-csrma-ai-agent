import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { promises as fs } from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = new Set([
  "https://elspaniard97.github.io",
  "http://localhost:5500",
  "http://localhost:3000"
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: "10mb" }));

/* ---------- MULTER (FormData) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB
});

/* ---------- Helpers ---------- */
function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env var: ${name}`);
  return process.env[name];
}

function issueToken(username) {
  const secret = requireEnv("JWT_SECRET");
  return jwt.sign({ sub: username }, secret, { expiresIn: "8h" });
}

function authMiddleware(req, res, next) {
  try {
    const secret = requireEnv("JWT_SECRET");
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload; // payload.sub is username
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

/* ---------- Troubleshooting helpers ---------- */
function parseHistory(raw) {
  if (!raw) return [];
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

function approvalStateFromMessage(message) {
  const head = String(message || "").split("\n")[0] || "";
  return head.includes("APPROVAL: APPROVED") ? "approved" : "not_approved";
}

function buildSystemPrompt(approvalState) {
  const base = `
You are an enterprise infrastructure troubleshooting agent for:
- Networking (switches/routers)
- Server OS/services (Linux/Windows)
- Scripts/automation (PowerShell/Python/Bash/Ansible/Terraform/YAML/JSON)
- Hardware/component alerts (iDRAC/iLO/IPMI, RAID, thermals, PSU, ECC)

Operating rules:
1) Diagnostics-first: Start by clarifying scope/impact, recent change, and collecting evidence.
2) Ticket-safe output: Never request or output secrets (keys/passwords). Recommend redaction.
3) Be explicit and structured: Provide commands/steps AND "what to look for".
4) Safety: Avoid risky/production-impacting changes unless APPROVAL is confirmed.

Approval policy:
- If approval is NOT confirmed: provide ONLY diagnostics, verification commands, decision points, and safe mitigations that do not change production configuration.
- If approval IS confirmed: provide a remediation plan with rollback + validation.

Response format (always):
A) Quick Triage (2-6 bullets)
B) Likely Causes (ranked)
C) Evidence to Collect (commands + what to look for)
D) Decision Tree / Next Steps
E) If APPROVED: Remediation Plan (change steps + rollback + validation)
`;

  return approvalState === "approved"
    ? base + "\nApproval status: APPROVED. Remediation plan is allowed if appropriate.\n"
    : base + "\nApproval status: NOT APPROVED. Diagnostics only; do NOT provide production-impacting remediation steps.\n";
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (x) =>
        x &&
        (x.role === "user" || x.role === "assistant") &&
        typeof x.content === "string"
    )
    .slice(-12)
    .map((x) => ({ role: x.role, content: x.content }));
}

/* =========================
   Server-side Settings Store
========================= */
const SETTINGS_PATH = process.env.SETTINGS_PATH || "/data/settings.json";

function defaultSettings() {
  return {
    defaultPreset: "",
    expandOnPreset: true,
    rememberApproval: true,
    defaultApproval: false,
    theme: "system" // system | dark | light
  };
}

// Allow-list validation to prevent arbitrary writes
function sanitizeSettings(input) {
  const base = defaultSettings();
  const out = { ...base };

  if (!input || typeof input !== "object") return out;

  if (typeof input.defaultPreset === "string") out.defaultPreset = input.defaultPreset;
  if (typeof input.expandOnPreset === "boolean") out.expandOnPreset = input.expandOnPreset;
  if (typeof input.rememberApproval === "boolean") out.rememberApproval = input.rememberApproval;
  if (typeof input.defaultApproval === "boolean") out.defaultApproval = input.defaultApproval;

  if (input.theme === "system" || input.theme === "dark" || input.theme === "light") {
    out.theme = input.theme;
  }

  // hard limit preset values
  const allowedPresets = new Set(["", "network", "server", "script", "hardware"]);
  if (!allowedPresets.has(out.defaultPreset)) out.defaultPreset = "";

  return out;
}

async function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function readSettingsFile() {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const json = JSON.parse(raw);
    return (json && typeof json === "object") ? json : {};
  } catch {
    return {};
  }
}

async function writeSettingsFile(allSettings) {
  await ensureDirForFile(SETTINGS_PATH);
  const tmp = SETTINGS_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(allSettings, null, 2), "utf8");
  await fs.rename(tmp, SETTINGS_PATH);
}

/* ---------- Routes ---------- */
app.get("/", (req, res) => {
  res.status(200).send("Backend running. Use GET /healthz, POST /auth/login, POST /api/chat.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Login endpoint
 * Body: { username, password }
 * Returns: { ok: true, token }
 */
app.post("/auth/login", async (req, res) => {
  try {
    const adminUser = requireEnv("ADMIN_USERNAME");
    const adminPass = requireEnv("ADMIN_PASSWORD");

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password are required" });
    }

    const passHash = bcrypt.hashSync(adminPass, 10);
    const userOk = String(username) === String(adminUser);
    const passOk = bcrypt.compareSync(String(password), passHash);

    if (!userOk || !passOk) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = issueToken(username);
    return res.json({ ok: true, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * GET server-side settings for logged-in user
 */
app.get("/api/settings", authMiddleware, async (req, res) => {
  try {
    const username = String(req.user?.sub || "");
    if (!username) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const all = await readSettingsFile();
    const userSettings = sanitizeSettings(all[username] || {});
    return res.json({ ok: true, settings: userSettings });
  } catch (err) {
    console.error("GET settings error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * PUT server-side settings for logged-in user
 * Body: { settings: {...} } OR {...}
 */
app.put("/api/settings", authMiddleware, async (req, res) => {
  try {
    const username = String(req.user?.sub || "");
    if (!username) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const incoming = req.body?.settings ? req.body.settings : req.body;
    const next = sanitizeSettings(incoming);

    const all = await readSettingsFile();
    all[username] = next;
    await writeSettingsFile(all);

    return res.json({ ok: true, settings: next });
  } catch (err) {
    console.error("PUT settings error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * Protected chat endpoint
 */
app.post("/api/chat", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY on server." });
    }

    const message = req.body?.message ? String(req.body.message) : "";
    if (!message.trim()) {
      return res.status(400).json({ ok: false, error: "Message is required" });
    }

    const history = normalizeHistory(parseHistory(req.body?.history));
    const approvalState = approvalStateFromMessage(message);
    const system = buildSystemPrompt(approvalState);

    const hasImage = !!req.file;
    const userContent = hasImage
      ? `${message}\n\n[Note: User attached a screenshot image. Ask for the visible error text if needed; do not assume OCR.]`
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

    return res.json({ ok: true, text: response.output_text || "" });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
