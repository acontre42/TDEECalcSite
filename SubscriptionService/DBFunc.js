"use strict";

import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({
    override: true,
    path: path.join(__dirname, '../development.env')
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
const CONFIRM_C = 'confirmation_code', UPDATE_C = 'update_code', UNSUB_C = 'unsubscribe_code', PENDING_U = 'pending_update'; // Types of codes that can be generated

// TESTING FUNCTIONS
// When testing, call inside afterAll()
export async function endPool() {
    await pool.end();
}
// Truncate tables in test database after tests
export async function truncateTestTables() {
    if (process.env.TESTING) {
        const client = await pool.connect();
        try {
            let query = 'TRUNCATE TABLE subscriber RESTART IDENTITY CASCADE;';
            await client.query(query);
            query = 'TRUNCATE TABLE email_sent;';
            await client.query(query);
            console.log('Tables in test database truncated, subscriber identity restarted');
        }
        catch (err) {
            console.log(err);
        }
        finally {
            client.release();
        }
    }
    else {
        console.log('Error: truncateTestTables function only available during TESTING');
    }
}

// TRANSACTION BLOCK FUNCTIONS
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
        await client.query('BEGIN'); // Start transaction block
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
        let code = await generateCode(CONFIRM_C);
        if (!code) {
            throw new Error('Error generating available confirmation code.');
        }
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
// Update subscriber confirmed to true, set date_confirmed, delete confirmation_code, insert scheduled_reminder.
// Returns true/false based on success of transaction block.
export async function confirmSubscriber(id) {
    const user = await selectSubscriberById(id);
    if (!user) {
        console.log(`No user exists with id: ${id}`);
        return false;
    }
    else if (user.confirmed == true) {
        console.log(`User with id ${user.id} already confirmed. Date confirmed: ${user.date_confirmed}`);
        return false;
    }
    else {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            // Confirm subscriber
            let query = {
                text: 'UPDATE subscriber SET confirmed = true, date_confirmed = CURRENT_TIMESTAMP WHERE id = $1;',
                values: [id]
            };
            await client.query(query);
            // Delete confirmation_code
            query = {
                text: 'DELETE FROM confirmation_code WHERE sub_id = $1;',
                values: [id]
            };
            await client.query(query);
            // Create scheduled_reminder
            const numDays = await getFreqNumDays(Number(user.freq_id));
            query = {
                text: `INSERT INTO scheduled_reminder (sub_id, date_scheduled) VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '${numDays} days');`,
                values: [id]
            }
            await client.query(query);
            await client.query("COMMIT");
            return true;
        }
        catch (err) {
            console.log(err);
            await client.query("ROLLBACK");
            return false;
        }
        finally {
            client.release();
        }
    }
}
// Creates a pending_update which must be confirmed by subscriber via email
// Returns true/false
export async function updateConfirmedSubscriber(subId, newValues) {
    if (!subId || typeof subId !== 'number' || !newValues || typeof newValues !== 'object') {
        return false;
    }

    const pendingCode = await generateCode(PENDING_U);
    if (!pendingCode) {
        return false;
    }
    const {sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee} = newValues;

    const client = await pool.connect();
    try {
        // Insert pending_update
        const query = {
            text: `INSERT INTO pending_update (sub_id, code, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
            values: [subId, pendingCode, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee]
        };
        await client.query(query);
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
    finally {
        client.release();
    }
}
// Delete and replace subscriber_measurements and confirmation_code for pending subscriber in one transaction block.
// Returns true/false
export async function updatePendingSubscriber(subId, newValues) { 
    if (!subId || typeof subId !== 'number' || !newValues || typeof newValues !== 'object') {
        return false;
    }

    const {sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee} = newValues;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Delete old subscriber_measurements
        let query = {
            text: `DELETE FROM subscriber_measurements WHERE sub_id = $1;`,
            values: [subId]
        };
        await client.query(query);
        // Delete old confirmation_code
        query = {
            text: `DELETE FROM confirmation_code WHERE sub_id = $1;`,
            values: [subId]
        };
        await client.query(query);
        // Insert new subscriber_measurements
        query = {
            text: `INSERT INTO subscriber_measurements (sub_id, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee)
                    VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 );`,
            values: [subId, sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee]
        };
        await client.query(query);
        // Insert new confirmation_code
        const newCode = await generateCode(CONFIRM_C);
        query = {
            text: `INSERT INTO confirmation_code (sub_id, code) VALUES ($1, $2);`,
            values: [subId, newCode]
        };
        await client.query(query);
        await client.query('COMMIT');
        return true;
    }
    catch (err) {
        console.log(err);
        await client.query('ROLLBACK');
        return false;
    }
    finally {
        client.release();
    }
}
// Update subscriber_measurements using measurements from pending_update, then delete pending_update.
// Returns true/false
export async function confirmPendingUpdate(subId) {
    if (!subId || typeof subId != 'number') {
        return ERROR;
    }

    const updatedValues = await selectPendingUpdateBySubId(subId);
    if (!updatedValues) {
        console.log(`No pending_update exists for this subscriber id`);
        return NOT_FOUND;
    }

    const {sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee} = updatedValues;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Update measurements
        let query = {
            text: `UPDATE subscriber_measurements SET sex = $1, age = $2, measurement_sys = $3, weight_value = $4, height_value = $5, est_bmr = $6, est_tdee = $7, date_last_updated = CURRENT_TIMESTAMP WHERE sub_id = $8;`,
            values: [sex, age, measurement_sys, weight_value, height_value, est_bmr, est_tdee, subId]
        };
        await client.query(query);
        // Delete pending_update
        query = {
            text: `DELETE FROM pending_update WHERE sub_id = $1;`,
            values: [subId]
        };
        await client.query(query);
        await client.query('COMMIT');
        return true;
    }
    catch (err) {
        console.log(err);
        await client.query('ROLLBACK');
        return false;
    }
    finally {
        client.release();
    }
}

// SUBSCRIBER TABLE
// Select subscriber by email, id
async function selectSubscriber(column, value) {
    let query;
    let returnAll = false;
    if (!column && !value) {
        query = `SELECT * FROM subscriber;`; // By default, all are returned
        returnAll = true;
    }
    else if (column && value && typeof column === 'string') {
        let queryString;
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

        query = {
            text: queryString,
            values: [value]
        };
    }
    else {
        return NOT_FOUND;
    }
    
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        if (!rows[0]){
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
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
    let query;
    let returnAll = false;
    if (!column && !value) {
        query = `SELECT * FROM subscriber_measurements;`; // By default, all are returned
        returnAll = true;
    }
    else if (column && value && typeof column === 'string') {
        switch (column) { 
            case 'sub_id':
                if (typeof value === 'number') {
                    query = {
                        text: 'SELECT * FROM subscriber_measurements WHERE sub_id = $1;',
                        values: [value]
                    }
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
        const {rows} = await client.query(query);
        if (!rows[0]) {
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
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

// PENDING_UPDATE TABLE
export async function selectPendingUpdateBySubId(subId) {
    if (!subId || typeof subId != 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: `SELECT * FROM pending_update WHERE sub_id = $1;`,
            values: [subId]
        };
        const {rows} = await client.query(query);
        return (rows ? rows[0] : NOT_FOUND);
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
export async function selectPendingUpdateByCode(code) {
    if (!code || typeof code != 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: `SELECT * FROM pending_update WHERE code = $1;`,
            values: [code]
        };
        const {rows} = await client.query(query);
        return (rows ? rows[0] : NOT_FOUND);
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
// Delete pending_update by code and return number of rows deleted
export async function deletePendingUpdateByCode(code) { 
    if (!code || typeof code != 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: `DELETE FROM pending_update WHERE code = $1 RETURNING *;`,
            values: [code]
        };
        const {rows} = await client.query(query);
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

// CONFIRMATION_CODE TABLE
async function selectConfirmationCode(column, value) {
    let query;
    let returnAll = false;
    if (!column && !value) { // By default, return all 
        query = 'SELECT * FROM confirmation_code;';
        returnAll = true;
    }
    else if (column && value && typeof column == 'string') {
        let queryString;
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

        query = {
            text: queryString,
            values: [value]
        };
    }
    else {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        if (!rows[0]) {
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
        }
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
            text: `UPDATE confirmation_code SET code = $1, date_created = CURRENT_TIMESTAMP, date_expires = (CURRENT_TIMESTAMP + INTERVAL '7 days') WHERE sub_id = $2 RETURNING *;`,
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

// UPDATE_CODE TABLE
// If no update_code exists for a sub id, insert a new record. If an older code exists, update record.
// Returns record if successful or null if not.
export async function newUpdateCode(subId) {
    if (!subId) {
        return ERROR;
    }

    const newCode = await generateCode(UPDATE_C);
    if (!newCode) {
        return ERROR;
    }

    let query;
    const oldCode = await selectUpdateCodeBySubId(subId);
    if (!oldCode) {
        query = {
            text: 'INSERT INTO update_code (sub_id, code) VALUES ($1, $2) RETURNING *;',
            values: [subId, newCode]
        };
    }
    else {
        query = {
            text: `UPDATE update_code SET code = $1, date_created = CURRENT_TIMESTAMP, date_expires = (CURRENT_TIMESTAMP + INTERVAL '7 days') WHERE sub_id = $2 RETURNING *;`,
            values: [newCode, subId]
        };
    }

    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        return rows[0];
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
async function selectUpdateCode(column, value) {
    let query;
    let returnAll = false;
    if (!column && !value) { // By default, return all 
        query = 'SELECT * FROM update_code;';
        returnAll = true;
    }
    else if (column && value && typeof column == 'string') {
        let queryString;
        switch (column) {
            case 'code':
                queryString = 'SELECT * FROM update_code WHERE code = $1;';
                break;
            case 'sub_id':
                queryString = 'SELECT * FROM update_code WHERE sub_id = $1;';
                break;
            default:
                return NOT_FOUND;
        }

        query = {
            text: queryString,
            values: [value]
        };
    }
    else {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        if (!rows[0]) {
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
        }
    }
    catch (err) {
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
export async function selectUpdateCodeBySubId(subId) {
    const column = 'sub_id';
    return selectUpdateCode(column, subId);
}
export async function selectUpdateCodeByCode(code) {
    const column = 'code';
    return selectUpdateCode(column, code);
}
// Returns number of records deleted
export async function deleteUpdateCodeBySubId(subId) {
    if (!subId) {
        return ERROR;
    }

    const query = {
        text: 'DELETE FROM update_code WHERE sub_id = $1 RETURNING *;',
        values: [subId]
    };
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
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
export async function deleteUpdateCodeByCode(code) {
    if (!code) {
        return ERROR;
    }

    const query = {
        text: 'DELETE FROM update_code WHERE code = $1 RETURNING *;',
        values: [code]
    };
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
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

// UNSUBSCRIBE_CODE TABLE
// If there is no unsubscribe code currently associated with subId, insert a new one.
export async function insertUnsubscribeCode(subId) {
    if (!subId) {
        return ERROR;
    }

    const existingCode = await selectUnsubscribeCodeBySubId(subId);
    if (!existingCode) {
        const newCode = await generateCode(UNSUB_C);
        const query = {
            text: 'INSERT INTO unsubscribe_code (sub_id, code) VALUES ($1, $2) RETURNING *;',
            values: [subId, newCode]
        };
        const client = await pool.connect();
        try {
            const {rows} = await client.query(query);
            return (rows[0] ? rows[0] : ERROR);
        }
        catch (err) {
            console.log(err);
            return ERROR;
        }
        finally {
            client.release();
        }
    }
    else {
        return ERROR;
    }
    
}
async function selectUnsubscribeCode(column, value) {
    let query;
    let returnAll = false;
    if (!column && !value) { // By default, return all 
        query = 'SELECT * FROM unsubscribe_code;';
        returnAll = true;
    }
    else if (column && value && typeof column == 'string') {
        let queryString;
        switch (column) {
            case 'code':
                queryString = 'SELECT * FROM unsubscribe_code WHERE code = $1;';
                break;
            case 'sub_id':
                queryString = 'SELECT * FROM unsubscribe_code WHERE sub_id = $1;';
                break;
            default:
                return NOT_FOUND;
        }

        query = {
            text: queryString,
            values: [value]
        };
    }
    else {
        return NOT_FOUND;
    }

    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        if (!rows[0]) {
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
        }
    }
    catch (err) {
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
export async function selectUnsubscribeCodeBySubId(subId) {
    const column = 'sub_id';
    return selectUnsubscribeCode(column, subId);
}
export async function selectUnsubscribeCodeByCode(code) {
    const column = 'code';
    return selectUnsubscribeCode(column, code);
}
// Returns number of records deleted.
export async function deleteUnsubscribeCodeByCode(code) {
    if (!code || typeof code != 'number') {
        return ERROR;
    }

    const query = {
        text: 'DELETE FROM unsubscribe_code WHERE code = $1 RETURNING *;',
        values: [code]
    };
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
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

// SCHEDULED_REMINDER TABLE
export async function insertScheduledReminder(subId, numDays) {
    if (!subId || !numDays || typeof subId !== 'number' || typeof numDays !== 'number') {
        return ERROR;
    }

    const client = await pool.connect();
    try {
        const query = {
            text: `INSERT INTO scheduled_reminder (sub_id, date_scheduled) VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '${numDays} days') RETURNING *;`,
            values: [subId]
        };
        const {rows} = await client.query(query);
        return rows[0]; // Return scheduled_reminder
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
async function selectScheduledReminder(column, value) {
    let query;
    let returnAll = true;
    if (!column && !value) { // By default, return all 
        query = 'SELECT * FROM scheduled_reminder;';
    }
    else if (column && value && typeof column == 'string') {
        switch (column) {
            case 'date_scheduled':
                query = `SELECT * FROM scheduled_reminder WHERE date_scheduled >= ${value} AND date_scheduled < (${value} + INTERVAL '1 day');`;
                break;
            case 'sub_id':
                query = {
                    text: 'SELECT * FROM scheduled_reminder WHERE sub_id = $1;',
                    values: [value]
                };
                returnAll = false;
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
        const {rows} = await client.query(query);
        if (!rows[0]) {
            return NOT_FOUND;
        }
        else {
            return (returnAll ? rows : rows[0]);
        }
    }
    catch (err) {
        return NOT_FOUND;
    }
    finally {
        client.release();
    }
}
// Returns one reminder with matching sub_id
export async function selectScheduledReminderBySubId(subId) {
    const column = 'sub_id';
    return selectScheduledReminder(column, subId);
}
// Returns ALL reminders scheduled for the given date (month, day, year)
export async function selectScheduledReminderByDate(month, day, year) {
    const column = 'date_scheduled';
    let date;
    if (!month && !day && !year) { // By default, today's date
        const today = new Date();
        month = today.getMonth() + 1;
        day = today.getDate();
        year = today.getFullYear();
        date = `'${year}-${month}-${day}'::date`;
    }
    else if (!month || !day || !year) { // If date given, need a month, day and year
        console.log('Given dates must have a month, day, and year.');
        return ERROR;
    }
    else {
        if (typeof month !== 'number' || typeof day !== 'number' || typeof year != 'number') {
            return ERROR;
        }
        date = `'${year}-${month}-${day}'::date`;
    }
    return selectScheduledReminder(column, date);
}
// Update scheduled reminder based on subscriber's desired reminder frequency
export async function updateScheduledReminder(subId) {
    if (!subId || typeof subId !== 'number') {
        return ERROR;
    }

    const sub = await selectSubscriberById(subId);
    if (!sub) {
        return ERROR;
    }
    
    const freqId = Number(sub.freq_id);
    const numDays = await getFreqNumDays(freqId);
    const query = {
        text: `UPDATE scheduled_reminder SET date_scheduled = (CURRENT_TIMESTAMP + INTERVAL '${numDays} days') WHERE sub_id = $1 RETURNING *;`,
        values: [subId]
    };
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        return (rows[0] ? rows[0] : ERROR);
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}

// EMAIL_SENT TABLE
// Email should have category, recipient, subject, contents. If email is missing date_sent property, CURRENT_TIMESTAMP will be used as default.
export async function insertEmailSent(email) {
    if (!email || typeof email != 'object') {
        return ERROR;
    }

    const {date_sent, category, recipient, subject, contents} = email;
    if (!category || !recipient || !subject || !contents) {
        return ERROR;
    }

    let date;
    if (date_sent && date_sent instanceof Date) {
        const year = date_sent.getFullYear();
        const month = date_sent.getMonth() + 1;
        const day = date_sent.getDate();
        const hours = date_sent.getHours();
        const minutes = date_sent.getMinutes();
        const seconds = date_sent.getSeconds();
        date = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // 'yyyy-mm-dd hh:mm:ss'::timestamp
    }

    let query;
    if (date) {
        query = {
            text: `INSERT INTO email_sent (date_sent, category, recipient, subject, contents) VALUES ($1::timestamp, $2, $3, $4, $5) RETURNING *;`,
            values: [date, category, recipient, subject, contents]
        };
    }
    else {
        query = {
            text: `INSERT INTO email_sent (category, recipient, subject, contents) VALUES ($1, $2, $3, $4) RETURNING *;`,
            values: [category, recipient, subject, contents]
        };
    }
    
    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        return (rows ? rows[0] : ERROR);
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

// EXPIRED RECORDS
// Returns an array of codes or pending_updates that have passed their expiration date and need to be deleted.
async function selectExpiredRecords(type) {
    let query;
    switch (type) {
        case CONFIRM_C:
            query = `SELECT * FROM confirmation_code WHERE date_expires < CURRENT_TIMESTAMP;`;
            break;
        case UPDATE_C:
            query = `SELECT * FROM update_code WHERE date_expires < CURRENT_TIMESTAMP;`;
            break;
        case UNSUB_C:
            query = `SELECT * FROM unsubscribe_code WHERE date_expires < CURRENT_TIMESTAMP;`;
            break;
        case PENDING_U:
            query = `SELECT * FROM pending_update WHERE date_expires < CURRENT_TIMESTAMP;`;
            break;
        default: 
            return ERROR;
    }

    const client = await pool.connect();
    try {
        const {rows} = await client.query(query);
        return (rows ? rows : NOT_FOUND);
    }
    catch (err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}
export async function selectExpiredConfirmationCodes() {
    return selectExpiredRecords(CONFIRM_C);
}
export async function selectExpiredUpdateCodes() {
    return selectExpiredRecords(UPDATE_C);
}
export async function selectExpiredUnsubscribeCodes() {
    return selectExpiredRecords(UNSUB_C);
}
export async function selectExpiredPendingUpdates() {
    return selectExpiredRecords(PENDING_U);
}

// CODE GENERATION
const MIN_CODE = 10000000, MAX_CODE = 99999999, MAX_TRIES = 15;
// Generates code between 10000000 and 99999999 for confirmation purposes and checks its availability in database. 
// Returns either code or null.
async function generateCode(type) {
    let selectCodeFunction;
    switch (type) {
        case CONFIRM_C:
            selectCodeFunction = selectConfirmationCodeByCode;
            break;
        case UPDATE_C:
            selectCodeFunction = selectUpdateCodeByCode;
            break;
        case UNSUB_C:
            selectCodeFunction = selectUnsubscribeCodeByCode;
            break;
        case PENDING_U:
            selectCodeFunction = selectPendingUpdateByCode;
            break;
        default:
            return ERROR;
    }

    let code;
    let available;
    const client = await pool.connect();
    try {
        let tries = 1;
        do {
            code = Math.floor(Math.random() * (MAX_CODE - MIN_CODE + 1) + MIN_CODE);
            const res = await selectCodeFunction(code);
            available = (res ? false : true);
            tries++;
        } while (!available && tries <= MAX_TRIES);

        return ( available ? code : ERROR );
    }
    catch(err) {
        console.log(err);
        return ERROR;
    }
    finally {
        client.release();
    }
}