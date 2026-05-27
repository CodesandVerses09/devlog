import { supabase } from "./supabase.js";

let activeTag = "All";
let currentUser = null;

// ── AUTH ──────────────────────────────────────────────
async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert(error.message);
  else alert("Check your email to confirm your account!");
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) alert(error.message);
  else {
    currentUser = data.user;
    showApp();
  }
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  showAuth();
}

// ── UI SWITCHING ──────────────────────────────────────
function showApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-email").textContent = currentUser.email;
  loadLogs();
}

function showAuth() {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
}

// ── STREAK ────────────────────────────────────────────
function calculateStreak(logs) {
  if (!logs || logs.length === 0) {
    document.getElementById("streak").textContent = "";
    return;
  }

  // Get unique dates logged (YYYY-MM-DD only, ignore time)
  const loggedDates = new Set(
    logs.map((log) => new Date(log.created_at).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const today = new Date();

  // Walk backwards from today
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    if (loggedDates.has(dateStr)) {
      streak++;
    } else {
      // Allow missing today (streak still counts if yesterday exists)
      if (i === 0) continue;
      break;
    }
  }

  const el = document.getElementById("streak");
  if (streak === 0) {
    el.textContent = "";
  } else if (streak === 1) {
    el.textContent = "🔥 1 day streak — keep it going!";
  } else {
    el.textContent = `🔥 ${streak} day streak — you're on fire!`;
  }
}

// ── SAVE LOG ──────────────────────────────────────────
async function saveLog() {
  const topic = document.getElementById("topic").value.trim();
  const text = document.getElementById("log").value.trim();

  if (!topic || !text) {
    alert("Fill in both fields!");
    return;
  }

  const { error } = await supabase
    .from("logs")
    .insert([{ user_id: currentUser.id, topic, text }]);

  if (error) alert(error.message);
  else {
    document.getElementById("topic").value = "";
    document.getElementById("log").value = "";
    loadLogs();
  }
}

// ── DELETE LOG ────────────────────────────────────────
async function deleteLog(id) {
  if (!confirm("Delete this log?")) return;
  await supabase.from("logs").delete().eq("id", id);
  loadLogs();
}

// ── EDIT LOG ──────────────────────────────────────────
function enableEdit(id, currentText) {
  const textEl = document.getElementById(`text-${id}`);
  const editBtn = document.getElementById(`edit-btn-${id}`);

  // Turn div into editable textarea
  textEl.setAttribute("contenteditable", "true");
  textEl.classList.add("editing");
  textEl.focus();

  // Move cursor to end
  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // Swap edit button to save button
  editBtn.textContent = "💾";
  editBtn.onclick = () => saveEdit(id);
}

async function saveEdit(id) {
  const textEl = document.getElementById(`text-${id}`);
  const newText = textEl.innerText.trim();

  if (!newText) {
    alert("Log text can't be empty!");
    return;
  }

  const { error } = await supabase
    .from("logs")
    .update({ text: newText })
    .eq("id", id);

  if (error) alert(error.message);
  else loadLogs();
}

// ── LOAD & RENDER LOGS ────────────────────────────────
async function loadLogs() {
  const searchQuery = document.getElementById("search-box").value.toLowerCase();

  const { data: logs, error } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Update streak every time logs load
  calculateStreak(logs);

  renderTags(logs);

  let filtered =
    activeTag === "All" ? logs : logs.filter((log) => log.topic === activeTag);

  if (searchQuery) {
    filtered = filtered.filter(
      (log) =>
        log.topic.toLowerCase().includes(searchQuery) ||
        log.text.toLowerCase().includes(searchQuery),
    );
  }

  const container = document.getElementById("logs-container");
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#555">No logs found.</p>';
  } else {
    filtered.forEach((log) => {
      const card = document.createElement("div");
      card.className = "log-card";
      card.innerHTML = `
        <button class="delete-btn" onclick="deleteLog('${log.id}')" title="Delete">✕</button>
        <button class="edit-btn" id="edit-btn-${log.id}" onclick="enableEdit('${log.id}', '')" title="Edit">✏️</button>
        <div class="tag"># ${log.topic}</div>
        <div class="text" id="text-${log.id}">${log.text}</div>
        <div class="date">${new Date(log.created_at).toDateString()}</div>
      `;
      container.appendChild(card);
    });
  }

  document.getElementById("logcount").textContent =
    logs.length > 0 ? `📝 ${logs.length} logs total` : "";
}

function renderTags(logs) {
  const topics = ["All", ...new Set(logs.map((log) => log.topic))];
  const container = document.getElementById("tags-filter");
  container.innerHTML = "";
  topics.forEach((topic) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn" + (topic === activeTag ? " active" : "");
    btn.textContent = topic === "All" ? "# All" : "# " + topic;
    btn.onclick = () => {
      activeTag = topic;
      loadLogs();
    };
    container.appendChild(btn);
  });
}

// ── EXPOSE GLOBALS ────────────────────────────────────
window.saveLog = saveLog;
window.deleteLog = deleteLog;
window.enableEdit = enableEdit;
window.saveEdit = saveEdit;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;

// ── SESSION CHECK ON LOAD ─────────────────────────────
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    showAuth();
  }
});
