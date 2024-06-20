const mongoose = require("mongoose");

const gameRoundSchema = new mongoose.Schema({
    roundId: {
        type: String,
        required: true,
        unique: true,
    },
    gameId: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        required: false,
        default: null
    },
    endTime: {
        type: Date,
        required: false,
        default: null
    },
    result: {
        type: Number,
        required: false,
        default: null
    },
    totalUsers: {
        type: Number,
        required: false,
        default: null
    },
    totalCashoutUsers: {
        type: Number,
        required: false,
        default: null
    },
    totalBet: {
        type: Number,
        required: false,
        default: null
    },
    totalCashOut: {
        type: Number,
        required: false,
        default: null
    },
    status: {
        type: Number,
        // default: 0,  //[0='Pending',1='Start',2='End']       
        required: true,
    },
})

module.exports = mongoose.model('gameRound', gameRoundSchema)