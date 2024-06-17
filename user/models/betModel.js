const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
    playToken: {
        type: String,
        required: true,
    },
    gameId: {
        type: String,
        required: true,
    },
    user: {
        type: String,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    balance: {
        type: Number,
        required: true,
    },
    betAmount: {
        type: Number,
        required: true,
    },
    isWin: {
        type: Boolean,
        required: false,
        default: false
    },
    winAmount: {
        type: Number,
        required: false,
        default: 0
    },
    finalBalance: {
        type: Number,
        required: false,
    },
    status: {
        type: String,
        enum: ['Play', 'End'],
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
        default : null
    }
})

module.exports = mongoose.model('bet', betSchema)