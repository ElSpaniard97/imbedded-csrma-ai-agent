import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();
app.use(cors({ origin: true })); // tighten to your GitHub Pages domain later
app.use(express.json({ limit: "2mb" }));

const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_INSTRUCTIONS = `
You are an enterprise infrastructure troubleshooting agent for servers (Linux/Windows),
switches, routers, scripts/automation, and hardware alerts.

Operating mode:
- Default to DIAGNOSTICS ONLY: triage, likely causes, verification steps, read-only commands.
- Do not provide change/apply commands unless user explicitly asks to proceed with remediation.
- If remediation is requested, ask for approval checklist: maintenance window, backups/restore point, rollback plan.
- When approved, provide remediation steps + rollback + validation.

Output format:
1) Summary
2) Scope/Impact questions
3) Likely causes (ranked)
4) Verification steps (commands + what to look for)
5) Findings (if any)
6) Proposed plan (no changes unless approved)
7) Risks / blast radius
8) Next actions
`;

app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    const { message, history } = req.body;
    const parsedHistory = history ? JSON.parse(history) : [];

    const input = [];

    // Add prior turns (simple: keep last ~8)
    for (const turn of parsedHistory.slice(-8)) {
      input.push({
        role: turn.role,
        content: [{ type: "text", text: turn.content }]
      });
    }

    // Add user message (text + optional image)
    const userContent = [];
    if (message) userContent.push({ type: "text", text: message });

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

    // Extract text output
    const text =
      response.output_text ||
      (response.output?.[0]?.content?.[0]?.text ?? "");

    res.json({ ok: true, text });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server listening on ${port}`));
