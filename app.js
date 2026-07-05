import { supabase } from "./supabase.js";
import { toIST } from "./dateUtils.js";

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

// ── FORGOT / RESET PASSWORD ────────────────────────────
async function sendPasswordReset(email) {
  if (!email) {
    alert("Enter your email above first, then click 'forgot password?'");
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) alert(error.message);
  else alert("Check your email for a password reset link!");
}

function showResetForm() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "none";
  document.getElementById("reset-section").style.display = "flex";
}

async function submitNewPassword(password, confirmPassword) {
  if (!password || password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }
  if (password !== confirmPassword) {
    alert("Passwords don't match.");
    return;
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    alert(error.message);
    return;
  }
  alert("Password updated! Please log in with your new password.");
  await supabase.auth.signOut();
  document.getElementById("reset-section").style.display = "none";
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

// ── SHARED: which dates (IST) have at least one log ───
function getLoggedDatesSet(logs) {
  return new Set(logs.map((log) => toIST(log.created_at)));
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

  const loggedDates = getLoggedDatesSet(logs);

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
    days.push({ dateStr, count: countByDate[dateStr] || 0, isToday: i === 0 });
  }

  container.innerHTML = "";
  days.forEach(({ dateStr, count, isToday }) => {
    const sq = document.createElement("div");
    sq.className = "grid-square";
    if (count === 0) sq.classList.add("grid-empty");
    else if (count === 1) sq.classList.add("grid-light");
    else sq.classList.add("grid-bright");
    // Visually tie the grid to the streak: ring today's square so the
    // "current streak" the badge reports maps onto something you can see.
    if (isToday) sq.classList.add("grid-today");
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
  const codeEnabled = document.getElementById("code-toggle").checked;
  const code = codeEnabled
    ? document.getElementById("code").value.trim()
    : null;
  const codeLanguage = codeEnabled
    ? document.getElementById("code-language").value
    : null;

  if (!topic || !text) {
    alert("Fill in both fields!");
    return;
  }

  const { error } = await supabase.from("logs").insert([
    {
      user_id: currentUser.id,
      topic,
      text,
      difficulty,
      code,
      code_language: codeLanguage,
    },
  ]);

  if (error) alert(error.message);
  else {
    document.getElementById("topic").value = "";
    document.getElementById("log").value = "";
    document.getElementById("difficulty").value = "Medium";
    document.getElementById("code").value = "";
    document.getElementById("code-toggle").checked = false;
    document.getElementById("code-box").style.display = "none";
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
  const diffEl = document.getElementById("diff-" + id);
  const editBtn = document.getElementById("edit-btn-" + id);

  textEl.setAttribute("contenteditable", "true");
  textEl.classList.add("editing");
  textEl.focus();

  // Swap the static difficulty badge for an editable dropdown,
  // pre-selected to the log's current difficulty.
  const currentDifficulty = diffEl.dataset.difficulty || "Medium";
  diffEl.innerHTML = `
    <select id="diff-select-${id}" class="diff-select">
      <option value="Easy" ${currentDifficulty === "Easy" ? "selected" : ""}>Easy</option>
      <option value="Medium" ${currentDifficulty === "Medium" ? "selected" : ""}>Medium</option>
      <option value="Hard" ${currentDifficulty === "Hard" ? "selected" : ""}>Hard</option>
    </select>
  `;

  editBtn.textContent = "save";
  editBtn.onclick = () => saveEdit(id);
}

async function saveEdit(id) {
  const textEl = document.getElementById("text-" + id);
  const diffSelect = document.getElementById("diff-select-" + id);

  const newText = textEl.innerText.trim();
  const newDifficulty = diffSelect ? diffSelect.value : undefined;

  if (!newText) {
    alert("Log text cannot be empty!");
    return;
  }

  const { error } = await supabase
    .from("logs")
    .update({ text: newText, difficulty: newDifficulty })
    .eq("id", id);
  if (error) alert(error.message);
  else loadLogs();
}

// ── DIFFICULTY BADGE ──────────────────────────────────
function diffBadge(difficulty, logId) {
  const cls =
    difficulty === "Easy"
      ? "diff-easy"
      : difficulty === "Hard"
        ? "diff-hard"
        : "diff-medium";
  const label = difficulty || "Medium";
  return `<span class="diff-badge ${cls}" id="diff-${logId}" data-difficulty="${label}">${label}</span>`;
}

// ── ESCAPE HTML ───────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── CODE SNIPPET BLOCK ────────────────────────────────
function codeBlock(code, language) {
  if (!code) return "";
  return `
    <pre class="code-block"><code class="language-${language || "cpp"}">${escapeHtml(code)}</code></pre>
  `;
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
          ${diffBadge(log.difficulty, log.id)}
        </div>
        <div class="log-text" id="text-${log.id}">${escapeHtml(log.text)}</div>
        ${codeBlock(log.code, log.code_language)}
        <div class="log-meta">
          <span class="log-date">${toIST(log.created_at)}</span>
        </div>
      `;
      container.appendChild(card);
    });

    if (window.hljs) hljs.highlightAll();
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
window.sendPasswordReset = sendPasswordReset;
window.submitNewPassword = submitNewPassword;

// ── LISTEN FOR PASSWORD RECOVERY LINK ─────────────────
// Fires automatically when the user arrives via the emailed reset link.
supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showResetForm();
  }
});

// ── SESSION CHECK ─────────────────────────────────────
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showApp();
  } else showAuth();
});
