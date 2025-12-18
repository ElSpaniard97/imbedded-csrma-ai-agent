import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();

// CORS: For now, allow all origins so your GitHub Pages can reach it.
// After you confirm the site works, restrict this to your GitHub Pages domain.
app.use(cors({ origin: true }));

app.use(express.json({ limit: "2mb" }));

const upload = multer({
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_INSTRUCTIONS = `
You are an enterprise infrastructure troubleshooting agent for:
- Servers (Linux/Windows)
- Switches/Routers (networking)
- Scripts/Automation (PowerShell, Python, Bash, Ansible, Terraform, YAML/JSON)
- Hardware/Components (BMC: iDRAC/iLO/IPMI)

Operational policy:
1) Default to DIAGNOSTICS ONLY:
   - Ask scope/impact questions
   - Provide read-only verification commands and what to look for
   - Interpret outputs and narrow likely causes
   - Propose a remediation plan but do NOT provide change steps unless approved
2) If the user requests action words (e.g., "apply", "proceed", "run the fix", "make the change"):
   - Require an approval checklist:
     - maintenance window approved?
     - backups/restore points exist?
     - rollback plan acceptable?
   - Ask for explicit confirmation: "Approve" or "Yes, proceed"
3) Only after approval:
   - Provide step-by-step remediation
   - Include validation and rollback/backout steps
   - Minimize blast radius

Output format (always):
1) Summary
2) Scope/Impact questions
3) Likely causes (ranked)
4) Verification steps (commands + expected signals)
5) Findings / interpretation
6) Proposed plan (no changes unless approved)
7) Risks / blast radius
8) Next actions
`;

// NEW: Root route so visiting the service URL in a browser doesn't look "broken"
app.get("/", (req, res) => {
  res
    .status(200)
    .send("AI Troubleshooting Backend is running. Use GET /healthz or POST /api/chat.");
});

// Health check (Render + human verification)
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// Chat endpoint: accepts text + optional screenshot upload ("image")
app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing OPENAI_API_KEY on server. Add it in Render environment variables."
      });
    }

    const { message, history } = req.body;

    // history is passed as JSON string from the frontend
    const parsedHistory = history ? JSON.parse(history) : [];

    const input = [];

    // Keep last 8 turns to control token usage
    for (const turn of parsedHistory.slice(-8)) {
      input.push({
        role: turn.role,
        content: [{ type: "text", text: String(turn.content || "") }]
      });
    }

    // Current user message (text + optional image)
    const userContent = [];
    if (message) userContent.push({ type: "text", text: String(message) });

    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      const mime = req.file.mimetype || "image/png";
      userContent.push({
        type: "input_image",
        image_url: `data:${mime};base64,${base64}`
      });
    }

    input.push({ role: "user", content: userContent });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: SYSTEM_INSTRUCTIONS,
      input
    });

    const text =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "";

    return res.json({ ok: true, text });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error"
    });
  }
});

// Render binds your service on process.env.PORT
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server listening on ${port}`));
