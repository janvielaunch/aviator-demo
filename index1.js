const express = require('express');
const mongoose = require("mongoose")
const app = express();
const path = require('path');
const server = require("http").createServer(app)
const io = require("socket.io")(server, { cors: { "origin": "*" } })
const port = 3000;
var multer = require("multer")

const BetController = require("../game-demo/user/controllers/BetController");
const UserReportsController = require("../game-demo/user/controllers/UserReportController")
const GameController = require("../game-demo/user/controllers/GameController")
const validationMiddleware = require('../game-demo/user/validation-middleware')
const { randomUUID } = require('crypto');

app.use(express.json())

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const image = multer({
  storage: storage,
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
      return cb('Please upload a valid image file')
    }
    cb(undefined, true)
  }
}).single('image')


app.set("view engine", "ejs")

app.get('/home-socket', (req, res) => {
  res.render('home'); // it will find home file from views folder as we are using ejs
});

app.get('/game-socket', (req, res) => {
  res.render('game'); // it will find home file from views folder as we are using ejs
});

app.get('/aviator-socket', (req, res) => {
  res.render('aviator'); // it will find home file from views folder as we are using ejs
});


app.post('/games', validationMiddleware.gameValidate, async (req, res) => {
  await GameController.store(req, res)
})

app.get('/games', async (req, res) => {
  await GameController.list(req, res)
})

app.get('/games/:id', async (req, res) => {
  await GameController.show(req, res)
})

app.patch('/games/:id', async (req, res) => {
  await GameController.update(req, res)
})

app.delete('/games/:id', async (req, res) => {
  await GameController.destroy(req, res)
})

app.patch('/games/:id/status', async (req, res) => {
  await GameController.status(req, res)
})

app.get('/reports-user', (req, res) => {
  UserReportsController.userReports(req, res);
});

app.get('/reports-game', (req, res) => {
  UserReportsController.gameReports(req, res);
});

app.post('/image', image, (req, res) => {
  if (!req.file) {
    res.status(501).send({ "error": "Please upload image" })
  }
  res.send({ message: 'File uploaded successfully', file: req.file.filename }).json();
})

// -------------------------------------------------- socket -------------------------------------------------

io.on("connect", (socket) => {
  console.log("User connected: " + socket.id)

  socket.on("message", (data) => {
    console.log(data)

    socket.broadcast.emit("message", data) // when we broadcast it sends message to everyone  other then ourselve in this connection

  }) //receives message

  socket.on("game_play", async (data) => {
    const { gameId, user, balance, betAmount, currency } = data;
    data.status = 'Play';
    data.playToken = randomUUID();

    BetController.createBet(data);

    const final_balance = data?.balance - data?.betAmount;

    const gameData = {
      gameId: gameId,
      user: user,
      balance: final_balance,
      currency: currency,
      betAmount: betAmount,
      playToken: data.playToken,
    }

    socket.emit("game_play", gameData)

  })
  socket.on("game_end", async (data) => {
    const { gameId, user, balance, betAmount, currency, isWin, winAmount, playToken } = data;
    data.status = 'End';

    BetController.createBet(data);

    const final_balance = isWin && isWin == true ? (balance + winAmount) : balance;

    const gameData = {
      playToken: playToken,
      gameId: gameId,
      user: user,
      balance: final_balance,
      currency: currency,
      betAmount: betAmount,
      isWin: isWin,
      winAmount: winAmount,
    }

    socket.emit("game_end", gameData)

  })

  let currentRoundId = '';

  socket.on("bet", async (data) => {

    data.status = 'Pending';

    BetController.createRoundBet(data);

    socket.emit("bet", data)

  })

  socket.on("cancel_bet", async (data) => {

    data.roundId = currentRoundId;

    BetController.cancelBet(data);

    socket.emit("cancel_bet", data)

  })

  socket.on("cash_out", async (data) => {
    data.roundId = currentRoundId;
    data.status = 'End';

    BetController.cashout(data);

    data.balance = (Number(data.betAmount) * Number(data.cashout)) + Number(data.balance)
    socket.emit("cash_out", data)

  })

  socket.on("round_start", async (data) => {

    currentRoundId = randomUUID();
    data.roundId = currentRoundId;

    BetController.createRound(data);
    data.roundId = true;
    data.balance = Number(data.balance) - Number(data.betAmount)
    socket.emit("round_start", data)

  })

  socket.on("round_end", async (data) => {

    data.roundId = currentRoundId;
    BetController.endRound(data)
    currentRoundId = '';

    //update round result here and status of round, endtime
    // deduct bet here

    socket.emit("round_end")
  })

})

// -------------------------------------------------- server -------------------------------------------------

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);

  mongoose.connect("mongodb://localhost:27017/game-demo");
});