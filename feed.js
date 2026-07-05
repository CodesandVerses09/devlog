import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://fxnvfphphkjwgimfwzaj.supabase.co";
const SUPABASE_KEY = "sb_publishable_o5ZKRnW9SZj8C9gJk_brfg_AQiW7nqT";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let activeTag = "All";
let allLogs = [];

// ─── LOAD FEED ────────────────────────────────────────────────
async function loadFeed() {
  const { data: logs, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feed error:", error);
    document.getElementById("feed-container").innerHTML =
      '<p style="color:#ef4444;text-align:center">Failed to load feed. Check console.</p>';
    return;
  }

  allLogs = logs;

  renderStats(logs);
  renderFeedTags(logs);
  renderFeed();
}

// ─── RENDER STATS BAR ─────────────────────────────────────────
function renderStats(logs) {
  const totalLogs = logs.length;
  const uniqueLearners = new Set(logs.map((l) => l.user_id)).size;

  const today = new Date().toISOString().split("T")[0];
  const loggedToday = logs.filter(
    (l) => l.created_at.split("T")[0] === today,
  ).length;

  document.getElementById("stat-logs").textContent = totalLogs;
  document.getElementById("stat-learners").textContent = uniqueLearners;
  document.getElementById("stat-today").textContent = loggedToday;
}

// ─── RENDER TAG FILTERS ───────────────────────────────────────
function renderFeedTags(logs) {
  const topics = ["All", ...new Set(logs.map((l) => l.topic))];
  const container = document.getElementById("feed-tags-filter");
  container.innerHTML = "";

  topics.forEach((topic) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn" + (topic === activeTag ? " active" : "");
    btn.textContent = topic === "All" ? "# All" : "# " + topic;
    btn.onclick = () => {
      activeTag = topic;
      // Update active class
      document
        .querySelectorAll("#feed-tags-filter .tag-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderFeed();
    };
    container.appendChild(btn);
  });
}

// ─── RENDER FEED CARDS ────────────────────────────────────────
function renderFeed() {
  const searchQuery = (
    document.getElementById("feed-search").value || ""
  ).toLowerCase();

  let filtered =
    activeTag === "All"
      ? allLogs
      : allLogs.filter((l) => l.topic === activeTag);

  if (searchQuery) {
    filtered = filtered.filter(
      (l) =>
        l.topic.toLowerCase().includes(searchQuery) ||
        l.text.toLowerCase().includes(searchQuery),
    );
  }

  const container = document.getElementById("feed-container");
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-feed">
        <p>No logs found.</p>
        <p style="font-size:0.85rem">Be the first to log something!</p>
      </div>`;
    return;
  }

  filtered.forEach((log) => {
    // Build a short public handle from user_id
    const handle = "dev_" + log.user_id.split("-")[0];
    const profileUrl = `profile.html?id=${log.user_id}`;

    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <div class="user-handle">
        <a href="${profileUrl}" target="_blank">${handle}</a>
      </div>
      <div class="tag"># ${log.topic}</div>
      <div class="text">${escapeHtml(log.text)}</div>
      <div class="date">${new Date(log.created_at).toDateString()}</div>
    `;
    container.appendChild(card);
  });
}

// ─── ESCAPE HTML (security) ───────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── EXPOSE FOR INLINE HTML HANDLERS (module scope isn't global) ──
window.loadFeed = loadFeed;
window.renderFeed = renderFeed;

// ─── INIT ─────────────────────────────────────────────────────
loadFeed();
