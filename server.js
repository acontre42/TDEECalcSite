"use strict";
import express from 'express';
const app = express();
const port = 3000;

import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//console.log(__dirname, __filename);

import * as Subscription from './SubscriptionAPI.js';

app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body

app.post("/", async (req, res) => {
    console.log("Received in /: ", req.body); // *** DELETE
    if (isValidRequest(req.body)) {
        const user = req.body;
        const msg = await Subscription.addUser(user);
        res.status(200).send({message: msg});
    }
    else {
        res.status(400).send({message: 'Invalid request.'});
    }
});

app.delete("/unsubscribe/:id/:code", (req, res) => {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.code);
    // *** TO DO:
    let valid;
    if (valid) {
        res.status(200).send({message: `Unsubscribed id ${id}`});
    }
    else {
        res.status(404).send({message: `Id ${id} not found`})
    }
});

app.get('/update/:id/:code', function (req, res) {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.id);
    // *** TO DO: display calculator form with last saved values
});

app.put('/update/:id/:code', function (req, res) {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.id);
    // *** TO DO: update subscriber_measurements
});

app.put('confirm/user/:id/:code', function(req, res) {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.code);
    // *** TO DO: if id and code valid, confirm user
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));

// FUNCTIONS
// Valid request should have EMAIL, MEASUREMENT_SYS, SEX, AGE, FREQ, EST_BMR, EST_TDEE.
// If measurement_sys = "imperial", request should have FEET, INCHES, LBS.
// If measurement_sys = "metric", request should have CM, KG.
function isValidRequest(body) {
    if (!body.email || !body.measurement_sys || !body.sex || !body.age || !body.freq || !body.est_bmr || !body.est_tdee) {
        return false;
    }

    if (!isValidEmailFormat(body.email)) {
        return false;
    }

    switch (body.measurement_sys) {
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
        default: // Measurement_sys other than imperial/metric
            return false;
    }

    return true;
}
// To double check email format
function isValidEmailFormat(emailString) {
    let regex = /^[\w!#$%&'*+-/=?^_`{|}~]{1,64}@[\w.]{1,63}\.[a-zA-Z0-9-]{1,63}$/i;
    return regex.test(emailString);
}