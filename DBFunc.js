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
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

const NOT_FOUND = null, ERROR = null;

// When testing, call inside afterAll()
export function endPool() {
    pool.end();
}

// SUBSCRIBER TABLE
// Valid sub object should have email and howOften properties. Returns either id of successfully inserted subscriber or null.
export async function insertSubscriber(sub) {
    if (!sub || typeof sub !== 'object' || !sub.howOften || !sub.email || typeof sub.email !== 'string') {
        //console.log("Error: can't insert subscriber as one or more arguments is missing or of invalid type");
        return ERROR;
    }

    const client = await pool.connect();
    try {
        let freqId = await getFreqId(sub.howOften);
        if (!freqId) {
            throw new Error("Invalid frequency descriptor in sub.howOften.");
        }
        let queryString = `INSERT INTO subscriber (email, freq_id) VALUES ('${sub.email}', ${freqId}) RETURNING id;`;
        const {rows} = await client.query(queryString);
        //console.log(rows);
        if (rows[0]) {
            return rows[0]['id'];
        }
        else {
            return ERROR;
        }
    }
    catch (err) {
        //console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
// Select subscriber by email, id
async function selectSubscriber(column, value) {
    //console.log(`col: ${column}, val: ${value}`);
    let queryString = `SELECT * FROM subscriber`; // *** By default, all are returned
    if (!column && !value) {
        queryString += ';';
    }
    else if (column && value && typeof column === 'string' && !/;/.test(column) && !/;/.test(value)) {
        queryString += ` WHERE ${column} = `;
        switch (column) {
            case 'email':
                if (typeof value === 'string') {
                    queryString += `'${value}';`;
                }
                else {
                    return NOT_FOUND;
                }
                break;
            case 'id':
                if (typeof value === 'number') {
                    queryString += `${value};`;
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
        let {rows} = await client.query(queryString);
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

export async function updateSubscriber(subId, column, value) {
    // TO DO:
}

// Delete subscriber by id and return number of rows deleted. 
export async function deleteSubscriberById(id){
    if (!id || typeof id !== "number") {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const queryString = `DELETE FROM subscriber WHERE id = ${id} RETURNING *;`;
        let {rows} = await client.query(queryString);
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
// Valid sub object should have sex, age, measurement_sys, weight_value, height_value, est_bmr, and est_tdee.
export async function insertSubMeasurements(subId, sub) {
    if (!subId || !sub || typeof subId !== 'number' || typeof sub !== 'object') {
        return ERROR;
    }
    if (!sub.sex || !sub.age || !sub.measurement_sys || !sub.weight_value || !sub.height_value || !sub.est_bmr || !sub.est_tdee) {
        return ERROR;
    }
    const {sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee} = sub;
    if (/;/.test(sex) || /;/.test(age) || /;/.test(measurement_sys) || /;/.test(weight_value) || /;/.test(height_value) || /;/.test(est_bmr) || /;/.test(est_tdee)) {
        return ERROR;
    }

    let queryString = `INSERT INTO subscriber_measurements (sub_id, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee)
        VALUES ( ${subId}, '${sex}', ${age}, '${measurement_sys}', ${weight_value}, ${height_value}, ${est_bmr}, ${est_tdee} )
        RETURNING *;`;
    
    const client = await pool.connect();
    try {
        let {rows} = await client.query(queryString);
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
// Select by sub_id
async function selectSubMeasurements(column, value) {
    //console.log(`col: ${column}, val: ${value}`);
    let queryString = `SELECT * FROM subscriber_measurements`; // *** By default, all are returned
    if (!column && !value) {
        queryString += ';';
    }
    else if (column && value && typeof column === 'string' && !/;/.test(column) && !/;/.test(value)) {
        queryString += ` WHERE ${column} = `;
        switch (column) { // *** TO DO: what other columns might be needed?
            case 'sub_id':
                if (typeof value === 'number') {
                    queryString += `${value};`;
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
        let {rows} = await client.query(queryString);
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
export async function selectSubMeasurementsBySubId(id) {
    const column = 'sub_id';
    return selectSubMeasurements(column, id);
}

// PASS ONE SUB OBJECT OR DO INDIVIDUAL UPDATES FOR EACH UPDATED/CHANGED VALUE?
export async function updateSubMeasurement() {
    // TO DO:
}

// SCHEDULED_REMINDER TABLE
export async function insertSchedReminder() {
    // TO DO:
}

export async function selectSchedReminder() {
    // TO DO:
}

export async function updateSchedReminder() {
    // TO DO:
}

// Return id that matches frequency descriptor. (Ex: 'monthly' -> 1, 'yearly' -> 5, etc.)
export async function getFreqId(freq) {
    if (!freq || typeof freq !== 'string') {
        return NOT_FOUND;
    }
    
    const client = await pool.connect();
    try {
        let queryString = `SELECT id FROM frequency WHERE descriptor = '${freq}';`;
        let {rows} = await client.query(queryString);
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
        let queryString = `SELECT num_days FROM frequency WHERE id = ${freqId}`;
        let {rows} = await client.query(queryString);
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