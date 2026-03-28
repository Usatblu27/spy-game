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
const wordsFile = fs.readFileSync(path.join(__dirname, "words.txt"), "utf8");
WORDS = wordsFile
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);
let gameActive = false;
let players = [];
let currentWord = null;
let spyId = null;
let firstPlayerId = null;
function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}
function startGame() {
  if (gameActive) return;
  if (players.length < 2) return;
  gameActive = true;
  currentWord = getRandomWord();
  const spyIndex = Math.floor(Math.random() * players.length);
  spyId = players[spyIndex];
  players.forEach((playerId) => {
    const isSpy = playerId === spyId;
    io.to(playerId).emit("game_start", {
      isSpy: isSpy,
      word: isSpy ? null : currentWord,
    });
  });
}
function endGame() {
  if (!gameActive) return;
  gameActive = false;
  currentWord = null;
  spyId = null;
  io.emit("game_end");
}
io.on("connection", (socket) => {
  players.push(socket.id);
  if (players.length === 1) {
    firstPlayerId = socket.id;
    socket.emit("set_host", true);
  } else {
    socket.emit("set_host", false);
  }
  io.emit("players_count", players.length);
  socket.on("start_game", () => {
    if (socket.id === firstPlayerId && !gameActive) {
      startGame();
    }
  });
  socket.on("end_game", () => {
    if (socket.id === firstPlayerId) {
      endGame();
    }
  });
  socket.on("disconnect", () => {
    const index = players.indexOf(socket.id);
    if (index !== -1) {
      players.splice(index, 1);
    }
    if (socket.id === firstPlayerId && players.length > 0) {
      firstPlayerId = players[0];
      io.to(firstPlayerId).emit("set_host", true);
      players.forEach((playerId) => {
        if (playerId !== firstPlayerId) {
          io.to(playerId).emit("set_host", false);
        }
      });
    }
    io.emit("players_count", players.length);
    if (gameActive && players.length < 2) {
      endGame();
    }
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
