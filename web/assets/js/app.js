const chatEl = document.getElementById("chat");
const form = document.getElementById("form");
const messageEl = document.getElementById("message");
const imageEl = document.getElementById("image");

const history = [];

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = messageEl.value.trim();
  if (!message) return;

  addBubble("user", message);
  history.push({ role: "user", content: message });

  messageEl.value = "";

  const working = addBubble("assistant", "Analyzing logs… running diagnostics…");

  try {
    if (!window.BACKEND_URL || window.BACKEND_URL.includes("YOUR_RENDER_BACKEND_URL")) {
      working.textContent = "Backend URL not set. Update window.BACKEND_URL in index.html after deploying Render.";
      return;
    }

    const fd = new FormData();
    fd.append("message", message);
    fd.append("history", JSON.stringify(history));

    if (imageEl.files && imageEl.files[0]) {
      fd.append("image", imageEl.files[0]);
    }

    const resp = await fetch(window.BACKEND_URL, { method: "POST", body: fd });
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      working.textContent = `Error: ${data.error || resp.statusText}`;
      return;
    }

    working.textContent = data.text;
    history.push({ role: "assistant", content: data.text });
  } catch (err) {
    working.textContent = `Error: ${err?.message || "Request failed"}`;
  } finally {
    imageEl.value = "";
  }
});
