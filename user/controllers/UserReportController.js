const Bet = require("../models/betModel");

const userReports = async (req, res) => {
    try {

        const { user, gameId, sortBy, sortOrder } = req.query;

        let matchFilter = {};
        if (user) {
            matchFilter.user = user;
        }
        if (gameId) {
            matchFilter.gameId = gameId;
        }

        let sortFilter = {};
        if (sortBy) {
            const order = sortOrder === 'desc' ? -1 : 1;
            sortFilter[sortBy] = order;
        }else{
            sortFilter['_id'] = order;
        }

        const data = await Bet.aggregate([
            { $match: matchFilter },
            { $sort: sortFilter },
            {
                $group: {
                    _id: "$user",
                    balance: { $first: "$balance" },
                    totalBetAmount: { $sum: "$betAmount" },
                    totalWinAmount: { $sum: "$winAmount" },
                    finalBalance: { $last: "$finalBalance" },
                    bets: { $push: "$$ROOT" }
                }
            },
            { $sort: { totalBetAmount: -1 } } // Optionally sort by total bet amount
        ]);

        res.status(200).send(data);
    } catch (error) {
        console.log(error)
        res.status(500).send({ error: "An error occurred while fetching reports." });
    }
};
const gameReports = async (req, res) => {
    try {

        const { user, gameId, sortBy, sortOrder } = req.query;

        let matchFilter = {};
        if (user) {
            matchFilter.user = user;
        }
        if (gameId) {
            matchFilter.gameId = gameId;
        }

        let sortFilter = {};
        if (sortBy) {
            const order = sortOrder === 'desc' ? -1 : 1;
            sortFilter[sortBy] = order;
        }else{
            sortFilter['_id'] = order;
        }

        const data = await Bet.aggregate([
            { $match: matchFilter },
            { $sort: sortFilter },
            {
                $group: {
                    _id: "$gameId",
                    totalBetAmount: { $sum: "$betAmount" },
                    totalWinAmount: { $sum: "$winAmount" },
                    bets: { $push: "$$ROOT" }
                }
            },
            { $sort: { totalBetAmount: -1 } } // Optionally sort by total bet amount
        ]);

        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ error: "An error occurred while fetching reports." });
    }
};

module.exports = {
    userReports,
    gameReports
};
