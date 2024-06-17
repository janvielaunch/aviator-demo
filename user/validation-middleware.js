const { validator } = require("./validate");

const gameValidate = async (req, res, next) => {
    const validationRule = {
        "gameId": "required|string",
        "gameName": "required|string",
        "image": "required|string",
        "minBet": "required|integer|min:1",
        "maxBet": "required|integer",
    };
    await validator(req.body, validationRule, {}, async (errors, status) => {
        if (!status) {
            res.status(422).send(errors)
        } else {
            next();
        }
    })

}

module.exports = {
    gameValidate
}