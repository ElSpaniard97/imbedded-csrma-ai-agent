/* =========================
   DOM References
========================= */
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");

const loginForm = document.getElementById("loginForm");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const authStatus = document.getElementById("authStatus");
const logoutBtn = document.getElementById("logoutBtn");

// App UI
const chatEl = document.getElementById("chat");
const form = document.getElementById("form");
const messageEl = document.getElementById("message");
const imageEl = document.getElementById("image");

const approveToggle = document.getElementById("approveToggle");
const modePill = document.getElementById("modePill");

const copyTicketBtn = document.getElementById("copyTicketBtn");
const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");

const toastEl = document.getElementById("toast");

/* =========================
   State
========================= */
const history = [];
const TOKEN_KEY = "ai_agent_token";

/* =========================
   Helpers
========================= */
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

function setAuthUI() {
  const authed = !!getToken();

  // Login screen first; app hidden until authenticated
  if (loginScreen) loginScreen.classList.toggle("hidden", authed);
  if (appShell) appShell.classList.toggle("hidden", !authed);

  if (authStatus) authStatus.textContent = authed ? "Authenticated." : "";

  // Clear password input after login/logout
  if (!authed && loginPass) loginPass.value = "";

  // Optional: reset mode pill on logout
  if (!authed && approveToggle) approveToggle.checked = false;
  setModePill();
}

function isApproved() {
  return !!approveToggle?.checked;
}

function setModePill() {
  if (!modePill) return;
  if (isApproved()) {
    modePill.textContent = "Mode: Remediation (Approved)";
    modePill.classList.add("danger");
  } else {
    modePill.textContent = "Mode: Diagnostics";
    modePill.classList.remove("danger");
  }
}

/* =========================
   Login / Logout
========================= */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    if (!window.LOGIN_URL) {
      toast("LOGIN_URL not set in index.html.");
      return;
    }

    const username = (loginUser?.value || "").trim();
    const password = (loginPass?.value || "").trim();
    if (!username || !password) {
      toast("Enter username and password.");
      return;
    }

    const resp = await fetch(window.LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok || !data.token) {
      toast(data.error || "Login failed.");
      return;
    }

    setToken(data.token);
    if (loginPass) loginPass.value = "";
    setAuthUI();
    toast("Login successful.");
  } catch (err) {
    toast(err?.message || "Login error.");
  }
});

logoutBtn?.addEventListener("click", () => {
  setToken("");
  setAuthUI();
  toast("Logged out.");
});

/* =========================
   Chat UI helpers
========================= */
function addBubble(role, text) {
  if (!chatEl) return null;
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function lastAssistantText() {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content || "";
  }
  return "";
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

function makeTicketNotes(text) {
  const ts = new Date().toISOString();
  return [
    `Ticket Notes (AI-assisted)`,
    `Timestamp: ${ts}`,
    `Mode: ${isApproved() ? "Remediation Approved" : "Diagnostics"}`,
    ``,
    text.trim()
  ].join("\n");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   Button bindings
========================= */
approveToggle?.addEventListener("change", () => {
  setModePill();
  toast(isApproved() ? "Remediation approved for next steps." : "Diagnostics mode enabled.");
});

copyTicketBtn?.addEventListener("click", async () => {
  const last = lastAssistantText();
  if (!last) return toast("Nothing to copy yet.");
  try {
    await copyToClipboard(makeTicketNotes(last));
    toast("Ticket notes copied.");
  } catch {
    toast("Copy failed (browser permissions).");
  }
});

exportTxtBtn?.addEventListener("click", () => {
  const lines = history.map((t) => {
    const label = t.role === "user" ? "USER" : "ASSISTANT";
    return `=== ${label} ===\n${(t.content || "").trim()}\n`;
  });
  downloadFile("chat-export.txt", lines.join("\n"), "text/plain");
  toast("Exported TXT.");
});

exportJsonBtn?.addEventListener("click", () => {
  const payload = {
    exported_at: new Date().toISOString(),
    mode: isApproved() ? "remediation_approved" : "diagnostics",
    history
  };
  downloadFile("chat-export.json", JSON.stringify(payload, null, 2), "application/json");
  toast("Exported JSON.");
});

/* =========================
   Presets
========================= */
const presets = {
  network: `Category: Networking (Switch/Router)
Goal: Diagnostics only (no changes)

Environment:
- Vendor/Model:
- OS/Version:
- Topology/Role:

Symptoms:
- What changed? (time, deploy, config, cabling)
- Impact scope (# users/services, VLANs, sites)

Evidence (paste outputs):
- show interface status
- show interface counters
- show log | last 50
- show spanning-tree
- show ip route
- traceroute/ping results

What you need:
- Root cause hypothesis + verification steps`,
  server: `Category: Server OS / Services
Goal: Diagnostics only (no changes)

Environment:
- OS (Linux/Windows):
- Host role/service:
- Recent changes (patch, deploy, config):

Symptoms:
- CPU/memory/disk?
- Service down? errors?
- Scope/impact:

Evidence (paste outputs/logs):
- Linux: top/htop, df -h, free -m, journalctl -u <svc>, ss -tulpn
- Windows: Event Viewer errors, Get-Service, Get-Process, perf counters

What you need:
- Likely causes ranked + verification commands + what to look for`,
  script: `Category: Script / Automation
Goal: Fix explanation + corrected snippet (no destructive steps unless approved)

Language/tool:
- PowerShell / Python / Bash / Ansible / Terraform / YAML/JSON

Input:
- Paste full error/traceback/logs
- Paste script (or minimal reproducible snippet)

Context:
- What should it do?
- What environment (OS, versions)?
- Any secrets redacted?

What you need:
- Root cause + corrected code + validation steps`,
  hardware: `Category: Hardware / Components
Goal: Diagnostics only (no changes)

Platform:
- Vendor (Dell/iDRAC, HPE/iLO, Supermicro/IPMI):
- Model:
- Alert codes / LEDs / logs:

Symptoms:
- Power/PSU?
- Thermals/fans?
- Storage/RAID?
- Memory/ECC?

Evidence:
- Screenshot of alert
- SEL / lifecycle logs / iLO logs
- Recent changes (firmware, component swap)

What you need:
- Likely cause + checks + safe remediation plan (approval-gated)`
};

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    if (!presets[key]) return;
    if (messageEl) messageEl.value = presets[key];
    messageEl?.focus();
    toast(`Loaded ${key} template.`);
  });
});

/* =========================
   Submit chat to backend
========================= */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) {
    toast("Please login first.");
    return;
  }

  const rawMessage = (messageEl?.value || "").trim();
  if (!rawMessage) return;

  const approvalHeader = isApproved()
    ? "APPROVAL: APPROVED (maintenance window OK; backups OK; rollback OK)"
    : "APPROVAL: NOT APPROVED (diagnostics only)";

  const message = `${approvalHeader}\n\n${rawMessage}`;

  addBubble("user", rawMessage);
  history.push({ role: "user", content: message });

  if (messageEl) messageEl.value = "";

  const working = addBubble("assistant", "Analyzing… diagnostics in progress…");

  try {
    if (!window.BACKEND_URL) {
      if (working) working.textContent = "Backend URL not set in index.html.";
      return;
    }

    const fd = new FormData();
    fd.append("message", message);
    fd.append("history", JSON.stringify(history));

    if (imageEl?.files && imageEl.files[0]) fd.append("image", imageEl.files[0]);

    const resp = await fetch(window.BACKEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });

    const data = await resp.json().catch(() => ({}));

    // If token expired/invalid, force re-login
    if (resp.status === 401) {
      setToken("");
      setAuthUI();
      if (working) working.textContent = "Session expired. Please sign in again.";
      return;
    }

    if (!resp.ok || !data.ok) {
      if (working) working.textContent = `Error: ${data.error || resp.statusText}`;
      return;
    }

    if (working) working.textContent = data.text || "(No response text)";
    history.push({ role: "assistant", content: data.text || "" });

    toast("Response received.");
  } catch (err) {
    if (working) working.textContent = `Error: ${err?.message || "Request failed"}`;
  } finally {
    if (imageEl) imageEl.value = "";
  }
});

/* =========================
   Init
========================= */
setModePill();
setAuthUI();
