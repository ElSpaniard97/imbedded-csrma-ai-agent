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
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = messageEl.value.trim();
  if (!message) return;

  addBubble("user", message);
  history.push({ role: "user", content: message });

  messageEl.value = "";

  const fd = new FormData();
  fd.append("message", message);
  fd.append("history", JSON.stringify(history));

  if (imageEl.files[0]) fd.append("image", imageEl.files[0]);

  addBubble("assistant", "Working...");

  const resp = await fetch(window.BACKEND_URL, { method: "POST", body: fd });
  const data = await resp.json();

  // replace "Working..." bubble
  chatEl.lastChild.textContent = data.ok ? data.text : `Error: ${data.error}`;

  if (data.ok) history.push({ role: "assistant", content: data.text });

  // clear file selection
  imageEl.value = "";
});
