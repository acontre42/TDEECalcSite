"use strict";
import express from 'express';
const app = express();
const port = 3000;

import cookieParser from 'cookie-parser';

import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//console.log(__dirname, __filename);

import * as Subscription from './SubscriptionService/SubscriptionAPI.js';
import * as Misc from './public/MiscFunc.js';

app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body
app.use(cookieParser()); // Middleware for exposing cookie data as req.cookies property

app.get('/', (req, res) => {
    res.render('index.ejs');
});

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
    res.render('unsubscribe.ejs');
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
    try {
        const validId = await Subscription.isValidId(id);
        const validCode = await Subscription.isValidUnsubCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }
        
        const validPair = await Subscription.unsubscribeCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const deleted = await Subscription.unsubscribe(id);
        if (!deleted) {
            throw new Error();
        }
            
        res.status(200).send({message: `Successfully unsubscribed id ${id}`});
    }
    catch (err) {
        res.status(404).send({message: `There was a problem unsubscribing.`});
    }
    */
});

app.get('/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    console.log(req.url, id, code); // *** DELETE

    try {
        const validId = await Subscription.isValidId(id);
        const validCode = await Subscription.isValidUpdateCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }
        
        const validPair = await Subscription.updateCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const measurements = await Subscription.getSubscriberMeasurements(id);
        if (!measurements) {
            throw new Error();
        }
        
        res.cookie('id', id); // Set cookies
        res.cookie('updateCode', code);
        res.render('update.ejs', { measurements: measurements} );
    }
    catch (err) {
        res.status(400).send({message: `There was a problem while attempting to get saved measurements.`}); // *** TO DO: error page?
    }
});

app.put('/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    const measurements = req.body;
    console.log(req.url, id, code, measurements); // *** DELETE

    const validPair = await Subscription.updateCodeBelongsToSubId(code, id);
    if (!validPair) {
        res.status(400).send({message: 'Invalid request.'})
    }

    const updated = await Subscription.updateMeasurements(id, measurements);
    if (!updated) {
        res.status(500).send({message: 'There was an error updating the saved measurements. Please try again.'});
    }
    else {
        res.status(200).send({message: 'Measurements were successfully updated.'});
    }
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