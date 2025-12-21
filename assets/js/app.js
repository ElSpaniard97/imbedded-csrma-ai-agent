/* Jenko Frontend (server-authenticated) */

const $ = (sel) => document.querySelector(sel);

const loginScreen   = $("#loginScreen");
const appShell       = $("#appShell");

const loginForm      = $("#loginForm");
const loginUser      = $("#loginUser");
const loginPass      = $("#loginPass");
const authStatus     = $("#authStatus");
const logoutBtn      = $("#logoutBtn");
const themeToggle    = $("#themeToggle");

const approveToggle  = $("#approveToggle");
const modePill       = $("#modePill");

const clearChatBtn   = $("#clearChatBtn");

const saveSettingsBtn = $("#saveSettingsBtn");
const loadSettingsBtn = $("#loadSettingsBtn");

const copyTicketBtn  = $("#copyTicketBtn");
const exportTxtBtn   = $("#exportTxtBtn");
const exportJsonBtn  = $("#exportJsonBtn");

const chatEl         = $("#chat");
const formEl         = $("#form");
const msgEl          = $("#message");
const fileEl         = $("#image");
const sendBtn        = $("#sendBtn");

const toastEl        = $("#toast");

// API base from index.html
const API_BASE = window.API_BASE;

// local-only chat history (not sensitive, ticket-safe)
let history = loadLocalHistory();

function showToast(text, type="info") {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  toastEl.style.borderColor = type === "error" ? "rgba(255,77,79,.55)" : "rgba(58,167,255,.35)";
  toastEl.style.background  = type === "error" ? "rgba(255,77,79,.10)" : "rgba(12,18,32,.85)";
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toastEl.classList.add("hidden"), 2800);
}

function setAuthed(isAuthed) {
  if (isAuthed) {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
  } else {
    appShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem("jenko_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory() {
  localStorage.setItem("jenko_history", JSON.stringify(history.slice(-30)));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}

function renderChat() {
  chatEl.innerHTML = "";
  for (const item of history) {
    const div = document.createElement("div");
    div.className = `msg ${item.role}`;
    div.innerHTML = `
      <div class="meta">${escapeHtml(item.role)}</div>
      <div class="body">${escapeHtml(item.content)}</div>
    `;
    chatEl.appendChild(div);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

function setModePill() {
  modePill.textContent = approveToggle.checked ? "Mode: Remediation Approved" : "Mode: Diagnostics";
}

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("jenko_theme", theme);
}

function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

function currentSettings() {
  return {
    theme: getTheme(),
    remediationApproved: !!approveToggle.checked
  };
}

function applySettings(s) {
  if (!s || typeof s !== "object") return;
  if (s.theme === "light" || s.theme === "dark") setTheme(s.theme);
  if (typeof s.remediationApproved === "boolean") approveToggle.checked = s.remediationApproved;
  setModePill();
}

/* -------- Presets -------- */
const PRESETS = {
  network: `Network Intake (fill what you can)
- Impact: (who/what is down?)
- Scope: (one device/site or multiple?)
- Device: (vendor/model/OS version)
- Interfaces involved:
- Recent changes:
- Symptoms:
- CLI outputs (paste):
  - show interface status / counters
  - show vlan / trunk
  - show spanning-tree
  - show ip route / arp
- What you need: (restore connectivity? performance? errors?)`,

  server: `Server Intake (fill what you can)
- OS: (Linux/Windows) Version:
- Impact: (service down? slow? unreachable?)
- Hostname/IP:
- Recent changes:
- Symptoms:
- Evidence:
  - CPU/RAM/Disk:
  - Services status:
  - Logs (paste):
  - Network/DNS/TLS hints:
- What you need:`,

  script: `Script / Automation Intake (fill what you can)
- Language/tool: (PowerShell/Python/Bash/Ansible/Terraform/YAML/JSON)
- Goal of the script:
- Error message / stack trace:
- Relevant snippet (redact secrets):
- Expected behavior vs actual:
- Environment (OS, versions):
- What you need:`,

  hardware: `Hardware / Component Intake (fill what you can)
- Platform: (Dell iDRAC / HPE iLO / IPMI / Supermicro)
- Alert type: (PSU / Thermals / RAID / Memory ECC / Fans)
- Error codes / logs:
- Current status:
- Recent changes / maintenance:
- What you need: (triage, part swap plan, safe remediation after approval)`
};

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    const template = PRESETS[key] || "";
    msgEl.value = template + "\n\n---\nDescribe the issue here:\n";
    msgEl.rows = 10;              // expand editor for clearer view
    msgEl.focus();
    localStorage.setItem("jenko_last_preset", key);
    showToast(`Preset loaded: ${key.toUpperCase()}`);
  });
});

/* -------- Export / Copy -------- */
function ticketSafeTranscript() {
  const lines = [];
  for (const item of history) {
    lines.push(`${item.role.toUpperCase()}:`);
    lines.push(item.content);
    lines.push("");
  }
  return lines.join("\n").trim();
}

copyTicketBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(ticketSafeTranscript());
    showToast("Copied ticket notes.");
  } catch {
    showToast("Copy failed (browser blocked clipboard).", "error");
  }
});

exportTxtBtn?.addEventListener("click", () => {
  const blob = new Blob([ticketSafeTranscript()], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jenko-ticket-notes.txt";
  a.click();
  URL.revokeObjectURL(a.href);
});

exportJsonBtn?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jenko-chat.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* -------- Clear -------- */
clearChatBtn?.addEventListener("click", () => {
  const ok = confirm("Clear the conversation and start over?");
  if (!ok) return;
  history = [];
  saveLocalHistory();
  renderChat();
  msgEl.value = "";
  msgEl.rows = 3;
  showToast("Conversation cleared.");
});

/* -------- Theme -------- */
themeToggle?.addEventListener("click", toggleTheme);
setTheme(localStorage.getItem("jenko_theme") || "dark");

/* -------- Mode toggle -------- */
approveToggle?.addEventListener("change", () => {
  setModePill();
  localStorage.setItem("jenko_approval", approveToggle.checked ? "1" : "0");
});
approveToggle.checked = (localStorage.getItem("jenko_approval") === "1");
setModePill();

/* -------- Auth / Session -------- */
async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include", // IMPORTANT: send/receive cookies
    headers: {
      ...(options.headers || {})
    }
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text().catch(() => null);

  return { res, data };
}

async function checkSession() {
  const { res } = await api("/auth/me", { method: "GET" });
  return res.ok;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  authStatus.textContent = "";
  $("#loginBtn").disabled = true;

  try {
    const { res, data } = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUser.value.trim(),
        password: loginPass.value
      })
    });

    if (!res.ok) {
      const msg = (data && data.error) ? data.error : "Login failed.";
      authStatus.textContent = msg;
      showToast(msg, "error");
      return;
    }

    loginPass.value = "";
    setAuthed(true);
    showToast("Signed in.");

    // Load settings from server on login (if present)
    await loadSettingsFromServer(true);
  } finally {
    $("#loginBtn").disabled = false;
  }
});

logoutBtn?.addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  setAuthed(false);
  showToast("Signed out.");
});

/* -------- Settings (server-side) -------- */
async function saveSettingsToServer() {
  const payload = currentSettings();
  const { res, data } = await api("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = (data && data.error) ? data.error : "Failed to save settings.";
    showToast(msg, "error");
    return;
  }
  showToast("Settings saved.");
}

async function loadSettingsFromServer(silent=false) {
  const { res, data } = await api("/api/settings", { method: "GET" });
  if (!res.ok) {
    if (!silent) showToast("No saved settings found.", "error");
    return;
  }
  applySettings(data);
  if (!silent) showToast("Settings loaded.");
}

saveSettingsBtn?.addEventListener("click", saveSettingsToServer);
loadSettingsBtn?.addEventListener("click", () => loadSettingsFromServer(false));

/* -------- Chat submit -------- */
function buildMessageWithApprovalHeader(userText) {
  const header = approveToggle.checked ? "APPROVAL: APPROVED" : "APPROVAL: NOT APPROVED";
  return `${header}\n${userText}`;
}

formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = msgEl.value.trim();
  if (!userText) {
    showToast("Message is required.", "error");
    return;
  }

  sendBtn.disabled = true;

  const fullMessage = buildMessageWithApprovalHeader(userText);

  // update UI immediately
  history.push({ role: "user", content: fullMessage });
  saveLocalHistory();
  renderChat();

  try {
    const fd = new FormData();
    fd.append("message", fullMessage);
    fd.append("history", JSON.stringify(history.slice(-12)));

    const file = fileEl?.files?.[0];
    if (file) fd.append("image", file);

    const { res, data } = await api("/api/chat", { method: "POST", body: fd });

    if (!res.ok) {
      const msg = (data && data.error) ? data.error : "Request failed.";
      history.push({ role: "assistant", content: `Error: ${msg}` });
      saveLocalHistory();
      renderChat();
      showToast(msg, "error");
      return;
    }

    const reply = (data && data.text) ? data.text : "(No response text returned)";
    history.push({ role: "assistant", content: reply });
    saveLocalHistory();
    renderChat();

    msgEl.value = "";
    msgEl.rows = 3;
    if (fileEl) fileEl.value = "";
  } catch (err) {
    history.push({ role: "assistant", content: "Error: Failed to fetch (network/CORS/auth)." });
    saveLocalHistory();
    renderChat();
    showToast("Failed to fetch. Check Render URL/CORS/auth.", "error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* -------- Boot -------- */
(async function boot() {
  renderChat();

  // If user previously clicked a preset, you can auto-highlight behavior later if desired
  const authed = await checkSession();
  setAuthed(authed);
  if (authed) {
    await loadSettingsFromServer(true);
  }
})();
