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
app.use(
  cors({
    origin: [
      "https://elspaniard97.github.io",
      "http://localhost:5500",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
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
1) Diagnostics-first: Always start by clarifying impact + collecting evidence.
2) Ticket-safe output: Never request or output secrets. Use redaction guidance when needed.
3) Be explicit and structured: Provide steps, commands, and what to look for.
4) Safety: Avoid risky changes unless APPROVAL is confirmed.

Approval policy:
- If approval is NOT confirmed: provide ONLY diagnostics, verification commands, and decision points.
- If approval IS confirmed: you may provide a remediation plan with rollback + validation steps.

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
  // Frontend history includes {role, content}. Keep it limited to avoid runaway token usage.
  if (!Array.isArray(history)) return [];
  return history
    .filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .slice(-12) // keep last 12 turns
    .map(x => ({ role: x.role, content: x.content }));
}

/* ---------- Routes ---------- */
app.get("/", (req, res) => {
  res.send("AI Troubleshooting Backend is running. Use GET /healthz or POST /api/chat.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/chat", upload.single("image"), async (req, res) => {
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

    // Optional: if image attached, we acknowledge but do not OCR here (keeps it simple).
    // If you want image-to-text later, we can add it using a vision-capable model.
    const hasImage = !!req.file;

    const userContent = hasImage
      ? `${message}\n\n[Note: User attached a screenshot image. Ask for the visible error text if needed; do not assume OCR.]`
      : message;

    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: userContent }
    ];

    // Use Responses API via the OpenAI SDK (stable approach)
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: messages
    });

    // The SDK returns output in a structured way; extract text safely
    const text = response.output_text || "";

    return res.json({ ok: true, text });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
