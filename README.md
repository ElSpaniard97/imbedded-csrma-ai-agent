# AI Infrastructure Troubleshooting Agent

A change-controlled AI troubleshooting assistant for enterprise IT environments. Designed to standardize diagnostics and safely gate remediation across networking, servers, scripts, and hardware components.

## 🔗 Links

- **Live Agent**: [Launch GPT](https://chatgpt.com/g/g-69441b1b5d0c81918300df5e63b0e079-ai-infrastructure-troubleshooting-agent)
- **Showcase Site**: [GitHub Pages](https://elspaniard97.github.io/ai-agent-cirrascale/)

---

## 📋 Overview

This project showcases a published ChatGPT GPT that mirrors real-world IT operational workflows:

- ✅ **Diagnostics first** (read-only, evidence-based)
- ✅ **Explicit intent detection** before changes
- ✅ **Human approval** before remediation
- ✅ **Clear rollback** and validation guidance

The repository contains a static GitHub Pages site used to document, demonstrate, and launch the agent.

---

## 🎯 Key Capabilities

### 🔹 Networking (Switches / Routers)
- Interface errors, VLAN/trunk issues
- STP, routing, MTU, packet loss
- CLI output analysis (read-only first)

### 🔹 Server OS & Services
- Linux / Windows diagnostics
- CPU, memory, disk, services, logs
- Connectivity, DNS, TLS, ports

### 🔹 Script & Automation Troubleshooting
- PowerShell, Python, Bash
- Ansible, Terraform, YAML/JSON
- Stack traces, root cause analysis, corrected snippets

### 🔹 Hardware & Components
- Vendor-aware triage (Dell / HPE)
- iDRAC / iLO / IPMI alerts
- PSU, thermals, RAID, memory (ECC)
- Safe escalation and RMA guidance

---

## 🔄 How the Agent Works

### 1. **Diagnostics Mode** (Default)
- Asks clarifying questions
- Analyzes logs, configs, scripts, or screenshots
- Identifies likely root causes
- Provides read-only verification commands only
- Produces a remediation plan (but does not execute it)

### 2. **Intent Detection**
The agent waits for explicit user intent such as:
- "apply"
- "fix"
- "proceed"
- "make the change"
- "run it"

### 3. **Approval Gate**
Before remediation, the agent requires confirmation of:
- Production impact awareness
- Maintenance window approval
- Backup / restore availability
- Rollback plan acceptance

### 4. **Remediation Mode** (Only After Approval)
- Step-by-step change instructions
- Validation checks
- Rollback/backout procedures

---

## 📁 Repository Structure

```
/
├── index.html              # Landing page
├── capabilities.html       # Capabilities by domain
├── workflow.html          # Process flow
├── prompts.html           # Prompt library with filtering
├── faq.html               # FAQ page
├── assets/
│   ├── css/
│   │   └── main.css       # Consolidated styles (dark/light theme)
│   └── js/
│       ├── main.js        # Main UI logic (consolidated)
│       └── prompts.js     # Prompt filtering
└── README.md              # This file
```

---

## 🚀 Using the Agent

1. **Open the agent** using the [Launch Agent](https://chatgpt.com/g/g-69441b1b5d0c81918300df5e63b0e079-ai-infrastructure-troubleshooting-agent) button

2. **Paste:**
   - Logs
   - CLI output
   - Error messages
   - Screenshots
   - Full scripts (if needed)

3. **Review** diagnostics and proposed plan

4. **Explicitly approve** remediation when ready

---

## 🌐 GitHub Pages Deployment

To host the showcase site:

1. **Push all files** to the repository root
2. Go to **Repository Settings → Pages**
3. Set:
   - **Source**: `main` branch
   - **Folder**: `/` (root)
4. **Save** and wait for Pages to deploy

The site will be available at:
```
https://[username].github.io/[repository-name]/
```

---

## ✨ Features

### Design
- 🎨 Modern, clean interface with dark/light theme toggle
- 📱 Fully responsive (mobile, tablet, desktop)
- ♿ Accessible (ARIA labels, semantic HTML, keyboard navigation)

### Functionality
- 🔍 Search and filter prompt library
- 📋 One-click copy for prompts and links
- 🎯 Toast notifications for user feedback
- 🔄 Smooth transitions and interactions

### Code Quality
- 📦 Consolidated CSS and JS (no duplicate files)
- 🧹 Clean, maintainable codebase
- 🚀 Optimized for GitHub Pages
- 🔧 All features preserved from original versions

---

## 🛠️ Technical Details

### Technologies Used
- **HTML5** - Semantic markup
- **CSS3** - Custom properties (CSS variables), Grid, Flexbox
- **Vanilla JavaScript** - No dependencies
- **GitHub Pages** - Static site hosting

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📝 License

This is a showcase site for a published GPT. The GPT itself is hosted on OpenAI's ChatGPT platform.

---

## 🤝 Contributing

This is a personal showcase project. Feel free to fork and adapt for your own GPT projects!

---

## 📧 Contact

For questions about the AI Infrastructure Troubleshooting Agent, please use the feedback mechanisms within ChatGPT or visit the agent link above.
