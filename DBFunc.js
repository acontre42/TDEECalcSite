"use strict";

import path from 'path'; //const path = require('path');
import dotenv from 'dotenv'; // const dotenv = require('dotenv');
import {fileURLToPath} from 'url'; // const {fileURLToPath} = require('url');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
    override: true,
    path: path.join(__dirname, '/development.env')
});

import pg from 'pg'; //const pg = require('pg');
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
    if (!sub || typeof sub !== 'object' || !sub.howOften || !sub.email) {
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

async function selectSubscriber(column, value) {
    //console.log(`col: ${column}, val: ${value}`);

    /*
    // *** TO DO: use switch statement instead
    let queryString = `SELECT * FROM subscriber`;
    if (!column && !value) {
        queryString += ';';
    }
    else if (column && value && typeof column === 'string' && !/;/.test(column) && !/;/.test(value)) {
        switch (column) {
            case 'email':
                if (typeof value === 'string') {
                    // *** TO DO
                }
                else {
                    return NOT_FOUND;
                }
                break;
            case 'id':
                if (typeof value === 'number') {
                    // *** TO DO
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
    */

    const client = await pool.connect();
    try {
        let queryString = `SELECT * FROM subscriber`;
        if (column && typeof column == 'string' && !/;/.test(column) && value) {
            queryString += ` WHERE ${column} = `;
            if (typeof value === 'string' && !/;/.test(value)) {
                queryString += `'${value}'`;
            }
            else if (typeof value === 'number') {
                queryString += `${value}`;
            }
            else {
                throw new Error(`Invalid value passed to selectSubscriber. Value: ${value}`);
            }
        }
        else if (column && !value){
            throw new Error(`Invalid value passed to selectSubscriber. Value: ${value}`);
        }
        else {
            queryString += ';';
            console.log(`query: ${queryString}`);
        }
        
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

export async function updateSubscriber() {
    // TO DO:
}

export async function deleteSubscriberById(id){
    if (!id || typeof id != "number") {
        return NOT_FOUND;
    }
    // TO DO:
    const client = await pool.connect();
    try {
        const queryString = `DELETE FROM subscriber WHERE id = ${id};`;
        console.log(queryString);
        let {rows} = client.query(queryString);
        console.log(rows);
        return rows;
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
export async function insertSubMeasurements() {
    // TO DO:
}

export async function selectSubMeasurements() {
    // TO DO:
}

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