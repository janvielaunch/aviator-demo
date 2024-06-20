const express = require('express');
const mongoose = require("mongoose")
const app = express();
const server = require("http").createServer(app)
const io = require("socket.io")(server, { cors: { "origin": "*" } })
const port = 3000;

const BetController = require("../game-demo/user/controllers/BetController");
const { randomUUID } = require('crypto');

app.use(express.json())
app.set("view engine", "ejs")


app.get('/aviator-socket', (req, res) => {
  res.render('aviator4'); // it will find home file from views folder as we are using ejs
});


// -------------------------------------------------- socket -------------------------------------------------


let currentRoundId = null;
let futureRoundId = randomUUID();
let isCurrentRoundPlaying = true;
const gameId = '6666f1bd704df0066adfc878';
let endTime;
let startTime;

const users = {};

function roundStart() {

  console.log('started function')
  let data = {};
  currentRoundId = futureRoundId;
  futureRoundId = randomUUID();
  data.roundId = currentRoundId;
  data.futureRoundId = futureRoundId;
  data.gameId = gameId
  data.startTime = new Date();
  BetController.createRound(data);
  data.round = true;

  startTime = Date.parse(data.startTime)
  endTime = Date.parse(data.startTime) + 60000;

  isCurrentRoundPlaying = true;

  io.to(currentRoundId).emit("round_started", { roundId: data.round, startTime, endTime });

  const myTimeout = setTimeout(() => {
    roundEnd();
    clearTimeout(myTimeout)
  }, 60000)
}

function roundEnd() {

  console.log('ended function')

  if (!currentRoundId) {
    // No round in progress, handle accordingly
    return;
  }
  isCurrentRoundPlaying = false;
  endTime = 0;
  const gameData = { roundId: currentRoundId, result: 0, gameId: gameId };
  BetController.endRound(gameData);
  
  io.to(currentRoundId).emit("round_ended");

  //move all connected user to future round room
  const clients = io.sockets.adapter.rooms.get(currentRoundId);
  if (clients) {
      for (const clientId of clients) {
          const socket = io.sockets.sockets.get(clientId);
          if (socket) {
              socket.leave(currentRoundId);
              socket.join(futureRoundId);
          }
      }
  }  
  currentRoundId = null;
  const myTimeout = setTimeout(() => {
    roundStart();
    clearTimeout(myTimeout)
  }, 1000)

}

// Socket.IO event handlers
io.on("connect", (socket) => {
  console.log("User connected: " + socket.id);
  const user = Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;

  if (Object.keys(users).length == 0) {
    console.log('first emit');
    socket.emit('first');
  }

  if (isCurrentRoundPlaying) {
    socket.join(futureRoundId);
  } else if (!isCurrentRoundPlaying) {
    socket.join(currentRoundId);
  }

  socket.on('user_connected', ({ userBalance }) => {
    users[socket.id] = {
      user
    };

    // Emit initial state to the connected client
    socket.emit('initial_state', {
      user: user,
      balance: userBalance,
      roundId: true,
      startTime,
      endTime
    });
  });

  socket.on("first", async () => {
    if (currentRoundId) {
      // Already a round in progress, handle accordingly
      return;
    }
    roundStart();
  });

  socket.on("bet", async (data, callback) => {
    data.status = 0;
    data.gameId = gameId
    BetController.createRoundBet(data);
    callback(data);
  });

  socket.on("cancel_bet", async (data, callback) => {
    data.gameId = gameId
    data.roundId = currentRoundId;
    data.balance = users[socket.id]['balance']
    BetController.cancelBet(data);
    callback(data);
  });

  socket.on("cash_out", async (data, callback) => {
    data.roundId = currentRoundId;
    data.gameId = gameId
    data.status = 2;
    const response = await BetController.cashout(data);
    if (response) {
      users[socket.id]['balance'] = response.balance;
      data.balance = response.balance
    }
    callback(data);

    if (response.endGame && response.endGame == true) {
      roundEnd();
    }

  });


  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
    delete users[socket.id];
  });
});

// -------------------------------------------------- server -------------------------------------------------

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);

  mongoose.connect("mongodb://localhost:27017/game-demo");
});