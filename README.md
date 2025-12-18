AI Infrastructure Troubleshooting Agent

Diagnostics-first. Approval-gated remediation. Ticket-safe output.

This project is a web-based interface for an AI Infrastructure Troubleshooting Agent designed to support real-world IT operations workflows. It enforces diagnostics before remediation, requires explicit user approval for production-impacting changes, and produces clean outputs suitable for incident tickets.

✨ Key Features

Diagnostics-first workflow

Explicit remediation approval gate

Structured troubleshooting across domains

Ticket-safe copy/export

Modern, lightweight UI

Secure backend deployment (no API keys in frontend)

🧠 Supported Domains

Networking

Switch/router triage, VLANs, trunks, STP, routing, MTU, packet loss

Server OS / Services

Linux & Windows health, logs, CPU/memory/disk, services

Scripts / Automation

PowerShell, Python, Bash, Ansible, Terraform, YAML/JSON

Hardware

Dell iDRAC, HPE iLO, Supermicro IPMI, PSU, thermals, RAID, ECC

🏗 Architecture Overview
Browser (GitHub Pages)
        |
        | POST /api/chat
        v
Render Backend (Node.js)
        |
        v
OpenAI API

Frontend

Static site hosted on GitHub Pages

No secrets or API keys

Handles UX, approval toggle, exports, and presets

Backend

Node.js + Express

Hosted on Render

Stores OpenAI API key securely via environment variables

Enforces diagnostics vs remediation logic

🌐 Live URLs

Frontend (GitHub Pages)
https://elspaniard97.github.io/imbedded-csrma-ai-agent/

Backend (Render)
https://imbedded-csrma-ai-agent.onrender.com

Health Check
https://imbedded-csrma-ai-agent.onrender.com/healthz

📂 Repository Structure
/
├── index.html
├── assets/
│   ├── css/
│   │   └── main.css
│   └── js/
│       └── app.js
├── server/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md

🚀 Frontend Setup (GitHub Pages)
1. Ensure repo-root publishing

index.html must be in the repository root

Assets referenced via relative paths (./assets/...)

2. Enable GitHub Pages

Repo → Settings → Pages

Source: Deploy from branch

Branch: main

Folder: / (root)

Save

3. Set backend URL

In index.html:

<script>
  window.BACKEND_URL = "https://imbedded-csrma-ai-agent.onrender.com/api/chat";
</script>

⚙️ Backend Setup (Render)
1. Create Render Web Service

Environment: Node

Root directory: server

Build command:

npm install


Start command:

npm start

2. Environment Variables

Add in Render dashboard:

OPENAI_API_KEY=sk-xxxx


⚠️ Never commit API keys to GitHub

🔍 Backend Endpoints
Method	Endpoint	Description
GET	/	Status message
GET	/healthz	Health check
POST	/api/chat	Main AI interaction
🔐 Security Notes

API keys live only in Render

Frontend uses no secrets

Optional CORS lock:

app.use(cors({
  origin: "https://elspaniard97.github.io"
}));

🧭 Usage Workflow

Select a preset (Network / Server / Script / Hardware)

Paste logs, scripts, or describe the issue

Run in Diagnostics mode

Review findings

Toggle Remediation Approved only if:

Maintenance window exists

Backups/restore points are available

Rollback plan is acceptable

Receive step-by-step remediation guidance

🧾 Ticket-Safe Output

Copy Ticket Notes → Clipboard-ready summary

Export TXT → Human-readable transcript

Export JSON → Structured incident record

🧪 Local Development (Optional)
cd server
npm install
npm run dev


Then open index.html locally and point BACKEND_URL to http://localhost:10000/api/chat.

🛣 Roadmap (Optional Enhancements)

Secret redaction toggle

Role-based approval (read-only vs approver)

Incident ID + ticket system integration

Streaming responses

Dark/light theme toggle

👤 Author

Ezekiel Correa
IT Infrastructure / Automation / AI-assisted Operations
GitHub: https://github.com/elspaniard97

📜 License

MIT License (or update as needed)
