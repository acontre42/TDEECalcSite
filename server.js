"use strict";
const express = require("express");
const app = express();
const port = 3000;

const nodemailer = require("nodemailer"); // ***
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.TEST_USER,
        pass: process.env.TEST_PASS
    }
});

const VERIFIED_SUBS = new Map();
const PENDING = new Map();
let idCount = 0;

let pendingEmails = []; // Aray with string of email addresses that need verification emails
let sendIntervalId = setInterval(sendVerificationEmails, 60000);

app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body

app.post("/", (req, res) => {
    console.log(req.body);
    if (isValidRequest(req.body)) {
        let subscriber = req.body;
        subscriber["id"] = ++idCount;
        if (VERIFIED_SUBS.has(subscriber.email)) {
            PENDING.set(subscriber.email, subscriber);
            res.status(202).send({message: "Update request received."});
        }
        else if (PENDING.has(subscriber.email)) {
            PENDING.set(subscriber.email, subscriber);
            res.status(200).send({message: "New confirmation email will be sent."})
        }
        else {
            PENDING.set(subscriber.email, subscriber);
            res.status(201).send({message: "Subscribed"});
        }

        pendingEmails.push(subscriber.email);
        console.log(`Pending emails: ${pendingEmails}`);
        //console.log("Verified: \n", VERIFIED_SUBS);
        //console.log("Pending: \n", PENDING);
    }
    else {
        res.sendStatus(400);
    }
});

app.delete("/unsubscribe/:id", (req, res) => { // ***
    let id = parseInt(req.params.id);
    let email;
    for (let key of VERIFIED_SUBS.keys()) {
        let sub = VERIFIED_SUBS.get(key);
        console.log(sub);
        if (sub.id == id) {
            console.log(`Found id ${sub.id} with email ${sub.email}`);
            email = sub.email;
            break;
        }
    }

    if (VERIFIED_SUBS.has(email)) {
        VERIFIED_SUBS.delete(email);
        console.log("Verified: \n", VERIFIED_SUBS);
        res.status(200).send({message: `Unsubscribed id ${id}`});
    }
    else {
        res.status(404).send({message: `Id ${id} not found`})
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
// Send verification emails in batches
function sendVerificationEmails() {
    console.log(`Sending verification emails at ${new Date()}`)
    for (let address of pendingEmails) {
        if (!VERIFIED_SUBS.has(address) && !PENDING.has(address)) {
            console.log(`ERROR: ${address} not found in pending or verified. Discarding...`);
            break;
        }
        else {
            // *** TO DO: replace testing code
            let mailOptions = {
                from: process.env.TEST_USER,
                to: process.env.TEST_USER,
                subject: "Please confirm your email to receive TDEE updates.",
                text: `Test email: ${address}`
            };
            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                }
                else {
                    console.log(`Verification email sent to ${address}`);
                    console.log(`Response: ${info.response}`);
                }
            });
        }
    }
    pendingEmails = [];
}