"use strict";

import path from 'path';
import dotenv from 'dotenv';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
    override: true,
    path: path.join(__dirname, '/development.env')
});

import pg from 'pg';
const pool = new pg.Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: (process.env.TESTING ? process.env.TEST_DATABASE : process.env.DATABASE),
    password: process.env.PASSWORD,
    port: process.env.PORT
});

const NOT_FOUND = null, ERROR = null;

// When testing, call inside afterAll()
export function endPool() {
    pool.end();
}

// When subscribing a new user, insert a new row into subscriber, subscriber_measurements, and confirmation_code.
// Valid sub object should have email and freq properties.
// Valid sub object should also have sex, age, measurement_sys, weight_value, height_value, est_bmr, and est_tdee.
// Returns either id of successfully inserted subscriber or null.
export async function subscribe(sub) {
    if (!sub || typeof sub !== 'object' || !sub.freq || !sub.email || typeof sub.email !== 'string') {
        return ERROR;
    }
    if (!sub.sex || !sub.age || !sub.measurement_sys || !sub.weight_value || !sub.height_value || !sub.est_bmr || !sub.est_tdee) {
        return ERROR;
    }
    const {email, freq, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee} = sub;

    const client = await pool.connect();
    try {
        console.log('BEGINNING'); // *** DELETE
        client.query('BEGIN'); // Start transaction block
        // Get freq_id for subscriber
        const freqId = await getFreqId(freq);
        // Insert subscriber, get id
        console.log('INSERTING SUBSCRIBER'); // *** DELETE
        let query = {
            text: 'INSERT INTO subscriber (email, freq_id) VALUES ($1, $2) RETURNING *;',
            values: [email, freqId]
        };
        let {rows} = await client.query(query);
        console.log(rows[0]); // ***
        const subId = rows[0]['id'];
        // Insert subscriber_measurements
        console.log('INSERTING MEASUREMENTS'); // *** DELETE
        query = {
            text: `INSERT INTO subscriber_measurements (sub_id, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee)
                    VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 ) RETURNING *;`,
            values: [subId, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee]
        };
        ({rows} = await client.query(query));
        console.log(rows[0]); // ***
        // Insert confirmation_code
        console.log('INSERTING CODE'); // *** DELETE
        let code = generateCode();
        query = {
            text: 'INSERT INTO confirmation_code (sub_id, code) VALUES ($1, $2) RETURNING *;',
            values: [subId, code]
        };
        ({rows} = await client.query(query));
        console.log(rows[0]);
        // Commit transaction and return subscriber id
        console.log('COMMITTING'); // *** DELETE
        await client.query('COMMIT');
        return subId;
    }
    catch (err) {
        console.log(err);
        console.log('ROLLING BACK');
        await client.query('ROLLBACK'); // Rollback transaction if error
        return ERROR;
    }
    finally {
        client.release();
    }
}

// SUBSCRIBER TABLE
// Select subscriber by email, id
async function selectSubscriber(column, value) {
    //console.log(`col: ${column}, val: ${value}`);
    let queryString;
    if (!column && !value) {
        queryString = `SELECT * FROM subscriber;`; // *** By default, all are returned
    }
    else if (column && value && typeof column === 'string') {
        switch (column) {
            case 'email':
                if (typeof value === 'string') {
                    queryString = `SELECT * FROM subscriber WHERE email = $1;`;
                }
                else {
                    return NOT_FOUND;
                }
                break;
            case 'id':
                if (typeof value === 'number') {
                    queryString = `SELECT * FROM subscriber WHERE id = $1;`;
                }
                else {
                    return NOT_FOUND;
                }
                break;
            default:
                return NOT_FOUND;
        }
    }
    else {
        return NOT_FOUND;
    }
    
    const client = await pool.connect();
    try {       
        const query = {
            text: queryString,
            values: [value]
        };
        const {rows} = await client.query(query);
        if (!rows || !rows[0]) {
            //console.log("Not found");
            return NOT_FOUND;
        }
        else {
            //console.log(rows[0]);
            return rows[0];
        }
    }
    catch (err) {
        console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
export async function selectSubscriberByEmail(email) {
    const column = 'email';
    const res = await selectSubscriber(column, email);
    return res;
}
export async function selectSubscriberById(id) {
    const column = 'id';
    const res = await selectSubscriber(column, id);
    return res;
}
// Update subscriber's email or freq_id. Returns updated row if successful or null if not.
async function updateSubscriber(id, column, value) {
    // TO DO:
    if (!id || !column || !value || typeof id !== 'number' || typeof column !== 'string') {
        return ERROR;
    }

    let queryString;
    switch(column) {
        case 'email':
            queryString = 'UPDATE subscriber SET email = $1 WHERE id = $2 RETURNING *;';
            break;
        case 'freq_id':
            queryString = 'UPDATE subscriber SET freq_id = $1 WHERE id = $2 RETURNING *;';
            break;
        default:
            return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: queryString,
            values: [value, id]
        };
        const {rows} = await client.query(query);
        //console.log(rows);
        return ( rows[0] ? rows[0] : ERROR);
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
export async function updateSubscriberEmail(id, newEmail) {
    const column = "email";
    return updateSubscriber(id, column, newEmail);
}
export async function updateSubscriberFreq(id, freq) {
    const freqId = await getFreqId(freq);
    if (!freqId) {
        return ERROR;
    }
    else {
        const column = "freq_id";
        return updateSubscriber(id, column, freqId);
    }
}
// Delete subscriber by id and return number of rows deleted. 
export async function deleteSubscriberById(id){
    if (!id || typeof id !== "number") {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: 'DELETE FROM subscriber WHERE id = $1 RETURNING *;',
            values: [id]
        };
        const {rows} = await client.query(query);
        //console.log(rows);
        return rows.length;
    }
    catch (err) {
        console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}

// SUBSCRIBER_MEASUREMENTS TABLE
// Select by sub_id
async function selectSubMeasurements(column, value) {
    //console.log(`col: ${column}, val: ${value}`);
    let queryString;

    if (!column && !value) {
        queryString = `SELECT * FROM subscriber_measurements;`; // By default, all are returned
    }
    else if (column && value && typeof column === 'string') {
        switch (column) { 
            case 'sub_id':
                if (typeof value === 'number') {
                    queryString = 'SELECT * FROM subscriber_measurements WHERE sub_id = $1;';
                }
                else {
                    return NOT_FOUND;
                }
                break;
            default:
                return NOT_FOUND;
        }
    }
    else {
        return NOT_FOUND;
    }
    
    const client = await pool.connect();
    try {    
        const query = {
            text: queryString,
            values: [value]
        };   
        const {rows} = await client.query(query);
        if (!rows || !rows[0]) {
            //console.log("Not found");
            return NOT_FOUND;
        }
        else {
            //console.log(rows[0]);
            return rows[0];
        }
    }
    catch (err) {
        console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
export async function selectSubMeasurementsBySubId(subId) {
    const column = 'sub_id';
    return selectSubMeasurements(column, subId);
}
// PASS ONE SUB OBJECT OR DO INDIVIDUAL UPDATES FOR EACH UPDATED/CHANGED VALUE?
export async function updateSubMeasurements(subId, column, value) {
    // TO DO:
}

// CONFIRMATION_CODE TABLE
async function selectConfirmationCode(column, value) {
    let queryString;
    if (!column && !value) { // By default, return all 
        queryString = 'SELECT * FROM confirmation_code;';
    }
    else if (column && value && typeof column == 'string') {
        switch (column) {
            case 'code':
                queryString = 'SELECT * FROM confirmation_code WHERE code = $1;';
                break;
            case 'sub_id':
                queryString = 'SELECT * FROM confirmation_code WHERE sub_id = $1;';
                break;
            default:
                return NOT_FOUND;
        }
    }
    else {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: queryString,
            values: [value]
        };
        const {rows} = await client.query(query);
        console.log(rows); // ***
        return ( rows[0] ? rows[0] : NOT_FOUND );
    }
    catch (err) {
        console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
export async function selectConfirmationCodeBySubId(subId) {
    const column = 'sub_id';
    return selectConfirmationCode(column, subId);
}
export async function selectConfirmationCodeByCode(code) {
    const column = 'code';
    return selectConfirmationCode(column, code);
}

export async function updateConfirmationCode(id, code) {
    // TO DO
}
// After confirming user, delete confirmation_code associated with their id
export async function deleteConfirmationCode(id) {
    // TO DO
}

// FREQUENCY TABLE
// Return id that matches frequency descriptor. (Ex: 'monthly' -> 1, 'yearly' -> 5, etc.)
export async function getFreqId(freq) {
    if (!freq || typeof freq !== 'string') {
        return NOT_FOUND;
    }
    
    const client = await pool.connect();
    try {
        const query = {
            text: 'SELECT id FROM frequency WHERE descriptor = $1;',
            values: [freq]
        };
        const {rows} = await client.query(query);
        return ( !rows[0] ? NOT_FOUND : parseInt(rows[0]['id']) );
    }
    catch (err) {
        //console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
// Return num_days that matches frequency id. (Ex: 1 -> 30 days)
export async function getFreqNumDays(freqId) {
    if (!freqId || typeof freqId !== 'number') {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: 'SELECT num_days FROM frequency WHERE id = $1;',
            values: [freqId]
        };
        const {rows} = await client.query(query);
        return ( !rows[0] ? NOT_FOUND : parseInt(rows[0]['num_days']) );
    }
    catch (err) {
        //console.log(err);
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}

// CODE GENERATION
const MIN_CODE = 10000000, MAX_CODE = 99999999
// Generates code between 10000000 and 99999999 for confirmation purposes.
function generateCode() {
    let code = Math.floor(Math.random() * (MAX_CODE - MIN_CODE + 1) + MIN_CODE);
    return code;
}

/* // TEST CODE
(async () => {
    let sub = {
        email: 'my@email.com',
        freq: 'yearly',
        age: 20,
        sex: 'male',
        est_tdee: 2500,
        est_bmr: 1800,
        measurement_sys: 'imperial',
        height_value: 70,
        weight_value: 200
    };
    let id = await subscribe(sub);
    let cc = await selectConfirmationCodeBySubId(id);
    console.log(cc);
    await selectConfirmationCodeByCode(cc['code']);
})();
*/