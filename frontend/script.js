const socket = io();
let currentView = "lobby";
let playerId = null;
let playerName = "";
const views = {
  lobby: () => `
                <div class="container">
                    <h1>🕵️ Шпион</h1>
                    <div class="player-info">
                        <div class="your-name">
                            <span class="label">Вы:</span>
                            <span class="name">${escapeHtml(playerName)}</span>
                        </div>
                    </div>
                    <div class="players-list">
                        <h3>В лобби (<span id="playerCount">0</span>)</h3>
                        <div id="playersContainer"></div>
                    </div>
                    <button id="startBtn" class="btn start-btn" disabled>Начать игру (нужно минимум 2 игрока)</button>
                    <div id="message" class="message"></div>
                </div>
            `,

  game: (data) => `
                <div class="container game-container">
                    <h1>🕵️ Шпион</h1>
                    <div class="role-card">
                        <div class="role-icon">${data.isSpy ? "🕵️‍♂️" : "🎭"}</div>
                        <div class="role-title">${data.isSpy ? "ВЫ ШПИОН!" : "Ваше слово"}</div>
                        ${!data.isSpy ? `<div class="word-display">${escapeHtml(data.word)}</div>` : '<div class="word-display">???</div>'}
                        <div class="role-hint">
                            ${data.isSpy ? "Слушайте внимательно и попытайтесь угадать слово" : "Обсуждайте слово, не называя его напрямую"}
                        </div>
                    </div>
                    <button id="endGameBtn" class="btn end-btn">Завершить игру</button>
                </div>
            `,
};

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

function renderLobby(players) {
  const playersContainer = document.getElementById("playersContainer");
  const playerCountSpan = document.getElementById("playerCount");
  const startBtn = document.getElementById("startBtn");

  if (playersContainer) {
    playersContainer.innerHTML = players
      .map(
        (p) => `
                    <div class="player-card ${p.id === playerId ? "current-player" : ""}">
                        <span class="player-name">${escapeHtml(p.name)}</span>
                        ${p.id === playerId ? '<span class="badge">Вы</span>' : ""}
                    </div>
                `,
      )
      .join("");
  }

  if (playerCountSpan) {
    playerCountSpan.textContent = players.length;
  }

  if (startBtn) {
    startBtn.disabled = players.length < 3;
    if (players.length < 3) {
      startBtn.textContent = "Начать игру (нужно минимум 3 игрока)";
    } else {
      startBtn.textContent = "Начать игру";
    }
  }
}

function showMessage(text, isError = false) {
  const msgDiv = document.getElementById("message");
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `message ${isError ? "error" : "info"}`;
    setTimeout(() => {
      if (msgDiv.textContent === text) {
        msgDiv.textContent = "";
        msgDiv.className = "message";
      }
    }, 3000);
  }
}

function switchView(view, data = null) {
  currentView = view;
  const app = document.getElementById("app");

  if (view === "lobby") {
    app.innerHTML = views.lobby();
    if (window.currentPlayers) {
      renderLobby(window.currentPlayers);
    }

    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.onclick = () => {
        socket.emit("request_start");
      };
    }
  } else if (view === "game" && data) {
    app.innerHTML = views.game(data);

    const endGameBtn = document.getElementById("endGameBtn");
    if (endGameBtn) {
      endGameBtn.onclick = () => {
        socket.emit("request_end");
      };
    }
  }
}

socket.on("player_init", (data) => {
  playerId = data.id;
  playerName = data.name;

  if (data.gameActive) {
    showMessage("Игра уже идет, ожидайте следующего раунда", false);
    switchView("lobby");
  } else {
    switchView("lobby");
  }
});

socket.on("players_update", (players) => {
  window.currentPlayers = players;
  if (currentView === "lobby") {
    renderLobby(players);
  }
});

socket.on("game_start", (data) => {
  switchView("game", {
    isSpy: data.isSpy,
    word: data.word,
  });
});

socket.on("game_end", () => {
  if (currentView === "game") {
    showMessage("Игра завершена! Возврат в лобби...");
    setTimeout(() => {
      switchView("lobby");
      if (window.currentPlayers) {
        renderLobby(window.currentPlayers);
      }
    }, 1500);
  }
});

socket.on("game_already_active", () => {
  if (currentView === "lobby") {
    showMessage(
      "Игра уже идет, вы сможете присоединиться в следующем раунде",
      true,
    );
    const startBtn = document.getElementById("startBtn");
    if (startBtn) startBtn.disabled = true;
  }
});

socket.on("game_state_change", (data) => {
  if (!data.active && currentView === "game") {
    switchView("lobby");
    if (window.currentPlayers) {
      renderLobby(window.currentPlayers);
    }
  }
});

socket.on("connect_error", (error) => {
  console.error("Ошибка подключения:", error);
  showMessage("Ошибка подключения к серверу", true);
});
