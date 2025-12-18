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

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function isApproved() {
  return !!approveToggle?.checked;
}

function setModePill() {
  if (isApproved()) {
    modePill.textContent = "Mode: Remediation (Approved)";
    modePill.style.borderColor = "rgba(34,197,94,.35)";
    modePill.style.background = "rgba(34,197,94,.14)";
  } else {
    modePill.textContent = "Mode: Diagnostics";
    modePill.style.borderColor = "";
    modePill.style.background = "";
  }
}

approveToggle?.addEventListener("change", () => {
  setModePill();
  toast(isApproved() ? "Remediation approved for next steps." : "Diagnostics mode enabled.");
});

setModePill();

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
    `Mode: ${isApproved() ? "Remediation Approved" : "Diagnostics"}`,
    ``,
    text.trim()
  ].join("\n");
}

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

exportTxtBtn?.addEventListener("click", () => {
  const lines = history.map((t) => {
    const label = t.role === "user" ? "USER" : "ASSISTANT";
    return `=== ${label} ===\n${(t.content || "").trim()}\n`;
  });
  const txt = lines.join("\n");
  downloadFile("chat-export.txt", txt, "text/plain");
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

// Preset templates
const presets = {
  network: `Category: Networking (Switch/Router)
Goal: Diagnostics only (no changes)

Environment:
- Vendor/Model:
- OS/Version:
- Topology/Role (access/distribution/core):

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
- SEL / iDRAC lifecycle logs / iLO IM logs
- Recent changes (firmware, component swap)

What you need:
- Likely cause + checks + safe remediation plan (approval-gated)`
};

document.querySelectorAll(".chip[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    if (!presets[key]) return;
    messageEl.value = presets[key];
    messageEl.focus();
    toast(`Loaded ${key} template.`);
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rawMessage = messageEl.value.trim();
  if (!rawMessage) return;

  // Inject an explicit approval signal for the backend instructions.
  // This ensures your “approval-gated remediation” policy is enforceable and consistent.
  const approvalHeader = isApproved()
    ? "APPROVAL: APPROVED (maintenance window OK; backups OK; rollback OK)"
    : "APPROVAL: NOT APPROVED (diagnostics only)";

  const message = `${approvalHeader}\n\n${rawMessage}`;

  addBubble("user", rawMessage);
  history.push({ role: "user", content: message }); // store the enriched message for context

  messageEl.value = "";

  const working = addBubble("assistant", "Analyzing… diagnostics in progress…");

  try {
    if (!window.BACKEND_URL || window.BACKEND_URL.includes("YOUR_RENDER_BACKEND_URL")) {
      working.textContent = "Backend URL not set. Update window.BACKEND_URL in index.html.";
      return;
    }

    const fd = new FormData();
    fd.append("message", message);
    fd.append("history", JSON.stringify(history));

    if (imageEl.files && imageEl.files[0]) fd.append("image", imageEl.files[0]);

    const resp = await fetch(window.BACKEND_URL, { method: "POST", body: fd });
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      working.textContent = `Error: ${data.error || resp.statusText}`;
      return;
    }

    working.textContent = data.text;

    history.push({ role: "assistant", content: data.text });

    toast("Response received.");
  } catch (err) {
    working.textContent = `Error: ${err?.message || "Request failed"}`;
  } finally {
    imageEl.value = "";
  }
});
