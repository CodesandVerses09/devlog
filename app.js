import { supabase } from "./supabase.js";

let activeTag = "All";
let currentUser = null;

// AUTH FUNCTIONS
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

// UI SWITCHING
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

// LOG FUNCTIONS
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

async function deleteLog(id) {
  await supabase.from("logs").delete().eq("id", id);
  loadLogs();
}

async function loadLogs() {
  const searchQuery = document.getElementById("search-box").value.toLowerCase();

  let query = supabase
    .from("logs")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  const { data: logs, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

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
        <button class="delete-btn" onclick="deleteLog('${log.id}')">✕</button>
        <div class="tag"># ${log.topic}</div>
        <div class="text">${log.text}</div>
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

// EXPOSE FUNCTIONS GLOBALLY
window.saveLog = saveLog;
window.deleteLog = deleteLog;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;

// CHECK SESSION ON LOAD
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    showAuth();
  }
});
