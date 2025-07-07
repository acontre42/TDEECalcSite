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

import * as TaskIntervals from './controller/TaskIntervals.js';
import UnsubscribeRouter from './routes/UnsubscribeRouter.js';
import UpdateRouter from './routes/UpdateRouter.js';
import UserRouter from './routes/UserRouter.js';

app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));
app.use(express.json()); // Middleware to parse req.body
app.use(cookieParser()); // Middleware for exposing cookie data as req.cookies property

// ROUTERS
app.use('/unsubscribe', UnsubscribeRouter);
app.use('/update', UpdateRouter);
app.use('/user', UserRouter);


// ROUTES
app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('*', (req, res) => {
    let error = {
        code: 404,
        message: 'Page Not Found'
    };
    res.status(404).render('error.ejs', { error: error} );
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));