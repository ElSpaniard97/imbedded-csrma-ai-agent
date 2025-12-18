import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- CORS (REQUIRED) ---------- */
app.use(
  cors({
    origin: [
      "https://elspaniard97.github.io",
      "http://localhost:5500", // optional local dev
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

/* ---------- BODY PARSER ---------- */
app.use(express.json({ limit: "10mb" }));

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("AI Troubleshooting Backend is running.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ---------- CHAT ENDPOINT ---------- */
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // TEMP response for connectivity test
    // (Replace later with OpenAI call)
    res.json({
      reply: `Received message successfully:\n\n${message}`
    });

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
