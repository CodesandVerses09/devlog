function calculateStreak() {
  const logs = JSON.parse(localStorage.getItem("devlogs")) || [];

  if (logs.length === 0) return 0;

  const dates = logs.map((log) => new Date(log.date).toDateString());
  const uniqueDates = [...new Set(dates)];

  let streak = 1;
  const today = new Date().toDateString();

  if (!uniqueDates.includes(today)) return 0;

  for (let i = uniqueDates.length - 1; i > 0; i--) {
    const curr = new Date(uniqueDates[i]);
    const prev = new Date(uniqueDates[i - 1]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }

  return streak;
}

function loadLogs() {
  const logs = JSON.parse(localStorage.getItem("devlogs")) || [];
  const container = document.getElementById("logs-container");
  container.innerHTML = "";

  if (logs.length === 0) {
    container.innerHTML = '<p style="color:#555">No logs yet. Start today!</p>';
  } else {
    [...logs].reverse().forEach((log) => {
      const card = document.createElement("div");
      card.className = "log-card";
      card.innerHTML = `
        <div class="tag"># ${log.topic}</div>
        <div class="text">${log.text}</div>
        <div class="date">${log.date}</div>
      `;
      container.appendChild(card);
    });
  }

  const streak = calculateStreak();
  document.getElementById("streak").textContent =
    streak > 0 ? `🔥 ${streak} day streak` : "";
}

function saveLog() {
  const topic = document.getElementById("topic").value.trim();
  const text = document.getElementById("log").value.trim();

  if (!topic || !text) {
    alert("Fill in both fields!");
    return;
  }

  const logs = JSON.parse(localStorage.getItem("devlogs")) || [];

  logs.push({
    topic,
    text,
    date: new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  });

  localStorage.setItem("devlogs", JSON.stringify(logs));

  document.getElementById("topic").value = "";
  document.getElementById("log").value = "";

  loadLogs();
}

loadLogs();
