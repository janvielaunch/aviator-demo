const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true, // Ensure gameId is unique
    },
    gameName: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    maxBet: {
        type: Number,
        required: false,
    },
    minBet: {
        type: Number,
        required: false,
    },
    status: {
        type: Boolean,
        required: false,
        default : true
    },
})

gameSchema.index({ gameId: 1 }, { unique: true });

module.exports = mongoose.model('game', gameSchema)