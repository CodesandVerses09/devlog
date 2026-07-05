import { supabase } from "./supabase.js";
import { toIST } from "./dateUtils.js";

// ── HOW THIS PAGE WORKS ───────────────────────────────
// 1. Read the user ID from the URL: ?id=UUID
// 2. Fetch all logs for that user_id from Supabase (public read policy allows this)
// 3. Calculate streak + stats from those logs
// 4. Render the contribution grid
// 5. Show all logs as cards
// No login needed — this is a fully public page

let activeTag = "All";
let allLogs = [];

// ── STEP 1: READ URL PARAMS ───────────────────────────
const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

if (!userId) {
  showNotFound();
} else {
  loadProfile(userId);
}

// ── STEP 2: FETCH LOGS ────────────────────────────────
async function loadProfile(userId) {
  const { data: logs, error } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !logs) {
    showNotFound();
    return;
  }

  allLogs = logs;

  // Hide loading, show content
  document.getElementById("loading").style.display = "none";
  document.getElementById("profile-content").style.display = "block";

  // Populate all sections
  setProfileHeader(userId, logs);
  setStats(logs);
  renderGrid(logs);
  renderTags(logs);
  renderLogs(logs);
}

// ── PROFILE HEADER ────────────────────────────────────
function setProfileHeader(userId, logs) {
  // We don't have the email publicly, so show a friendly handle
  // Use first 8 chars of UUID as a short ID
  const shortId = userId.slice(0, 8);
  document.getElementById("profile-email").textContent = "dev_" + shortId;
  document.getElementById("avatar-letter").textContent =
    shortId[0].toUpperCase();
  document.title = `DevLog — dev_${shortId}`;
}

// ── STATS ─────────────────────────────────────────────
// Total logs, current streak, unique topics
function setStats(logs) {
  // Total logs
  document.getElementById("stat-logs").textContent = logs.length;

  // Unique topics
  const topics = new Set(logs.map((l) => l.topic));
  document.getElementById("stat-topics").textContent = topics.size;

  // Streak — uses the same IST-based date logic as app.js (dateUtils.js),
  // so this number can never disagree with the streak on your own journal.
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

  document.getElementById("stat-streak").textContent = streak;
}

// ── CONTRIBUTION GRID ─────────────────────────────────
// Uses the same IST-based date logic as app.js (via dateUtils.js)
function renderGrid(logs) {
  const container = document.getElementById("contribution-grid");

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

// ── TAG FILTER ────────────────────────────────────────
function renderTags(logs) {
  const topics = ["All", ...new Set(logs.map((l) => l.topic))];
  const container = document.getElementById("tags-filter");
  container.innerHTML = "";
  topics.forEach((topic) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn" + (topic === activeTag ? " active" : "");
    btn.textContent = topic === "All" ? "# All" : "# " + topic;
    btn.onclick = () => {
      activeTag = topic;
      renderTags(allLogs);
      renderLogs(allLogs);
    };
    container.appendChild(btn);
  });
}

// ── RENDER LOGS ───────────────────────────────────────
function renderLogs(logs) {
  let filtered =
    activeTag === "All" ? logs : logs.filter((l) => l.topic === activeTag);

  const container = document.getElementById("logs-container");
  container.innerHTML = "";

  const title = document.getElementById("logs-title");
  title.textContent =
    activeTag === "All"
      ? `All Logs (${logs.length})`
      : `# ${activeTag} (${filtered.length})`;

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#555">No logs found.</p>';
    return;
  }

  filtered.forEach((log) => {
    const card = document.createElement("div");
    card.className = "log-card";
    card.innerHTML = `
      <div class="tag"># ${escapeHtml(log.topic)}</div>
      <div class="text">${escapeHtml(log.text)}</div>
      ${codeBlock(log.code, log.code_language)}
      <div class="date">${new Date(log.created_at).toDateString()}</div>
    `;
    container.appendChild(card);
  });

  if (window.hljs) hljs.highlightAll();
}

// ── CODE SNIPPET BLOCK ─────────────────────────────────
function codeBlock(code, language) {
  if (!code) return "";
  return `
    <pre class="code-block"><code class="language-${language || "cpp"}">${escapeHtml(code)}</code></pre>
  `;
}

// ── ESCAPE HTML (prevents XSS from user-entered log text) ─
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── SHARE BUTTON ──────────────────────────────────────
// Copies the current profile URL to clipboard
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.querySelector(".share-btn");
    btn.textContent = "✅ Copied!";
    setTimeout(() => {
      btn.textContent = "🔗 Share Profile";
    }, 2000);
  });
}

// ── NOT FOUND ─────────────────────────────────────────
function showNotFound() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("not-found").style.display = "block";
}

// Expose copyLink globally (called from HTML onclick)
window.copyLink = copyLink;
