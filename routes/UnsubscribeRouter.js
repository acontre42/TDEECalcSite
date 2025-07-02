"use strict";
const port = 3000;
const BASE_PATH = `http://localhost:${port}/unsubscribe`;

import express from 'express';
const router = express.Router();

import * as UnsubscribeController from '../controller/UnsubscribeController.js';
import * as Validate from '../controller/Validate.js';

// route: /unsubscribe/...

router.get('/', async (req, res) => {
    res.render('unsubscribe.ejs');
});

router.post('/', async (req, res) => {
    const email = req.body.email;
    const result = await UnsubscribeController.createUnsubscribeRequest(email);
    if (result) {
        res.status(200).send({message: `Request received to unsubscribe ${email}`});
    }
    else {
        res.status(500).send({message: `There was a problem requesting to unsubscribe`});
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
        const validCode = await Validate.isValidUnsubCode(code);
        if (!validId || !validCode) {
            throw new Error();
        }
        
        const validPair = await Validate.unsubscribeCodeBelongsToSubId(code, id);
        if (!validPair) {
            throw new Error();
        }
        
        const path = BASE_PATH + req.url; // Full URL for server component
        const response = await fetch(path, {
            method: 'DELETE',
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

router.delete('/:id/:code', async (req, res) => {
    const id = parseInt(req.params.id);
    const code = parseInt(req.params.code);
    
    let errorCode;
    try {
        const validPair = await Validate.unsubscribeCodeBelongsToSubId(code, id);
        if (!validPair) {
            errorCode = 400;
            throw new Error();
        }
        
        const deleted = await UnsubscribeController.unsubscribe(id);
        if (!deleted) {
            errorCode = 500;
            throw new Error();
        }
            
        res.status(200).send({message: `You've been successfully unsubscribed.`});
    }
    catch (err) {
        res.status(errorCode).send({message: `There was a problem during the unsubscription process.`});
    }
});

export default router; // ***