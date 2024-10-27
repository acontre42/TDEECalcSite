const express = require("express");
const app = express();
const port = 3000;

const VERIFIED_SUBS = new Map();
const PENDING_SUBS = new Map();
PENDING_SUBS.set("example@email.net", { // ***
    "sex": "male",
    "age": 20,
    "feet": 5,
    "inches": 9,
    "lbs": 150,
    "email": "example@email.net",
    "system": "imperial",
    "activityLvl": "sedentary",
    "howOften": "yearly"
});

app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body

app.post("/", (req, res) => { // *** TO DO: check if email already subscribed
    console.log(req.body);
    if (isValidRequest(req.body)) {
        PENDING_SUBS.set(req.body.email, req.body);
        console.log(PENDING_SUBS);
        res.status(201).send({message: "Subscribed"});
    }
    else {
        res.sendStatus(400);
    }
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));

// FUNCTIONS
// Valid request should have EMAIL, SYSTEM, SEX, AGE, ACTIVITY_LEVEL, HOW_OFTEN.
// If system = "imperial", request should have FEET, INCHES, LBS.
// If system = "metric", request should have CM, KG.
function isValidRequest(body) {
    if (!body.email || !body.system || !body.sex || !body.age || !body.activityLvl || !body.howOften) {
        return false;
    }

    if (!isValidEmailFormat(body.email)) {
        return false;
    }

    switch (body.system) {
        case "imperial":
            if (!body.feet || !body.lbs || (!body.inches && body.inches != 0)) {
                return false;
            }
            break;
        case "metric":
            if (!body.cm || !body.kg) {
                return false;
            }
            break;
        default: // System other than imperial/metric
            return false;
    }

    return true;
}
// To double check email format
function isValidEmailFormat(emailString) {
    let regex = /^[\w!#$%&'*+-/=?^_`{|}~]{1,64}@[\w.]{1,63}\.[a-zA-Z0-9-]{1,63}$/i;
    return regex.test(emailString);
}