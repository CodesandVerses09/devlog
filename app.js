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
// Walk backwards from today, count consecutive days that have a log
function calculateStreak(logs) {
  const streakEl = document.getElementById("streak");
  if (!logs || logs.length === 0) {
    streakEl.textContent = "";
    return;
  }

  const loggedDates = new Set(
    logs.map((log) => new Date(log.created_at).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    if (loggedDates.has(dateStr)) {
      streak++;
    } else {
      if (i === 0) continue; // don't break if today is missing yet
      break;
    }
  }

  if (streak === 0) streakEl.textContent = "";
  else if (streak === 1)
    streakEl.textContent = "🔥 1 day streak — keep it going!";
  else streakEl.textContent = `🔥 ${streak} day streak — you're on fire!`;
}

// ── CONTRIBUTION GRID ─────────────────────────────────
// This is the GitHub-style heatmap.
// How it works:
//   1. Count how many logs exist per day (stored as YYYY-MM-DD)
//   2. Build 84 squares (12 weeks x 7 days), oldest to newest
//   3. Color each square based on log count: 0=dark, 1=light purple, 2+=bright purple
//   4. Add a tooltip showing date + count on hover
function renderGrid(logs) {
  const container = document.getElementById("contribution-grid");
  if (!container) return;

  // Step 1: count logs per date
  const countByDate = {};
  logs.forEach((log) => {
    const date = new Date(log.created_at).toISOString().slice(0, 10);
    countByDate[date] = (countByDate[date] || 0) + 1;
  });

  // Step 2: build array of last 84 days (oldest first)
  const days = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    days.push({ dateStr, count: countByDate[dateStr] || 0 });
  }

  // Step 3: render squares
  container.innerHTML = "";
  days.forEach(({ dateStr, count }) => {
    const sq = document.createElement("div");
    sq.className = "grid-square";

    // Color logic: 0 logs = empty, 1 = light, 2+ = bright
    if (count === 0) sq.classList.add("grid-empty");
    else if (count === 1) sq.classList.add("grid-light");
    else sq.classList.add("grid-bright");

    // Tooltip on hover
    sq.title =
      count === 0
        ? `${dateStr} — no log`
        : `${dateStr} — ${count} log${count > 1 ? "s" : ""}`;

    container.appendChild(sq);
  });
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
function enableEdit(id) {
  const textEl = document.getElementById("text-" + id);
  const editBtn = document.getElementById("edit-btn-" + id);
  textEl.setAttribute("contenteditable", "true");
  textEl.classList.add("editing");
  textEl.focus();
  editBtn.textContent = "💾";
  editBtn.onclick = () => saveEdit(id);
}

async function saveEdit(id) {
  const textEl = document.getElementById("text-" + id);
  const newText = textEl.innerText.trim();
  if (!newText) {
    alert("Log text cannot be empty!");
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
// Central function — called on load, after save, after delete, after edit
// Fetches ALL logs then: updates streak, renders grid, filters + shows cards
async function loadLogs() {
  const searchEl = document.getElementById("search-box");
  const searchQuery =
    searchEl && searchEl.value ? searchEl.value.toLowerCase() : "";

  const { data: logs, error } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Update all three views from the same data
  calculateStreak(logs);
  renderGrid(logs);
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
        <button class="edit-btn" id="edit-btn-${log.id}" onclick="enableEdit('${log.id}')" title="Edit">✏️</button>
        <div class="tag"># ${log.topic}</div>
        <div class="text" id="text-${log.id}">${log.text}</div>
        <div class="date">${new Date(log.created_at).toDateString()}</div>
      `;
      container.appendChild(card);
    });
  }

  const logcountEl = document.getElementById("logcount");
  if (logcountEl)
    logcountEl.textContent =
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
