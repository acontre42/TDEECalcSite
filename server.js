"use strict";
import express from 'express';
const app = express();
const port = 3000;

import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//console.log(__dirname, __filename);

import * as Subscription from './SubscriptionService/SubscriptionAPI.js';
import * as Misc from './public/MiscFunc.js';

app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body

app.post("/", async (req, res) => {
    if (isValidRequest(req.body)) {
        const user = req.body;
        const msg = Subscription.addUser(user);
        res.status(200).send({message: msg});
    }
    else {
        res.status(400).send({message: 'Invalid request.'});
    }
});

app.get('/unsubscribe', (req, res) => {
    res.sendFile(__dirname + '/public/unsubscribe.html');
});

app.post('/unsubscribe', async (req, res) => {
    const email = req.body.email;
    const result = await Subscription.createUnsubscribeRequest(email);
    if (result) {
        res.status(200).send({message: `Request received to unsubscribe ${email}`});
    }
    else {
        res.status(500).send({message: `There was a problem requesting to unsubscribe`});
    }
});

app.delete("/unsubscribe/:id/:code", async (req, res) => {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.code);
    /*
    // *** TO DO:
    let valid;
    try {
        const existingUser = await Subscription.getUser(id);
        const validCode = await Subscription.isValidUnsubCode(code);
        if (!existingUser || !validCode) {
            throw new Error();
        }
    }
    catch (err) {
        valid = false;
    }
    
    if (valid) {
        res.status(200).send({message: `Unsubscribed id ${id}`});
    }
    else {
        res.status(404).send({message: `Id ${id} not found`});
    }
    */
});

app.get('/measurements', async function (req, res) { // *** TO DO
    const subId = req.subId;
});

app.get('/update/:id/:code', async function (req, res) {
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.id);
    /*
    // *** TO DO
    try {
        const existingUser = await Subscription.getUser(id);
        const validCode = await Subscription.isValidUpdateCode(code);
        if (!existingUser || !validCode) {
            throw new Error();
        }
        
        const measurements = await Subscription.getUserMeasurements(id);
        if (measurements) {
            // TO DO: display calculator form with last saved values
        }
        else {
            throw new Error();
        }
    }
    catch (err) {
        res.status(404).send({message: `Invalid code or id`});
    }
    */
});

app.put('/update/:id/:code', function (req, res) { // *** TO DO: update subscriber_measurements
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.id);
});

app.put('confirm/user/:id/:code', function(req, res) { // *** TO DO: if id and code valid, confirm user
    let id = parseInt(req.params.id);
    let code = parseInt(req.params.code);
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

    if (!Misc.isValidEmailFormat(body.email)) {
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