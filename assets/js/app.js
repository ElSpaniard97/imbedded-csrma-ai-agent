const APP_NAME = "Infra Troubleshooting Agent";

const TOKEN_KEY = "ai_agent_token";
const SETTINGS_CACHE_KEY = "ai_agent_settings_cache_v1"; // local cache for faster UI

// ---------- DOM ----------
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");

const loginForm = document.getElementById("loginForm");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const authStatus = document.getElementById("authStatus");
const logoutBtn = document.getElementById("logoutBtn");

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

const history = [];

// ---------- Toast ----------
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// ---------- Token ----------
function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

// ---------- Theme ----------
function applyTheme(theme) {
  const root = document.documentElement;
  root.removeAttribute("data-theme");
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  if (theme === "light") root.setAttribute("data-theme", "light");
  // system => attribute removed; CSS uses prefers-color-scheme
}

// ---------- Settings defaults ----------
function defaultSettings() {
  return {
    defaultPreset: "",
    expandOnPreset: true,
    rememberApproval: true,
    defaultApproval: false,
    theme: "system"
  };
}

// ---------- Settings cache (local) ----------
function loadCachedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}
function cacheSettings(s) {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(s));
}

// ---------- Settings API ----------
function settingsBaseUrl() {
  // Your backend base is same host as chat endpoint
  // BACKEND_URL is ".../api/chat" → settings is ".../api/settings"
  if (!window.BACKEND_URL) return "";
  return window.BACKEND_URL.replace(/\/api\/chat\/?$/, "");
}

async function apiGetSettings() {
  const token = getToken();
  const base = settingsBaseUrl();
  if (!token || !base) throw new Error("Missing token or backend URL");

  const resp = await fetch(`${base}/api/settings`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await resp.json().catch(() => ({}));
  if (resp.status === 401) throw new Error("unauthorized");
  if (!resp.ok || !data.ok) throw new Error(data.error || "Failed to load settings");
  return data.settings;
}

async function apiSaveSettings(settings) {
  const token = getToken();
  const base = settingsBaseUrl();
  if (!token || !base) throw new Error("Missing token or backend URL");

  const resp = await fetch(`${base}/api/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ settings })
  });

  const data = await resp.json().catch(() => ({}));
  if (resp.status === 401) throw new Error("unauthorized");
  if (!resp.ok || !data.ok) throw new Error(data.error || "Failed to save settings");
  return data.settings;
}

// ---------- Mode ----------
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

// ---------- Utility Buttons + Settings Modal ----------
function ensureUtilityButtons() {
  const controlsLeft = document.querySelector(".controls .left");
  const controlsRight = document.querySelector(".controls .right");
  if (!controlsLeft || !controlsRight) return;

  if (!document.getElementById("clearChatBtn")) {
    const btn = document.createElement("button");
    btn.id = "clearChatBtn";
    btn.type = "button";
    btn.className = "btn secondary";
    btn.textContent = "Clear";
    btn.addEventListener("click", () => clearConversation(true));
    controlsRight.prepend(btn);
  }

  if (!document.getElementById("settingsBtn")) {
    const btn = document.createElement("button");
    btn.id = "settingsBtn";
    btn.type = "button";
    btn.className = "btn secondary";
    btn.textContent = "Settings";
    btn.addEventListener("click", () => openSettingsModal());
    controlsLeft.appendChild(btn);
  }

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
            <div class="modalSubtitle">Saved to your account (server-side) for future sessions.</div>
          </div>
          <button class="btn secondary" type="button" data-close="1">Close</button>
        </div>

        <div class="modalBody">
          <label class="field">
            <span class="fieldLabel">Theme</span>
            <select class="input" id="settingTheme">
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

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
            <span>Default remediation toggle to ON</span>
          </label>

          <div class="modalActions">
            <button class="btn secondary" type="button" id="resetSettingsBtn">Reset</button>
            <button class="btn primary" type="button" id="saveSettingsBtn">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.getAttribute?.("data-close") === "1") closeSettingsModal();
    });
  }
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  const s = loadCachedSettings();

  document.getElementById("settingTheme").value = s.theme || "system";
  document.getElementById("settingDefaultPreset").value = s.defaultPreset || "";
  document.getElementById("settingExpandOnPreset").checked = !!s.expandOnPreset;
  document.getElementById("settingRememberApproval").checked = !!s.rememberApproval;
  document.getElementById("settingDefaultApproval").checked = !!s.defaultApproval;

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
    saveBtn.addEventListener("click", async () => {
      try {
        const next = {
          theme: document.getElementById("settingTheme").value,
          defaultPreset: document.getElementById("settingDefaultPreset").value,
          expandOnPreset: !!document.getElementById("settingExpandOnPreset").checked,
          rememberApproval: !!document.getElementById("settingRememberApproval").checked,
          defaultApproval: !!document.getElementById("settingDefaultApproval").checked
        };

        // Optimistic apply
        cacheSettings({ ...defaultSettings(), ...next });
        applySettingsToUI(cacheSettingsAndReturn());

        // Persist server-side
        const saved = await apiSaveSettings(next);
        cacheSettings({ ...defaultSettings(), ...saved });
        applySettingsToUI(cacheSettingsAndReturn());

        closeSettingsModal();
        toast("Settings saved (server-side).");
      } catch (err) {
        if (String(err?.message) === "unauthorized") {
          setToken("");
          setAuthUI();
          toast("Session expired. Please sign in again.");
          return;
        }
        toast(err?.message || "Failed to save settings");
      }
    });
  }

  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "1";
    resetBtn.addEventListener("click", async () => {
      try {
        const reset = defaultSettings();

        cacheSettings(reset);
        applySettingsToUI(reset);

        const saved = await apiSaveSettings(reset);
        cacheSettings({ ...defaultSettings(), ...saved });
        applySettingsToUI(cacheSettingsAndReturn());

        closeSettingsModal();
        toast("Settings reset.");
      } catch (err) {
        if (String(err?.message) === "unauthorized") {
          setToken("");
          setAuthUI();
          toast("Session expired. Please sign in again.");
          return;
        }
        toast(err?.message || "Failed to reset settings");
      }
    });
  }
}

function cacheSettingsAndReturn() {
  return loadCachedSettings();
}

function applySettingsToUI(s) {
  applyTheme(s.theme);

  if (approveToggle) {
    // On server-side version, "rememberApproval" behavior is UX-level;
    // we keep the current toggle unless user wants default set.
    // If user enabled defaultApproval, set toggle accordingly when app loads.
    approveToggle.checked = !!s.defaultApproval;
  }
  setModePill();

  if (s.defaultPreset) {
    presetFill(s.defaultPreset, { focus: false, expand: !!s.expandOnPreset, silent: true });
  }
}

// ---------- Login-first gating ----------
function setAuthUI() {
  const authed = !!getToken();
  loginScreen?.classList.toggle("hidden", authed);
  appShell?.classList.toggle("hidden", !authed);
  if (authStatus) authStatus.textContent = "";
  if (!authed) {
    loginPass && (loginPass.value = "");
    approveToggle && (approveToggle.checked = false);
    setModePill();
  } else {
    ensureUtilityButtons();
    wireSettingsModalButtons();
  }
}

// ---------- Conversation ----------
function clearConversation(showToast) {
  history.length = 0;
  if (chatEl) chatEl.innerHTML = "";
  if (messageEl) messageEl.value = "";
  if (imageEl) imageEl.value = "";
  if (approveToggle) approveToggle.checked = false;
  setModePill();
  if (showToast) toast("Conversation cleared.");
}

// ---------- Chat helpers ----------
function addBubble(role, text) {
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

// ---------- Buttons ----------
approveToggle?.addEventListener("change", () => setModePill());

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

// ---------- Presets ----------
const presets = {
  network: `Category: Networking (Switch/Router)\nGoal: Diagnostics only (no changes)\n\nEnvironment:\n- Vendor/Model:\n- OS/Version:\n- Topology/Role:\n\nSymptoms:\n- What changed? (time, deploy, config, cabling)\n- Impact scope (# users/services, VLANs, sites)\n\nEvidence (paste outputs):\n- show interface status\n- show interface counters\n- show log | last 50\n- show spanning-tree\n- show ip route\n- traceroute/ping results\n\nWhat you need:\n- Root cause hypothesis + verification steps`,
  server: `Category: Server OS / Services\nGoal: Diagnostics only (no changes)\n\nEnvironment:\n- OS (Linux/Windows):\n- Host role/service:\n- Recent changes (patch, deploy, config):\n\nSymptoms:\n- CPU/memory/disk?\n- Service down? errors?\n- Scope/impact:\n\nEvidence (paste outputs/logs):\n- Linux: top/htop, df -h, free -m, journalctl -u <svc>, ss -tulpn\n- Windows: Event Viewer errors, Get-Service, Get-Process, perf counters\n\nWhat you need:\n- Likely causes ranked + verification commands + what to look for`,
  script: `Category: Script / Automation\nGoal: Fix explanation + corrected snippet (no destructive steps unless approved)\n\nLanguage/tool:\n- PowerShell / Python / Bash / Ansible / Terraform / YAML/JSON\n\nInput:\n- Paste full error/traceback/logs\n- Paste script (or minimal reproducible snippet)\n\nContext:\n- What should it do?\n- What environment (OS, versions)?\n- Any secrets redacted?\n\nWhat you need:\n- Root cause + corrected code + validation steps`,
  hardware: `Category: Hardware / Components\nGoal: Diagnostics only (no changes)\n\nPlatform:\n- Vendor (Dell/iDRAC, HPE/iLO, Supermicro/IPMI):\n- Model:\n- Alert codes / LEDs / logs:\n\nSymptoms:\n- Power/PSU?\n- Thermals/fans?\n- Storage/RAID?\n- Memory/ECC?\n\nEvidence:\n- Screenshot of alert\n- SEL / lifecycle logs / iLO logs\n- Recent changes (firmware, component swap)\n\nWhat you need:\n- Likely cause + checks + safe remediation plan (approval-gated)`
};

function expandMessageBox() {
  if (!messageEl) return;
  messageEl.classList.add("expanded");
  messageEl.rows = 10;
}

function presetFill(key, opts = { focus: true, expand: true, silent: false }) {
  if (!presets[key] || !messageEl) return;
  messageEl.value = presets[key];
  if (opts.expand) expandMessageBox();
  if (opts.focus) messageEl.focus();
  if (!opts.silent) toast(`Loaded ${key} template.`);
}

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    const s = loadCachedSettings();
    presetFill(key, { focus: true, expand: !!s.expandOnPreset, silent: false });
  });
});

// ---------- Submit chat ----------
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

  messageEl.value = "";
  const working = addBubble("assistant", "Analyzing… diagnostics in progress…");

  try {
    const fd = new FormData();
    fd.append("message", message);
    fd.append("history", JSON.stringify(history));
    if (imageEl?.files?.[0]) fd.append("image", imageEl.files[0]);

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
      working.textContent = "Session expired. Please sign in again.";
      return;
    }

    if (!resp.ok || !data.ok) {
      working.textContent = `Error: ${data.error || resp.statusText}`;
      return;
    }

    working.textContent = data.text || "(No response text)";
    history.push({ role: "assistant", content: data.text || "" });
    toast("Response received.");
  } catch (err) {
    working.textContent = `Error: ${err?.message || "Request failed"}`;
  } finally {
    if (imageEl) imageEl.value = "";
  }
});

// ---------- Login / Logout ----------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const username = (loginUser?.value || "").trim();
    const password = (loginPass?.value || "").trim();
    if (!username || !password) return toast("Enter username and password.");

    authStatus && (authStatus.textContent = "Signing in…");

    const resp = await fetch(window.LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok || !data.token) {
      authStatus && (authStatus.textContent = "");
      return toast(data.error || "Login failed.");
    }

    setToken(data.token);
    loginPass.value = "";
    authStatus && (authStatus.textContent = "");

    // After login: fetch server settings
    setAuthUI();
    ensureUtilityButtons();
    wireSettingsModalButtons();

    try {
      const serverSettings = await apiGetSettings();
      cacheSettings({ ...defaultSettings(), ...serverSettings });
      applySettingsToUI(loadCachedSettings());
    } catch (err) {
      // If settings fail, continue with cached defaults
      cacheSettings(loadCachedSettings());
      applySettingsToUI(loadCachedSettings());
    }

    toast(`${APP_NAME}: login successful.`);
  } catch (err) {
    authStatus && (authStatus.textContent = "");
    toast(err?.message || "Login error.");
  }
});

logoutBtn?.addEventListener("click", () => {
  setToken("");
  clearConversation(false);
  setAuthUI();
  toast("Logged out.");
});

// ---------- Init ----------
setModePill();
setAuthUI();
applyTheme(loadCachedSettings().theme);
