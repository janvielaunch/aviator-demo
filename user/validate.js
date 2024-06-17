const Validator = require('validatorjs');

const validator = async (body, rules, customMessages, callback) => {
    const validation = new Validator(body, rules, customMessages);

    validation.passes(() => callback(null, true));
    validation.fails(() => callback(convert(validation), false));
};
function convert(errors) {
    var tmp = errors.errors.all();
    var obj = {};
    for (let key in tmp) {
        obj[key] = tmp[key].join(",");
    }

    return obj;
}

Validator.registerAsync('exist', function (value, attribute, req, passes) {
    if (!attribute) throw new Error('Specify Requirements i.e fieldName: exist:table,column');

    let attArr = attribute.split(",");

    if (attArr.length !== 2) throw new Error(`Invalid format for validation rule on ${attribute}`);
    const { 0: table, 1: column } = attArr;

    let msg = (column == "username") ? `${column} has already been taken ` : `${column} already in use`

    mongoose.model(table).findOne({ [column]: value }).then((result) => {
        if (result) {
            passes(false, msg);
        } else {
            passes();
        }
    }).catch((err) => {
        passes(false, err);
    });
});

module.exports = {validator};