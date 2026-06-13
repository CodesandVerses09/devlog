import { supabase } from "./supabase.js";

let activeTag = "All";
let currentUser = null;

// ── IST HELPER ────────────────────────────────────────
function toIST(dateInput) {
  const date = new Date(dateInput);
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

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
  const profileLink = document.getElementById("profile-link");
  if (profileLink) profileLink.href = `profile.html?id=${currentUser.id}`;
  loadLogs();
}

function showAuth() {
  document.getElementById("auth-section").style.display = "flex";
  document.getElementById("app-section").style.display = "none";
}

// ── STREAK ────────────────────────────────────────────
function calculateStreak(logs) {
  const badge = document.getElementById("streak-badge");
  const statStreak = document.getElementById("stat-streak");

  if (!logs || logs.length === 0) {
    if (badge) badge.style.display = "none";
    if (statStreak) statStreak.textContent = "0";
    return;
  }

  const loggedDates = new Set(logs.map((log) => toIST(log.created_at)));

  let streak = 0;
  const todayIST = toIST(new Date());

  for (let i = 0; i < 365; i++) {
    const date = new Date(todayIST);
    date.setDate(date.getDate() - i);
    const dateStr = toIST(date);

    if (loggedDates.has(dateStr)) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }

  if (statStreak) statStreak.textContent = streak;

  if (streak === 0) {
    if (badge) badge.style.display = "none";
  } else {
    if (badge) {
      badge.style.display = "inline-block";
      badge.textContent = `🔥 ${streak} day streak`;
    }
  }
}

// ── CONTRIBUTION GRID ─────────────────────────────────
function renderGrid(logs) {
  const container = document.getElementById("contribution-grid");
  if (!container) return;

  const countByDate = {};
  logs.forEach((log) => {
    const date = toIST(log.created_at);
    countByDate[date] = (countByDate[date] || 0) + 1;
  });

  const days = [];
  const todayIST = toIST(new Date());
  for (let i = 83; i >= 0; i--) {
    const date = new Date(todayIST);
    date.setDate(date.getDate() - i);
    const dateStr = toIST(date);
    days.push({ dateStr, count: countByDate[dateStr] || 0 });
  }

  container.innerHTML = "";
  days.forEach(({ dateStr, count }) => {
    const sq = document.createElement("div");
    sq.className = "grid-square";
    if (count === 0) sq.classList.add("grid-empty");
    else if (count === 1) sq.classList.add("grid-light");
    else sq.classList.add("grid-bright");
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
  const difficulty = document.getElementById("difficulty").value;

  if (!topic || !text) {
    alert("Fill in both fields!");
    return;
  }

  const { error } = await supabase
    .from("logs")
    .insert([{ user_id: currentUser.id, topic, text, difficulty }]);

  if (error) alert(error.message);
  else {
    document.getElementById("topic").value = "";
    document.getElementById("log").value = "";
    document.getElementById("difficulty").value = "Medium";
    const form = document.getElementById("log-form");
    const btn = document.getElementById("form-toggle");
    if (form) form.style.display = "none";
    if (btn) {
      btn.textContent = "+ log today";
      btn.classList.remove("open");
    }
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
  editBtn.textContent = "save";
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

// ── DIFFICULTY BADGE ──────────────────────────────────
function diffBadge(difficulty) {
  if (!difficulty) return "";
  const cls =
    difficulty === "Easy"
      ? "diff-easy"
      : difficulty === "Hard"
        ? "diff-hard"
        : "diff-medium";
  return `<span class="diff-badge ${cls}">${difficulty}</span>`;
}

// ── ESCAPE HTML ───────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── LOAD & RENDER LOGS ────────────────────────────────
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

  calculateStreak(logs);
  renderGrid(logs);
  renderTags(logs);

  const statTotal = document.getElementById("stat-total");
  const statTopics = document.getElementById("stat-topics");
  if (statTotal) statTotal.textContent = logs.length;
  if (statTopics)
    statTopics.textContent = new Set(logs.map((l) => l.topic)).size;

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
    container.innerHTML = '<p class="empty-state">// no logs found</p>';
  } else {
    filtered.forEach((log) => {
      const card = document.createElement("div");
      card.className = "log-card";
      card.innerHTML = `
        <div class="card-actions">
          <button class="edit-btn" id="edit-btn-${log.id}" onclick="enableEdit('${log.id}')">edit</button>
          <button class="del-btn" onclick="deleteLog('${log.id}')">✕</button>
        </div>
        <div class="log-card-header">
          <span class="log-topic">${escapeHtml(log.topic)}</span>
          ${diffBadge(log.difficulty)}
        </div>
        <div class="log-text" id="text-${log.id}">${escapeHtml(log.text)}</div>
        <div class="log-meta">
          <span class="log-date">${toIST(log.created_at)}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

// ── TAGS ──────────────────────────────────────────────
function renderTags(logs) {
  const topics = ["All", ...new Set(logs.map((log) => log.topic))];
  const container = document.getElementById("tags-filter");
  container.innerHTML = "";
  topics.forEach((topic) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn" + (topic === activeTag ? " active" : "");
    btn.textContent = topic === "All" ? "# all" : "# " + topic.toLowerCase();
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

// ── SESSION CHECK ─────────────────────────────────────
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showApp();
  } else showAuth();
});
