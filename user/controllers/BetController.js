const GameRound = require("../models/gameRoundModel")
const NewBet = require("../models/newBetModel")
const Bet = require('../models/betModel')
const Game = require('../models/gameModel')

const createBet = async (data) => {

    let bet = await Bet.findOne({ $and: [{ playToken: data?.playToken }, { user: data?.user }, { gameId: data?.gameId }] })
    if (bet) {
        bet.playToken = bet?.playToken
        bet.status = data?.status
        bet.isWin = data?.isWin ?? false
        bet.winAmount = data?.isWin && data?.isWin == true ? data?.winAmount : 0
        bet.finalBalance = data?.isWin && data?.isWin == true ? Number(bet.finalBalance) + Number(data?.winAmount) : bet?.finalBalance
        bet.endTime = new Date()

    } else {
        bet = new Bet()
        bet.gameId = data?.gameId
        bet.user = data?.user
        bet.currency = data?.currency
        bet.balance = data?.balance
        bet.betAmount = data?.betAmount
        bet.finalBalance = Number(data?.balance) - Number(data?.betAmount)
        bet.status = data?.status
        bet.playToken = data?.playToken
        bet.startTime = new Date()
    }

    await bet.save()

}

const createRoundBet = async (data) => {
    const bet = new NewBet()
    bet.gameId = data?.gameId
    bet.roundId = null
    bet.user = data?.user
    bet.currency = data?.currency
    bet.balance = data?.balance
    bet.betAmount = data?.betAmount
    bet.finalBalance = Number(data?.balance)
    bet.status = data?.status
    bet.betTime = new Date()
    await bet.save()
}

const cashout = async (data) => {
    const user = data?.user;
    const roundId = data?.roundId;
    const cashOut = data?.cashout;

    const game_ = await Game.findOne({ _id: data.gameId });

    const bet = await NewBet.findOne({ user: user, roundId: roundId, status: 1 });

    if (bet) {
        bet.cashOut = cashOut;
        bet.finalBalance = Number(cashOut) + Number(bet.finalBalance)
        bet.endTime = new Date();
        bet.status = data.status

        await bet.save();

        const round = await GameRound.findOne({ roundId: roundId })
        round.totalCashOut = Number(round.totalCashOut ?? 0) + Number(cashOut)
        round.totalCashoutUsers = Number(round.totalCashoutUsers ?? 0) + 1
        await round.save();

        const outUsers = (round.totalCashoutUsers / round.totalUsers) * 100

        if (Number(outUsers).toFixed(2) >= Number(game_.userPercentage)) {
            return { balance: bet.finalBalance, 'endGame': true }
        }

        return { balance: bet.finalBalance }
    }


    return false;
}


const cancelBet = async (data) => {

    await NewBet.findOneAndUpdate({ user: data.user, status: 0 }, { $set: { cancelTime: new Date, hasCancelled: true, status: 3 } });

}

const createRound = async (data) => {

   const currentRound =  await GameRound.updateOne({ status: 0 }, { $set: { status: 1, startTime: data.startTime, roundId : data.roundId, gameId : data.gameId } }, { upsert: true })

    const batchSize = 100;  // Adjust batch size based on your memory and performance requirements
    let bulkOps = [];
    let counter = 0;
    let playersId = [];

    const cursor = NewBet.find({ status: 0, gameId: data?.gameId })
    for await (const bet of cursor) {

        bulkOps.push({
            updateOne: {
                filter: { _id: bet._id },
                update: {
                    $set: {
                        status: 1,
                        roundId: data.roundId,
                        finalBalance: bet.balance - bet.betAmount
                    }
                }
            }
        })

        playersId.push(bet._id);
        counter++;

        if (counter % batchSize === 0) {
            NewBet.bulkWrite(bulkOps);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await NewBet.bulkWrite(bulkOps);
    }

    const betData = await NewBet.aggregate([
        {
            $match: {
                '_id': { $in: playersId }
            }
        },
        {
            $group: {
                _id: null,
                totalBetAmount: { $sum: '$betAmount' },
                totalUsers: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' } // assuming 'userId' is the unique identifier
            }
        },
        {
            $project: {
                totalBetAmount: 1,
                totalUsers: 1,
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        }
    ]);
    const result = betData.length > 0 ? betData[0] : { totalBetAmount: 0, totalUsers: 0, uniqueUserCount: 0 };

    await GameRound.updateOne(
        { roundId: data.roundId },
        {
            $set: {
                totalUsers: result.uniqueUserCount,
                totalBet: result.totalBetAmount
            }
        }
    );

    const round = new GameRound();
    round.gameId = data?.gameId
    round.roundId = data?.futureRoundId
    round.status = 0
    round.startTime = null
    await round.save();
}

const endRound = async (data) => {

    const endTime = new Date();

    await GameRound.findOneAndUpdate({ status: 1, roundId: data.roundId }, { $set: { status: 2, endTime: endTime, result: data.result.toFixed(2) } });

    const batchSize = 100;  // Adjust batch size based on your memory and performance requirements
    let bulkOps = [];
    let counter = 0;
    // const updatedBetIds = [];  // Store the ids of updated bets

    const cursor = await NewBet.find({ status: 1, gameId: data?.gameId, roundId: data.roundId })
    for await (const bet of cursor) {

        bulkOps.push({
            updateOne: {
                filter: { _id: bet._id },
                update: {
                    $set: {
                        status: 2,
                        endTime: endTime
                    }
                }
            }
        })
        counter++;
        // updatedBetIds.push(bet._id);
        if (counter % batchSize === 0) {
            NewBet.bulkWrite(bulkOps);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await NewBet.bulkWrite(bulkOps);
    }

    // const updatedBets = await NewBet.find({ _id: { $in: updatedBetIds } }, { user: 1, finalBalance: 1 });

    // const result = await NewBet.find({ roundId: data.roundId });
    // return updatedBets;
}

module.exports = {
    createBet,
    createRoundBet,
    cashout,
    cancelBet,
    createRound,
    endRound
}