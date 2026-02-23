document.addEventListener('DOMContentLoaded', () => {
  const editableTexts = document.querySelectorAll('.editable');
  editableTexts.forEach((el, index) => {
    if (!el.id) el.id = 'bracket-slot-' + index;
    const savedText = localStorage.getItem('volei_bracket_' + el.id);
    if (savedText) {
      el.textContent = savedText;
    }
  });

  loadLeaderboard();
});

function editSlot(element) {
  const currentText = element.textContent;
  const newText = prompt("Editar nome na chave (vazio para limpar):", currentText);
  if (newText !== null) {
    const finalText = newText.trim() === '' ? currentText : newText.trim();
    element.textContent = finalText;
    localStorage.setItem('volei_bracket_' + element.id, finalText);
  }
}

let teamsData = [];

function loadLeaderboard() {
  const saved = localStorage.getItem('volei_teams');
  if (saved) {
    teamsData = JSON.parse(saved);
  } else {
    teamsData = [
      { id: 1, name: 'Time 1', wins: 0 },
      { id: 2, name: 'Time 2', wins: 0 },
      { id: 3, name: 'Time 3', wins: 0 },
      { id: 4, name: 'Time 4', wins: 0 },
      { id: 5, name: 'Time 5', wins: 0 }
    ];
    saveLeaderboard();
  }
  renderLeaderboard();
}

function saveLeaderboard() {
  localStorage.setItem('volei_teams', JSON.stringify(teamsData));
}

function renderLeaderboard() {
  const list = document.getElementById('teams-list');
  list.innerHTML = '';
  
  teamsData.forEach((team) => {
    const row = document.createElement('div');
    row.className = 'team-row';
    
    row.innerHTML = `
      <input type="text" class="team-name-input" value="${team.name}" onchange="updateTeamName(${team.id}, this.value)" placeholder="Nome do time">
      <div class="win-controls">
        <button class="win-btn minus" onclick="updateWins(${team.id}, -1)">-</button>
        <span class="win-count">${team.wins}</span>
        <button class="win-btn" onclick="updateWins(${team.id}, 1)">+</button>
        <button class="delete-btn" onclick="deleteTeam(${team.id})" title="Remover time">🗑️</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function updateTeamName(id, newName) {
  const team = teamsData.find(t => t.id === id);
  if (team) {
    team.name = newName;
    saveLeaderboard();
  }
}

function updateWins(id, change) {
  const team = teamsData.find(t => t.id === id);
  if (team) {
    team.wins += change;
    if (team.wins < 0) team.wins = 0;
    saveLeaderboard();
    renderLeaderboard();
  }
}

function addTeam() {
  teamsData.push({
    id: Date.now(),
    name: 'Novo Time',
    wins: 0
  });
  saveLeaderboard();
  renderLeaderboard();
}

function deleteTeam(id) {
  if(confirm('Tem certeza que deseja remover este time?')) {
    teamsData = teamsData.filter(t => t.id !== id);
    saveLeaderboard();
    renderLeaderboard();
  }
}