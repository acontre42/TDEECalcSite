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

import * as Subscription from './controller/SubscriptionAPI.js';
import UnsubscribeRouter from './routes/UnsubscribeRouter.js'; 
import UserRouter from './routes/UserRouter.js';

app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body
app.use(cookieParser()); // Middleware for exposing cookie data as req.cookies property

// ROUTERS
app.use('/unsubscribe', UnsubscribeRouter);
app.use('/user', UserRouter);


// ROUTES
app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/review/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let error = {
        code: 400,
        message: 'Bad Request'
    };
    try {
        const validId = await Subscription.isValidId(id);
        const validCode = await Subscription.isValidPendingCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }

        const validPair = await Subscription.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const pending = await Subscription.getPendingMeasurements(id);
        if (!pending) {
            error = {
                code: 500,
                message: 'Internal Server Error'
            };
            throw new Error();
        }

        res.cookie('id', id);
        res.cookie('pendingCode', code);
        res.render('review.ejs', {pending: pending});
    }
    catch (err) {
        res.status(error.code).render('error.ejs', {error: error});
    }
});

app.put('/confirm/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    
    let errorCode;
    try {
        const validPair = await Subscription.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }

        const confirmed = await Subscription.confirmUpdate(id);
        if (!confirmed) {
            errorCode = 500;
            throw new Error();
        }

        res.status(200).send({message: 'Your measurements were successfully updated.'});
    }
    catch (err) {
        res.status(errorCode).send({message: 'There was an error while attempting to update your measurements.'});
    }
});

app.delete('/reject/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let errorCode;
    try {
        const validPair = await Subscription.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }

        const deleted = await Subscription.rejectUpdate(code);
        if (!deleted) {
            errorCode = 500;
            throw new Error();
        }

        res.status(200).send({message: 'Pending measurements successfully deleted.'});
    }
    catch (err) {
        res.status(errorCode).send({message: 'There was an error while attempting to delete pending measurements.'});
    }
});

app.get('/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let error = {
        code: 400,
        message: 'Bad Request'
    };
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
            error = {
                code: 500,
                message: 'There was a problem while attempting to get saved measurements from server.'
            }
            throw new Error();
        }
        
        res.cookie('id', id); // Set cookies
        res.cookie('updateCode', code);
        res.render('update.ejs', { measurements: measurements} );
    }
    catch (err) {
        res.status(error.code).render('error.ejs', { error: error });
    }
});

app.put('/update/:id/:code', async function (req, res) {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    const measurements = req.body;

    const validPair = await Subscription.updateCodeBelongsToSubId(code, id);
    if (!validPair) {
        return res.status(400).send({message: 'Invalid request.'})
    }

    const updated = await Subscription.updateMeasurements(id, measurements);
    if (!updated) {
        res.status(500).send({message: 'There was an error updating the saved measurements. Please try again.'});
    }
    else {
        res.status(200).send({message: 'Measurements were successfully updated.'});
    }
});

app.get('*', (req, res) => {
    let error = {
        code: 404,
        message: 'Page Not Found'
    };
    res.status(404).render('error.ejs', { error: error} );
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));