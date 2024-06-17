const gameRound = require("../models/gameRoundModel")
const newBet = require("../models/newBetModel")

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
    const bet = new newBet()
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

    const bet = await newBet.findOne({ user: user, roundId: roundId, status: 'Playing' });

    if (bet) {
        bet.cashOut = cashOut;
        bet.finalBalance = Number(cashOut) + Number(bet.finalBalance)
        bet.endTime = new Date();
        bet.status = data.status

        await bet.save();
        
        const round =  await gameRound.findOne({roundId : roundId})
        round.totalCashOut = Number(round.totalCashOut ?? 0) + Number(cashOut)
        await round.save();

        return { balance: bet.finalBalance }
    }

    
    return false;
}

const cancelBet = async (data) => {

    await newBet.findOneAndUpdate({ user: data.user, status: "Pending" }, { $set: { cancelTime: new Date, hasCancelled: true, status: "Cancelled" } });

}

const createRound = async (data) => {

    const round = new gameRound();
    round.gameId = data?.gameId
    round.roundId = data?.roundId
    round.startTime = new Date();
    await round.save();

    const batchSize = 100;  // Adjust batch size based on your memory and performance requirements
    let bulkOps = [];
    let counter = 0;
    let playersId = [];

    const cursor = newBet.find({ status: "Pending", gameId: data?.gameId })
    for await (const bet of cursor) {

        bulkOps.push({
            updateOne: {
                filter: { _id: bet._id },
                update: {
                    $set: {
                        status: "Playing",
                        roundId: round.roundId,
                        finalBalance: bet.balance - bet.betAmount
                    }
                }
            }
        })

        playersId.push(bet._id);
        counter++;

        if (counter % batchSize === 0) {
            newBet.bulkWrite(bulkOps);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await newBet.bulkWrite(bulkOps);
    }

    const betData = await newBet.aggregate([
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

    await gameRound.updateOne(
      { _id: round._id }, 
      { 
        $set: { 
          totalUsers: result.uniqueUserCount, 
          totalBet: result.totalBetAmount 
        } 
      }
    );
}

const endRound = async (data) => {

    const endTime = new Date();

    await gameRound.findOneAndUpdate({ status: "Start", roundId: data.roundId }, { $set: { status: "End", endTime: endTime, result: data.result.toFixed(2) } });

    const batchSize = 100;  // Adjust batch size based on your memory and performance requirements
    let bulkOps = [];
    let counter = 0;
    // const updatedBetIds = [];  // Store the ids of updated bets

    const cursor = await newBet.find({ status: "Playing", gameId: data?.gameId, roundId: data.roundId })
    for await (const bet of cursor) {

        bulkOps.push({
            updateOne: {
                filter: { _id: bet._id },
                update: {
                    $set: {
                        status: "End",
                        endTime: endTime
                    }
                }
            }
        })
        counter++;
        // updatedBetIds.push(bet._id);
        if (counter % batchSize === 0) {
            newBet.bulkWrite(bulkOps);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await newBet.bulkWrite(bulkOps);
    }

    // const updatedBets = await newBet.find({ _id: { $in: updatedBetIds } }, { user: 1, finalBalance: 1 });

    // const result = await newBet.find({ roundId: data.roundId });
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