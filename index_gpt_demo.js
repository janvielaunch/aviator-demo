// server.js
const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 3000 });
const express = require('express');
const mongoose = require("mongoose")
const app = express();
const server = require("http").createServer(app)
const io  = require("socket.io")(server, { cors: { "origin": "*" } })
app.use(express.json())
app.set("view engine", "ejs")


app.get('/test-socket', (req, res) => {
    res.render('test'); // it will find home file from views folder as we are using ejs
});

let gameState = {
    players: {},
    round: 1,
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
  
    // Send current game state to new connection
    socket.emit('gameState', gameState);
  
    socket.on('action', (action) => {
      console.log('Received action:', action);
  
      // Update game state based on action
      gameState = updateGameState(gameState, action);
  
      // Broadcast updated state to all clients
      io.emit('gameState', gameState);
    });
  
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      delete gameState.players[socket.id];
      io.emit('gameState', gameState);
    });
  });
  
  function updateGameState(state, action) {
    // Example game logic: add or update a player
    if (action.type === 'update_player') {
      state.players[action.player.id] = action.player;
    } else if (action.type === 'next_round') {
      state.round += 1;
    }
    return state;
  }

console.log('WebSocket server started on ws://localhost:3000');


server.listen(3000, () => {
    console.log(`Example app listening at http://localhost:${3000}`);

    mongoose.connect("mongodb://localhost:27017/game-demo");
});