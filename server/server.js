import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();

// 1) CORS: lock this down after you know your GitHub Pages URL.
const allowedOrigins = [
  // Example:
  // "https://YOUR_GITHUB_USERNAME.github.io",
  // "https://YOUR_CUSTOM_DOMAIN.com"
];
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server / local tools with no origin
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true); // dev mode
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked for origin: " + origin));
    }
  })
);

app.use(express.json({ limit: "2mb" }));

// 2) File uploads (screenshots)
const upload = multer({
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// IMPORTANT: your “Agent Builder” behavior is encoded here.
// Diagnostics first; remediation only after explicit approval.
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

app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY on server." });
    }

    const { message, history } = req.body;
    const parsedHistory = history ? JSON.parse(history) : [];

    // Build Responses API input: last few turns + current user message
    const input = [];

    for (const turn of parsedHistory.slice(-8)) {
      input.push({
        role: turn.role,
        content: [{ type: "text", text: String(turn.content || "") }]
      });
    }

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

    // Responses API call
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

// Render requirement: bind to PORT env var. :contentReference[oaicite:2]{index=2}
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server listening on ${port}`));
