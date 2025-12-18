import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 10000;

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

/* ---------- JSON SUPPORT (optional) ---------- */
app.use(express.json({ limit: "10mb" }));

/* ---------- MULTER (FormData) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB
});

/* ---------- ROUTES ---------- */
app.get("/", (req, res) => {
  res.send("AI Troubleshooting Backend is running. Use GET /healthz or POST /api/chat.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Accepts:
 * - multipart/form-data (from browser FormData)
 *   fields: message (string), history (json-string), image (file optional)
 * - application/json (optional)
 *   body: { message, history }
 */
app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    const message =
      (req.body && req.body.message) ||
      (req.body && req.body.input) ||
      (req.body && req.body.text) ||
      "";

    if (!message || !String(message).trim()) {
      return res.status(400).json({ ok: false, error: "Message is required" });
    }

    // history may arrive as a JSON string in FormData
    let history = [];
    if (req.body?.history) {
      try {
        history = typeof req.body.history === "string" ? JSON.parse(req.body.history) : req.body.history;
      } catch {
        history = [];
      }
    }

    const hasImage = !!req.file;

    // TEMP: connectivity test response (swap in OpenAI later)
    return res.json({
      ok: true,
      text:
        `Backend received your request successfully.\n\n` +
        `Mode header (if present): ${message.split("\n")[0]}\n` +
        `Has image: ${hasImage}\n` +
        `History items: ${Array.isArray(history) ? history.length : 0}\n\n` +
        `Message:\n${message}`
    });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
