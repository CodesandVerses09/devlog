// Load saved logs from localStorage
function loadLogs() {
  const logs = JSON.parse(localStorage.getItem('devlogs')) || [];
  const container = document.getElementById('logs-container');
  container.innerHTML = '';

  if (logs.length === 0) {
    container.innerHTML = '<p style="color:#555">No logs yet. Start today!</p>';
    return;
  }

  // Show newest first
  [...logs].reverse().forEach(log => {
    const card = document.createElement('div');
    card.className = 'log-card';
    card.innerHTML = `
      <div class="tag"># ${log.topic}</div>
      <div class="text">${log.text}</div>
      <div class="date">${log.date}</div>
    `;
    container.appendChild(card);
  });
}

// Save a new log
function saveLog() {
  const topic = document.getElementById('topic').value.trim();
  const text = document.getElementById('log').value.trim();

  if (!topic || !text) {
    alert('Fill in both fields!');
    return;
  }

  const logs = JSON.parse(localStorage.getItem('devlogs')) || [];

  logs.push({
    topic,
    text,
    date: new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  });

  localStorage.setItem('devlogs', JSON.stringify(logs));

  // Clear inputs
  document.getElementById('topic').value = '';
  document.getElementById('log').value = '';

  loadLogs();
}

// Load on start
loadLogs();