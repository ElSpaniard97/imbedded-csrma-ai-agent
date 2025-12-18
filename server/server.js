import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = new Set([
  "https://elspaniard97.github.io",
  "http://localhost:5500",
  "http://localhost:3000"
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server (no Origin header), and allowed browsers
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
  })
);

/* ---------- JSON (optional) ---------- */
app.use(express.json({ limit: "10mb" }));

/* ---------- MULTER (FormData) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB
});

/* ---------- Helpers ---------- */
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

  if (approvalState === "approved") {
    return base + "\nApproval status: APPROVED. Remediation plan is allowed if appropriate.\n";
  }
  return base + "\nApproval status: NOT APPROVED. Diagnostics only; do NOT provide production-impacting remediation steps.\n";
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

/* ---------- Routes ---------- */
app.get("/", (req, res) => {
  res
    .status(200)
    .send("AI Troubleshooting Backend is running. Use GET /healthz or POST /api/chat.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing OPENAI_API_KEY on server." });
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

    // Model call
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: messages
    });

    const text = response.output_text || "";

    return res.json({ ok: true, text });
  } catch (err) {
    console.error("API error:", err);

    // Return a slightly more helpful error while staying safe
    const msg =
      (err && err.message) ? err.message : "Internal server error";

    return res.status(500).json({
      ok: false,
      error: msg.includes("CORS") ? "CORS error on backend." : msg
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
