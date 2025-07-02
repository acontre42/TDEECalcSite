"use strict";
const port = 3000;
const BASE_PATH = `http://localhost:${port}/user`;

import express from 'express';
const router = express.Router();

import * as UserController from '../controller/UserController.js';
import * as Validate from '../controller/Validate.js';
import { isValidEmailFormat } from '../public/MiscFunc.js';

// route: /user/...

router.get('/confirm/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let error = {
        code: 400,
        message: 'Bad Request'
    };
    try {
        const validId = await Validate.isValidId(id);
        const validCode = await Validate.isValidConfirmationCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }

        const validPair = await Validate.confirmationCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }

        const path = BASE_PATH + req.url; // Full URL for server component
        const response = await fetch(path, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        
        if (!response.ok) {
            error = {
                code: response.status,
                message: result.message
            };
            throw new Error();
        }

        res.render('success.ejs', {result: result});
    }
    catch (err) {
        res.status(error.code).render('error.ejs', {error: error});
    }
});

router.put('/confirm/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let errorCode;
    try {
        const validPair = await Validate.confirmationCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }

        const confirmed = await UserController.confirmUser(id);
        if (!confirmed) {
            errorCode = 500;
            throw new Error();
        }

        res.status(200).send({message: `You've successfully confirmed your email.`});
    }
    catch (err) {
        res.status(errorCode).send({message: `There was an error during the email confirmation process.`});
    }
});

router.post('/subscribe', async (req, res) => {
    if (isValidRequest(req.body)) {
        const user = req.body;
        const msg = UserController.addUser(user);
        res.status(200).send({message: msg});
    }
    else {
        res.status(400).send({message: 'Invalid request.'});
    }
});

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

export default router; // ***