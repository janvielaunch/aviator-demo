const express = require('express');
const mongoose = require("mongoose")
const app = express();
const server = require("http").createServer(app)
const io = require("socket.io")(server, { cors: { "origin": "*" } })
const port = 3000;

const BetController = require("../game-demo/user/controllers/BetController");
const { randomUUID } = require('crypto');
const { timeStamp } = require('console');

app.use(express.json())
app.set("view engine", "ejs")


app.get('/aviator-socket', (req, res) => {
  res.render('aviator3'); // it will find home file from views folder as we are using ejs
});


// -------------------------------------------------- socket -------------------------------------------------

let currentRoundId = null; // Track current round ID
let gameTimer = 0; // Initialize game timer
let gameIntervalId = null; // Interval ID for game timer

// Shared state for user balances (example, you might use a database for production)
const users = {};

// Socket.IO event handlers
io.on("connect", (socket) => {
  console.log("User connected: " + socket.id);
  const user = Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;

  ///send win amount in cashout and final balance to connected useer ,,, and send lose amount and final balance in end of all users

  // if (Object.keys(users).length == 0) {
  //   console.log('firs emit');
  //   socket.emit('first');
  // }

  socket.on('user_connected', ({  userBalance }) => {
    // Store user in the object
    users[socket.id] = {
      user
    };

    // Emit initial state to the connected client
    socket.emit('initial_state', {
      user: user,
      balance: userBalance,
      roundId: currentRoundId,
      gameTimer,
    });
  });

  socket.on("round_start", async (data) => {
    if (currentRoundId) {
      // Already a round in progress, handle accordingly
      return;
    }
    currentRoundId = randomUUID();
    data.roundId = currentRoundId;
    data.startTime = new Date();
    BetController.createRound(data);
    data.roundId = true;

    io.emit("round_started", { roundId: currentRoundId });
    // startListeningToUpdateGameTimer();

    gameTimer = Date.parse(data.startTime);
    // gameTimer = Math.floor(Date.now() / 1000);
    // gameIntervalId = setInterval(() => {
    //   gameTimer += 0.1;
      io.emit("update_game_timer", gameTimer);
    // }, 100);

    // setTimeout(()=>{
    //   console.log('ended called')
    //   io.emit("round_ended");

    // },3000)

  });

  // function startListeningToUpdateGameTimer() {
  //   socket.on('update_game_timer', () => { });
  // }

  socket.on("round_end", async (data) => {
    if (!currentRoundId) {
      // No round in progress, handle accordingly
      return;
    }

    const gameData = { roundId: currentRoundId, result: gameTimer, gameId: data.gameId };
    BetController.endRound(gameData);
    currentRoundId = null;

  

    io.emit("round_ended");
    // clearInterval(gameIntervalId);
    gameTimer = 0;
    // io.emit("update_balances", users);

  });

  socket.on("bet", async (data) => {
    data.status = 'Pending';
    BetController.createRoundBet(data);
    socket.emit("bet", data);
  });

  socket.on("cancel_bet", async (data) => {
    data.roundId = currentRoundId;
    data.balance = users[socket.id]['balance']
    BetController.cancelBet(data);
    socket.emit("cancel_bet", data);

  });

  socket.on("cash_out", async (data) => {
    data.roundId = currentRoundId;
    data.status = 'End';
    const response = await BetController.cashout(data);
    if (response) {
      users[socket.id]['balance'] = response.balance;
      data.balance = response.balance
      data.endGame = response.endGame

     }
    socket.emit("cash_out", data);
    socket.off('update_game_timer', () => { });

  });


  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
    delete users[socket.id];
    // Clean up if necessary
  });
});

// -------------------------------------------------- server -------------------------------------------------

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);

  mongoose.connect("mongodb://localhost:27017/game-demo");
});