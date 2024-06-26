const mongoose = require("mongoose");

const newBetSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
    },
    roundId: {
        type: String,
        required: false,
        default : ''
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
    betType: {
        type: String,
        enum: ['Auto', 'Manual'],
        default: "Auto",
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
    cashOut: {
        type: Number,
        required: false,
        default: 0
    },
    finalBalance: {
        type: Number,
        required: false,
    },
    status: {
        type: Number, //[0='Pending',1='Playing',2='End',3='Cancelled'],
        default : 0,
        required: true,
    },
    betTime: {
        type: Date,
        required: false,
        default: null
    },
    endTime: {
        type: Date,
        required: false,
        default: null
    },
    cancelTime: {
        type: Date,
        required: false,
        default: null
    },
    hasCancelled: {
        type: Boolean,
        required: false,
        default: false
    }
})

module.exports = mongoose.model('newBet', newBetSchema)