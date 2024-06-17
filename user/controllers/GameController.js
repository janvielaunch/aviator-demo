const Game = require("../models/gameModel")

const list = async (req, res) => {
    try {
        const games = await Game.find();
        res.status(200).send(games);
    } catch (error) {
        res.status(500).send(error);
    }
}

const store = async (req, res) => {
    try {
        const game = new Game(req.body);
        await game.save();
        res.status(201).send(game);
    } catch (error) {
        console.log("error")
        if (error.code === 11000) { // Duplicate key error code
            res.status(400).send({ error: 'GameId must be unique.' });
        } else {
            res.status(400).send(error);
        }
    }
}

const show = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).send();
        }
        res.status(200).send(game);
    } catch (error) {
        res.status(500).send(error);
    }
}

const update = async (req, res) => {

    try {
        const game = await Game.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
        if (!game) {
            return res.status(404).send();
        }
        res.status(200).send(game);
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error code
            res.status(400).send({ error: 'GameId must be unique.' });
        } else {
            res.status(400).send(error);
        }
    }
}

const destroy = async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.id);
        if (!game) {
            return res.status(404).send();
        }
        res.status(200).send({"message":"Game deleted successfully."});
    } catch (error) {
        res.status(500).send(error);
    }
}


const status = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).send();
        }
        game.status = req.body.status;
        await game.save();
        res.status(200).send(game);
    } catch (error) {
        res.status(400).send(error);
    }
}

module.exports = {
    list,
    store,
    show,
    update,
    destroy,
    status
}