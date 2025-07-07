"use strict";
const port = 3000;
const BASE_PATH = `http://localhost:${port}/update`;

import express from 'express';
const router = express.Router();

import * as UpdateController from '../controller/UpdateController.js';
import * as Validate from '../controller/Validate.js';

// route: /update/...

router.get('/review/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let error = {
        code: 400,
        message: 'Bad Request'
    };
    try {
        const validId = await Validate.isValidId(id);
        const validCode = await Validate.isValidPendingCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }

        const validPair = await Validate.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const pending = await UpdateController.getPendingMeasurements(id);
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

router.put('/confirm/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    
    let errorCode;
    try {
        const validPair = await Validate.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }

        const confirmed = await UpdateController.confirmUpdate(id);
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

router.delete('/reject/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let errorCode;
    try {
        const validPair = await Validate.pendingCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }

        const deleted = await UpdateController.rejectUpdate(code);
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

router.get('/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);

    let error = {
        code: 400,
        message: 'Bad Request'
    };
    try {
        const validId = await Validate.isValidId(id);
        const validCode = await Validate.isValidUpdateCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }
        
        const validPair = await Validate.updateCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const measurements = await UpdateController.getSubscriberMeasurements(id);
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

router.put('/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    const measurements = req.body;

    const validPair = await Validate.updateCodeBelongsToSubId(code, id);
    if (!validPair) {
        return res.status(400).send({message: 'Invalid request.'})
    }

    const updated = await UpdateController.updateMeasurements(id, measurements);
    if (!updated) {
        res.status(500).send({message: 'There was an error updating the saved measurements. Please try again.'});
    }
    else {
        res.status(200).send({message: 'Measurements were successfully updated.'});
    }
});

export default router; // ***