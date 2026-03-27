const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("../frontend"));

let WORDS = [];

function loadWords() {
  try {
    const wordsFile = fs.readFileSync(
      path.join(__dirname, "words.txt"),
      "utf8",
    );
    WORDS = wordsFile
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log(`Загружено слов: ${WORDS.length}`);
    if (WORDS.length === 0) {
      console.warn("Внимание: словарь пуст! Добавьте слова в words.txt");
    }
  } catch (error) {
    console.error("Ошибка загрузки words.txt:", error);
    WORDS = [];
  }
}
loadWords();

fs.watchFile(path.join(__dirname, "words.txt"), (curr, prev) => {
  console.log("words.txt изменен, перезагружаю...");
  loadWords();
});

let gameState = {
  active: false,
  players: new Map(),
  currentWord: null,
  spyId: null,
};

function generatePlayerName() {
  const adjectives = [
    "Хитрый",
    "Смелый",
    "Быстрый",
    "Мощный",
    "Тихий",
    "Мудрый",
    "Ловкий",
    "Деловой",
    "Скрытный",
    "Находчивый",
  ];
  const nouns = [
    "Лис",
    "Волк",
    "Сокол",
    "Барс",
    "Орел",
    "Кот",
    "Ястреб",
    "Тигр",
    "Голубь",
    "Барашек",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${noun} ${num}`;
}
function getRandomWord() {
  if (WORDS.length === 0) {
    return "слово (добавьте слова в words.txt)";
  }
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function startGame() {
  if (gameState.active) return;
  const players = Array.from(gameState.players.values());
  if (players.length < 2) return;

  gameState.active = true;
  gameState.currentWord = getRandomWord();

  if (!gameState.currentWord) {
    console.error("Не удалось получить слово");
    gameState.active = false;
    return;
  }

  const spyIndex = Math.floor(Math.random() * players.length);
  gameState.spyId = players[spyIndex].id;

  console.log(
    `Игра началась! Слово: ${gameState.currentWord}, Шпион: ${gameState.spyId}`,
  );

  gameState.players.forEach((player, id) => {
    const isSpy = id === gameState.spyId;
    io.to(id).emit("game_start", {
      isSpy,
      word: isSpy ? null : gameState.currentWord,
    });
  });

  io.emit("game_state_change", { active: true });
}

function endGame() {
  if (!gameState.active) return;

  gameState.active = false;
  gameState.currentWord = null;
  gameState.spyId = null;

  io.emit("game_end");
  io.emit("game_state_change", {
    active: false,
    players: Array.from(gameState.players.values()),
  });
}

io.on("connection", (socket) => {
  console.log("Новый игрок подключился:", socket.id);

  const playerName = generatePlayerName();
  const player = { id: socket.id, name: playerName };
  gameState.players.set(socket.id, player);

  socket.emit("player_init", {
    id: socket.id,
    name: playerName,
    gameActive: gameState.active,
  });

  io.emit("players_update", Array.from(gameState.players.values()));

  if (gameState.active) {
    socket.emit("game_already_active");
  }

  socket.on("request_start", () => {
    if (!gameState.active) {
      startGame();
    }
  });

  socket.on("request_end", () => {
    if (gameState.active) {
      endGame();
    }
  });

  socket.on("disconnect", () => {
    console.log("Игрок отключился:", socket.id);
    gameState.players.delete(socket.id);

    if (gameState.active && gameState.players.size < 2) {
      endGame();
    }

    io.emit("players_update", Array.from(gameState.players.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Словарь содержит ${WORDS.length} слов`);
});
