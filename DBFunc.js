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
        client.query('BEGIN'); // Start transaction block
        // Get freq_id for subscriber
        const freqId = await getFreqId(freq);
        // Insert subscriber, get id
        let query = {
            text: 'INSERT INTO subscriber (email, freq_id) VALUES ($1, $2) RETURNING *;',
            values: [email, freqId]
        };
        let {rows} = await client.query(query);
        const subId = rows[0]['id'];
        // Insert subscriber_measurements
        query = {
            text: `INSERT INTO subscriber_measurements (sub_id, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee)
                    VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 ) RETURNING *;`,
            values: [subId, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee]
        };
        await client.query(query);
        // Insert confirmation_code
        let code = generateCode();
        query = {
            text: 'INSERT INTO confirmation_code (sub_id, code) VALUES ($1, $2) RETURNING *;',
            values: [subId, code]
        };
        await client.query(query);
        // Commit transaction and return subscriber id
        await client.query('COMMIT');
        return subId;
    }
    catch (err) {
        console.log(err);
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
            return NOT_FOUND;
        }
        else {
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
    return selectSubscriber(column, email);
}
export async function selectSubscriberById(id) {
    const column = 'id';
    return selectSubscriber(column, id);
}
// Update subscriber's email or freq_id. Returns updated row if successful or null if not.
async function updateSubscriber(id, column, value) {
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
            return NOT_FOUND;
        }
        else {
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
// Updates all changed values in one transaction based on whether new values differ from currently saved values
// date_last_updated gets updated to CURRENT_TIMESTAMP regardless of whether any other values have changed
export async function updateSubMeasurements(subId, newValues) {
    if (!subId || typeof subId !== 'number' || !newValues || typeof newValues != 'object') {
        return ERROR;
    }

    const currentValues = await selectSubMeasurementsBySubId(subId);
    if (!currentValues) {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Update individual columns
        let query;
        if (newValues.sex && newValues.sex != currentValues.sex) {
            query = {
                text: 'UPDATE subscriber_measurements SET sex = $1 WHERE sub_id = $2;',
                values: [newValues.sex, subId]
            };
            await client.query(query);
        }
        if (newValues.age && newValues.age != currentValues.age) {
            query = {
                text: 'UPDATE subscriber_measurements SET age = $1 WHERE sub_id = $2;',
                values: [newValues.age, subId]
            };
            await client.query(query);
        }
        if (newValues.measurement_sys && newValues.measurement_sys != currentValues.measurement_sys) {
            query = {
                text: 'UPDATE subscriber_measurements SET measurement_sys = $1 WHERE sub_id = $2;',
                values: [newValues.measurement_sys, subId]
            };
            await client.query(query);
        }
        if (newValues.weight_value && newValues.weight_value != currentValues.weight_value) {
            query = {
                text: 'UPDATE subscriber_measurements SET weight_value = $1 WHERE sub_id = $2;',
                values: [newValues.weight_value, subId]
            };
            await client.query(query);
        }
        if (newValues.height_value && newValues.height_value != currentValues.height_value) {
            query = {
                text: 'UPDATE subscriber_measurements SET height_value = $1 WHERE sub_id = $2;',
                values: [newValues.height_value, subId]
            };
            await client.query(query);
        }
        if (newValues.est_bmr && newValues.est_bmr != currentValues.est_bmr) {
            query = {
                text: 'UPDATE subscriber_measurements SET est_bmr = $1 WHERE sub_id = $2;',
                values: [newValues.est_bmr, subId]
            };
            await client.query(query);
        }
        if (newValues.est_tdee && newValues.est_tdee != currentValues.est_tdee) {
            query = {
                text: 'UPDATE subscriber_measurements SET est_tdee = $1 WHERE sub_id = $2;',
                values: [newValues.est_tdee, subId]
            };
            await client.query(query);
        }
        // Update date_last_updated
        query = {
            text: 'UPDATE subscriber_measurements SET date_last_updated = CURRENT_TIMESTAMP WHERE sub_id = $1;',
            values: [subId]
        };
        await client.query(query);
        await client.query('COMMIT');
        return selectSubMeasurementsBySubId(subId); // Return updated row
    }
    catch (err) {
        console.log(err);
        await client.query('ROLLBACK');
        return ERROR;
    }
    finally {
        client.release();
    }
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
        return ( rows[0] ? rows[0] : NOT_FOUND );
    }
    catch (err) {
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
// Updates code, date_sent, date_expires for confirmation_code associated with a non-verified subscriber
export async function updateConfirmationCode(subId, code) {
    if (!subId || !code || typeof subId !== 'number' || typeof code !== 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        let query = {
            text: `UPDATE confirmation_code SET code = $1, date_sent = CURRENT_TIMESTAMP, date_expires = (CURRENT_TIMESTAMP + INTERVAL '7 days') WHERE sub_id = $2 RETURNING *;`,
            values: [code, subId]
        };
        const {rows} = await client.query(query);
        return ( rows[0] ? rows[0] : ERROR );
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
// After confirming user, delete confirmation_code associated with their id. Returns number of rows deleted
export async function deleteConfirmationCode(subId) {
    if (!subId || typeof subId !== 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: 'DELETE FROM confirmation_code WHERE sub_id = $1 RETURNING *;',
            values: [subId]
        };
        const {rows} = client.query(query);
        return rows.length;
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
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