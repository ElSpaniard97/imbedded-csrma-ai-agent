/* =========================
   Config
========================= */
const APP_NAME = "Infra Troubleshooting Agent"; // (3) Rename here

const TOKEN_KEY = "ai_agent_token";
const SETTINGS_KEY = "ai_agent_settings_v1";

/* =========================
   DOM References (Login-first)
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
   Add-on UI (created by JS)
   - Clear conversation
   - Save settings
========================= */
function ensureUtilityButtons() {
  const controlsLeft = document.querySelector(".controls .left");
  const controlsRight = document.querySelector(".controls .right");
  if (!controlsLeft || !controlsRight) return;

  // Clear button (1)
  if (!document.getElementById("clearChatBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearChatBtn";
    clearBtn.type = "button";
    clearBtn.className = "btn secondary";
    clearBtn.textContent = "Clear";
    clearBtn.title = "Clear conversation and start over";
    clearBtn.addEventListener("click", () => clearConversation(true));
    controlsRight.prepend(clearBtn);
  }

  // Settings button (5)
  if (!document.getElementById("settingsBtn")) {
    const settingsBtn = document.createElement("button");
    settingsBtn.id = "settingsBtn";
    settingsBtn.type = "button";
    settingsBtn.className = "btn secondary";
    settingsBtn.textContent = "Settings";
    settingsBtn.title = "Save preferences for future troubleshooting";
    settingsBtn.addEventListener("click", () => openSettingsModal());
    controlsLeft.appendChild(settingsBtn);
  }

  // Settings modal container
  if (!document.getElementById("settingsModal")) {
    const modal = document.createElement("div");
    modal.id = "settingsModal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modalBackdrop" data-close="1"></div>
      <div class="modalCard" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="modalHeader">
          <div>
            <div class="modalTitle">Settings</div>
            <div class="modalSubtitle">Saved locally in your browser for future sessions.</div>
          </div>
          <button class="btn secondary modalClose" type="button" data-close="1">Close</button>
        </div>

        <div class="modalBody">
          <label class="field">
            <span class="fieldLabel">Default preset</span>
            <select class="input" id="settingDefaultPreset">
              <option value="">None</option>
              <option value="network">Network</option>
              <option value="server">Server</option>
              <option value="script">Script</option>
              <option value="hardware">Hardware</option>
            </select>
          </label>

          <label class="field row">
            <input type="checkbox" id="settingExpandOnPreset" />
            <span>Auto-expand message box when choosing a preset</span>
          </label>

          <label class="field row">
            <input type="checkbox" id="settingRememberApproval" />
            <span>Remember “Remediation approved” toggle</span>
          </label>

          <label class="field row">
            <input type="checkbox" id="settingDefaultApproval" />
            <span>Default remediation toggle to ON (only if you always intend this)</span>
          </label>

          <div class="modalActions">
            <button class="btn secondary" type="button" id="resetSettingsBtn">Reset</button>
            <button class="btn primary" type="button" id="saveSettingsBtn">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeSettingsModal();
    });
  }
}

/* =========================
   State
========================= */
const history = [];

/* =========================
   Utilities
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
   Settings (5)
========================= */
function defaultSettings() {
  return {
    defaultPreset: "",
    expandOnPreset: true,
    rememberApproval: true,
    defaultApproval: false
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  const s = loadSettings();

  // Remember approval toggle
  if (approveToggle && s.rememberApproval) {
    const remembered = localStorage.getItem("ai_agent_approval_default");
    if (remembered === "1") approveToggle.checked = true;
    if (remembered === "0") approveToggle.checked = false;
  } else if (approveToggle) {
    approveToggle.checked = !!s.defaultApproval;
  }

  setModePill();

  // Auto apply preset template if configured
  if (s.defaultPreset) {
    // Fill but do not force send. User can edit.
    presetFill(s.defaultPreset, { focus: false, expand: s.expandOnPreset });
  }
}

function rememberApprovalState() {
  const s = loadSettings();
  if (!s.rememberApproval) return;
  localStorage.setItem("ai_agent_approval_default", isApproved() ? "1" : "0");
}

/* =========================
   Login-first UI enforcement
========================= */
function setAuthUI() {
  const authed = !!getToken();

  if (loginScreen) loginScreen.classList.toggle("hidden", authed);
  if (appShell) appShell.classList.toggle("hidden", !authed);

  // Clean login status text; use toast for errors instead
  if (authStatus) authStatus.textContent = "";

  if (!authed) {
    if (loginPass) loginPass.value = "";
    if (approveToggle) approveToggle.checked = false;
    setModePill();
  } else {
    // When authenticated, ensure utility buttons exist and apply settings
    ensureUtilityButtons();
    applySettings();
  }
}

/* =========================
   Login / Logout
========================= */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    if (!window.LOGIN_URL) return toast("LOGIN_URL not set in index.html.");

    const username = (loginUser?.value || "").trim();
    const password = (loginPass?.value || "").trim();
    if (!username || !password) return toast("Enter username and password.");

    if (authStatus) authStatus.textContent = "Signing in…";

    const resp = await fetch(window.LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok || !data.token) {
      if (authStatus) authStatus.textContent = "";
      return toast(data.error || "Login failed.");
    }

    setToken(data.token);
    if (loginPass) loginPass.value = "";
    if (authStatus) authStatus.textContent = "";

    setAuthUI();
    toast(`${APP_NAME}: login successful.`);
  } catch (err) {
    if (authStatus) authStatus.textContent = "";
    toast(err?.message || "Login error.");
  }
});

logoutBtn?.addEventListener("click", () => {
  setToken("");
  clearConversation(false);
  setAuthUI();
  toast("Logged out.");
});

/* =========================
   Conversation (1)
========================= */
function clearConversation(showToast) {
  history.length = 0;
  if (chatEl) chatEl.innerHTML = "";
  if (messageEl) messageEl.value = "";
  if (imageEl) imageEl.value = "";
  if (approveToggle) approveToggle.checked = false;
  setModePill();
  if (showToast) toast("Conversation cleared.");
}

/* =========================
   Chat helpers
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
    `Tool: ${APP_NAME}`,
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
  rememberApprovalState();
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
    tool: APP_NAME,
    mode: isApproved() ? "remediation_approved" : "diagnostics",
    history
  };
  downloadFile("chat-export.json", JSON.stringify(payload, null, 2), "application/json");
  toast("Exported JSON.");
});

/* =========================
   Presets (4)
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

function expandMessageBox() {
  if (!messageEl) return;
  messageEl.classList.add("expanded");
  messageEl.rows = 10;
}

function collapseMessageBoxIfEmpty() {
  if (!messageEl) return;
  if (messageEl.value.trim()) return;
  messageEl.classList.remove("expanded");
  messageEl.rows = 3;
}

function presetFill(key, opts = { focus: true, expand: true }) {
  if (!presets[key] || !messageEl) return;
  messageEl.value = presets[key];

  const s = loadSettings();
  const expand = opts.expand ?? s.expandOnPreset;

  if (expand) expandMessageBox();
  if (opts.focus) messageEl.focus();

  toast(`Loaded ${key} template.`);
}

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    presetFill(key, { focus: true, expand: true });
  });
});

messageEl?.addEventListener("blur", () => collapseMessageBoxIfEmpty());

/* =========================
   Settings modal (5)
========================= */
function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  const s = loadSettings();

  const preset = document.getElementById("settingDefaultPreset");
  const expand = document.getElementById("settingExpandOnPreset");
  const remember = document.getElementById("settingRememberApproval");
  const defaultApproval = document.getElementById("settingDefaultApproval");

  if (preset) preset.value = s.defaultPreset || "";
  if (expand) expand.checked = !!s.expandOnPreset;
  if (remember) remember.checked = !!s.rememberApproval;
  if (defaultApproval) defaultApproval.checked = !!s.defaultApproval;

  modal.classList.remove("hidden");
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function wireSettingsModalButtons() {
  const saveBtn = document.getElementById("saveSettingsBtn");
  const resetBtn = document.getElementById("resetSettingsBtn");

  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = "1";
    saveBtn.addEventListener("click", () => {
      const preset = document.getElementById("settingDefaultPreset");
      const expand = document.getElementById("settingExpandOnPreset");
      const remember = document.getElementById("settingRememberApproval");
      const defaultApproval = document.getElementById("settingDefaultApproval");

      const s = loadSettings();
      s.defaultPreset = preset ? preset.value : "";
      s.expandOnPreset = expand ? !!expand.checked : true;
      s.rememberApproval = remember ? !!remember.checked : true;
      s.defaultApproval = defaultApproval ? !!defaultApproval.checked : false;

      saveSettings(s);

      // Apply immediately
      applySettings();
      closeSettingsModal();
      toast("Settings saved.");
    });
  }

  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "1";
    resetBtn.addEventListener("click", () => {
      saveSettings(defaultSettings());
      localStorage.removeItem("ai_agent_approval_default");
      applySettings();
      closeSettingsModal();
      toast("Settings reset.");
    });
  }
}

/* =========================
   Submit chat to backend (requires token)
========================= */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) {
    toast("Please login first.");
    setAuthUI();
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
  collapseMessageBoxIfEmpty();

  const working = addBubble("assistant", "Analyzing… diagnostics in progress…");

  try {
    if (!window.BACKEND_URL) {
      if (working) working.textContent = "BACKEND_URL not set in index.html.";
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

    if (resp.status === 401) {
      setToken("");
      clearConversation(false);
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
ensureUtilityButtons();
wireSettingsModalButtons();
