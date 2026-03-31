const socket = io();
let isHost = false;
let inGame = false;
let isCardFlipped = false;
let myRole = null;
function renderLobby(playersCount) {
  return `<h1>🕵️ Шпион</h1>
          <div class="players-info">
            <div class="players-count">
              Игроков: <span class="count-number">${playersCount}</span>
              ${!isHost ? `<div class="hint">Ожидайте старта</div>` : ""}
            </div>
          </div>
        ${
          isHost
            ? `<button class="button primary" id="startbutton">Начать игру</button>`
            : ""
        }`;
}
function renderGame() {
  const isSpy = myRole && myRole.isSpy;
  const word = myRole && myRole.word;
  return `<h1>🕵️ Миссия</h1>
          <div class="card ${isCardFlipped ? "flipped" : ""}" id="spyCard">
            <div class="card-front">
            </div>
            <div class="card-back">
              ${
                !isSpy
                  ? `<div class="card-word">${escapeHtml(word)}</div>`
                  : `<div class="spy-badge">Вы шпион</div>
                    <div class="spy-mission">Угадайте слово по описанию</div>`
              }
            </div>
          </div>
        ${
          isHost
            ? `<button class="button danger" id="endGamebutton">Завершить миссию</button>`
            : ""
        }
      `;
}
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}
function updateUI() {
  const app = document.getElementById("app");
  if (!inGame) {
    app.innerHTML = renderLobby(window.currentPlayersCount || 0);
    if (isHost) {
      const startbutton = document.getElementById("startbutton");
      if (startbutton) {
        startbutton.onclick = () => {
          socket.emit("start_game");
        };
      }
    }
  } else {
    app.innerHTML = renderGame();
    const card = document.getElementById("spyCard");
    if (card) {
      card.onclick = () => {
        isCardFlipped = !isCardFlipped;
        if (isCardFlipped) {
          card.classList.add("flipped");
        } else {
          card.classList.remove("flipped");
        }
      };
    }
    const endGamebutton = document.getElementById("endGamebutton");
    if (endGamebutton) {
      endGamebutton.onclick = () => {
        socket.emit("end_game");
      };
    }
  }
}
socket.on("set_host", (host) => {
  isHost = host;
  updateUI();
});
socket.on("players_count", (count) => {
  window.currentPlayersCount = count;
  if (!inGame) {
    updateUI();
  }
});
socket.on("game_start", (data) => {
  inGame = true;
  isCardFlipped = false;
  myRole = data;
  updateUI();
});
socket.on("game_end", () => {
  inGame = false;
  myRole = null;
  isCardFlipped = false;
  updateUI();
});
socket.on("connect", () => {
  console.log("Подключено к серверу");
});
