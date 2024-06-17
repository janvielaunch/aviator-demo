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
  res.render('aviator2'); // it will find home file from views folder as we are using ejs
});


// -------------------------------------------------- socket -------------------------------------------------

let currentRoundId = null; // Track current round ID
let gameTimer = 0.1; // Initialize game timer
let gameIntervalId = null; // Interval ID for game timer

// Shared state for user balances (example, you might use a database for production)
const users = {};

// Socket.IO event handlers
io.on("connect", (socket) => {
  console.log("User connected: " + socket.id);

  ///send win amount in cashout and final balance to connected useer ,,, and send lose amount and final balance in end of all users

  if(Object.keys(users).length == 0){
    console.log('firs emit');
    socket.emit('first');
  }

  socket.on('user_connected', ({ user, userBalance }) => {
    // Store user in the object
    users[socket.id] = {
      user,
      balance: userBalance
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
    data.balance = users[socket.id]['balance']
    data.roundId = currentRoundId;
    BetController.createRound(data);
    data.roundId = true;

    // Broadcast updated round ID and balances to all clients
    io.emit("round_started", { roundId: currentRoundId });
    // io.emit("update_balances", users[socket.id]);

    // Start game timer interval
    gameIntervalId = setInterval(() => {
      gameTimer += 0.1;
      io.emit("update_game_timer", gameTimer);
    }, 100);

  });

  socket.on("round_end", async () => {
    console.log("end got");
    if (!currentRoundId) {
      // No round in progress, handle accordingly
      return;
    }
    const data = { roundId: currentRoundId, result: gameTimer };
    BetController.endRound(data);
    currentRoundId = null;
    // Broadcast round end to all clients
    io.emit("round_ended");
    // Clear intervals
    clearInterval(gameIntervalId);
    gameTimer = 0.1;
  });

  socket.on("bet", async (data) => {
    data.status = 'Pending';
    data.balance = users[socket.id]['balance']
    BetController.createRoundBet(data);
    socket.emit("bet", data);
    // io.emit("update_balances", users[socket.id]);
  });

  socket.on("cancel_bet", async (data) => {
    data.roundId = currentRoundId;
    data.balance = users[socket.id]['balance']
    BetController.cancelBet(data);
    socket.emit("cancel_bet", data);
    // Broadcast updated balances to all clients
    // io.emit("update_balances", users);
  });

  socket.on("cash_out", async (data) => {
    data.roundId = currentRoundId;
    data.status = 'End';
    data.balance = users[socket.id]['balance']
    data.cashout = multiplyer.toFixed(2)
    BetController.cashout(data);
    users[socket.id]['balance'] = (Number(data.betAmount) * Number(data.cashout)) + Number(users[socket.id]['balance']);

    socket.emit("cash_out", data);
    // Broadcast updated balances to all clients
    // io.emit("update_balances", users[socket.id]);
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