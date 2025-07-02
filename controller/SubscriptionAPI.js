// Subscription Service?
// - Prepares data to pass back and forth between server.js and DBFunc.js
// - Holds interval ids for subscribing users and sending emails. Makes note of emails being sent out
"use strict";
import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv'; 
dotenv.config({
    override: true,
    path: path.join(__dirname, '/development.env')
});

import * as DBF from '../model/DBFunc.js';
import * as Delete from './handlers/Delete.js';
import * as Send from './handlers/Send.js';
import * as Scheduler from './handlers/Scheduler.js';

const ERROR = null;
const THIRTY_SEC = 30000, ONE_MIN = 60000, THIRTY_MIN = 1800000, ONE_HOUR = 3600000;
const CONFIRMATION_CODE = 'confirmation_code', UPDATE_CODE = 'update_code', UNSUBSCRIBE_CODE = 'unsubscribe_code', PENDING_UPDATE = 'pending_update';
const usersToHandle = [];
const subRequests = []; // {email, subId, confirmationCode}
const pendingRequests = []; // {email, subId, pendingCode} 
// INTERVAL IDs
const handleUsersIntervalId = setInterval(handleUsers, THIRTY_SEC); // Handle users every 30 seconds.
const handleSubRequestsId = setInterval(() => Send.sendConfirmationEmail(subRequests), THIRTY_SEC); // Handle subRequests every minute.
const handlePendingReqId = setInterval(() => Send.sendPendingEmail(pendingRequests), ONE_MIN); // Handle pendingRequests every minute.
const handleSchedulerId = setInterval(Scheduler.scheduleReminders, ONE_HOUR); // Check/schedule reminders every hour.
const deleteConfirmationId = setInterval(Delete.deleteExpiredConfirmationCodes, THIRTY_MIN); // Check/delete expired confirmation_codes every hour.
const deleteUpdateId = setInterval(Delete.deleteExpiredUpdateCodes, THIRTY_MIN); // Check/delete expired update_codes every hour.
const deletePendingId = setInterval(Delete.deleteExpiredPendingUpdates, ONE_MIN); // Check/delete expired pending_updates every minute.
const deleteUnsubscribeId = setInterval(Delete.deleteExpiredUnsubscribeCodes, ONE_MIN); // Check/delete expired unsubscribe_codes every minute.

// Convert user to DB format, add them to usersToHandle array, and send message back if no errors 
// Returns a string to be displayed to user
export function addUser(user) {
    const errorMessage = `There was an error while attempting to subscribe. Please try again later.`;
    if (!user || !user.age || !user.sex || !user.email || !user.freq || !user.measurement_sys || !user.est_bmr || !user.est_tdee) {
        return errorMessage;
    }

    const dbuser = convertToDBFormat(user);
    if (!dbuser) {
        return errorMessage;
    }
    else {
        usersToHandle.push(dbuser);
        let message = `A confirmation email will be sent to ${dbuser.email}.`;
        return message;
    }
}

// Convert subscriber_measurements from DB format into input format for the TDEE calculator.
export async function getSubscriberMeasurements(id) {
    let measurements = await DBF.selectSubMeasurementsBySubId(id);
    if (!measurements) {
        return ERROR;
    }
    else {
        const userMeasurements = convertToInputFormat(measurements);
        return (userMeasurements ? userMeasurements : ERROR);
    }
}

// Convert pending_update measurements into input format and return them.
export async function getPendingMeasurements(id) {
    let measurements = await DBF.selectPendingUpdateBySubId(id);
    if (!measurements) {
        return ERROR;
    }
    else {
        const pendingMeasurements = convertToInputFormat(measurements);
        return (pendingMeasurements ? pendingMeasurements : ERROR);
    }
}

// Convert measurements into DB format and call updateSubMeasurements function. If successful, delete update_code.
// Return true/false based on result of updateSubMeasurements
export async function updateMeasurements(subId, measurements) {
    if (!subId || typeof subId != 'number' || !measurements || typeof measurements != 'object') {
        return false;
    }

    const dbMeasurements = convertToDBFormat(measurements);
    if (!dbMeasurements) {
        return false;
    }
    
    const updated = await DBF.updateSubMeasurements(subId, dbMeasurements);
    await DBF.deleteUpdateCodeBySubId(subId);
    return (updated ? true : false);
}

// Confirm pending update and return true/false depending on result
export async function confirmUpdate(subId) {
    if (!subId || typeof subId != 'number') {
        return false;
    }

    const confirmed = await DBF.confirmPendingUpdate(subId);
    return confirmed;
}

// Delete pending_update and return true/false depending on result.
export async function rejectUpdate(code) {
    if (!code || typeof code != 'number') {
        return false;
    }

    const deleted = await DBF.deletePendingUpdateByCode(code);
    return deleted;
}

// Confirms subscriber's status and returns true/false depending on result
export async function confirmUser(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const confirmed = await DBF.confirmSubscriber(id);
    return confirmed;
}

// CONVERSION FUNCTIONS
// Convert weight and height measurements into height_value and weight_value to match database fields
function convertToDBFormat(user) {
    let sub = {...user};

    switch (user.measurement_sys) {
        case 'imperial':
            if (!user.feet || (!user.inches && user.inches !== 0) || !user.lbs) {
                return ERROR;
            }
            sub.weight_value = user.lbs;
            sub.height_value = (user.feet * 12) + user.inches;
            break;
        case 'metric':
            if (!user.cm || !user.kg) {
                return ERROR;
            }
            sub.weight_value = user.kg;
            sub.height_value = user.cm;
            break;
        default:
            return ERROR;
    }

    return sub;
}

// Convert height_value and weight_value into metric or imperial units to match inputs
function convertToInputFormat(sub) {
    let user = {...sub};
    switch (sub.measurement_sys) {
        case 'imperial':
            user.feet = Math.floor(sub.height_value / 12);
            user.inches = sub.height_value % 12;
            user.lbs = sub.weight_value;
            break;
        case 'metric':
            user.cm = sub.height_value;
            user.kg = sub.weight_value;
            break;
        default:
            return ERROR;
    }

    return user;
}

// INTERVAL FUNCTIONS
// Check if user already in database.
// If confirmed, create pending_update. Schedule new update confirmation email.
// If pending, update subscriber_measurements and confirmation_code. Schedule new confirmation email.
// If not in database, subscribe. Schedule new confirmation email.
async function handleUsers() {
    console.log(`HANDLING USERS AT ${new Date()}:`, usersToHandle); // *** DELETE
    while (usersToHandle.length > 0) {
        const user = usersToHandle.pop();
        let request;

        const existingSub = await DBF.selectSubscriberByEmail(user.email);
        if (existingSub) {
            let subId = Number(existingSub.id);
            let success;
            if (existingSub.confirmed) { // Confirmed Subscriber
                success = await DBF.updateConfirmedSubscriber(subId, user);
                if (success) {
                    let pendingUpdate = await DBF.selectPendingUpdateBySubId(subId);
                    request = {
                        email: existingSub.email,
                        subId: subId,
                        pendingCode: Number(pendingUpdate.code)
                    };
                    pendingRequests.push(request);
                }
            }
            else { // Pending Subscriber
                success = await DBF.updatePendingSubscriber(subId, user);
                if (success) {
                    let confirmationCode = await DBF.selectConfirmationCodeBySubId(subId);
                    request = {
                        email: existingSub.email,
                        subId: subId,
                        confirmationCode: Number(confirmationCode.code)
                    };
                    subRequests.push(request);
                }
            }
        }
        else { // New Subscriber
            const id = await DBF.subscribe(user);
            if (id) {
                let confirmationCode = await DBF.selectConfirmationCodeBySubId(id);
                request = {
                    email: user.email,
                    subId: id,
                    confirmationCode: Number(confirmationCode.code)
                };
                subRequests.push(request);
            }
        }
    }
}

// VALIDATION FUNCTIONS
// Check if subscriber id exists in database. Returns true/false
export async function isValidId(id) {
    if (!id) {
        return false;
    }
    const user = await DBF.selectSubscriberById(id);
    return (user ? true : false);
}

// Check if code exists in corresponding table. Returns true/false
async function isValidCode(table, code) {
    if (!table || !code) {
        return false;
    }

    let result;
    switch (table) {
        case CONFIRMATION_CODE:
            result = await DBF.selectConfirmationCodeByCode(code);
            break;
        case UNSUBSCRIBE_CODE:
            result = await DBF.selectUnsubscribeCodeByCode(code);
            break;
        case UPDATE_CODE:
            result = await DBF.selectUpdateCodeByCode(code);
            break;
        case PENDING_UPDATE:
            result = await DBF.selectPendingUpdateByCode(code);
            break;
        default:
            return false;
    }

    return (result ? true : false);
}
export async function isValidConfirmationCode(code) {
    const table = CONFIRMATION_CODE;
    return isValidCode(table, code);
}
export async function isValidUnsubCode(code) {
    const table = UNSUBSCRIBE_CODE;
    return isValidCode(table, code);
}
export async function isValidUpdateCode(code) {
    const table = UPDATE_CODE;
    return isValidCode(table, code);
}
export async function isValidPendingCode(code) {
    const table = PENDING_UPDATE;
    return isValidCode(table, code);
}

// Check if code's sub_id matches given id. Returns true/false
async function codeBelongsToSubId(type, code, id) {
    if (!type || !code || !id) {
        return false;
    }

    let record;
    switch (type) {
        case CONFIRMATION_CODE:
            record = await DBF.selectConfirmationCodeByCode(code);
            break;
        case UPDATE_CODE:
            record = await DBF.selectUpdateCodeByCode(code);
            break;
        case UNSUBSCRIBE_CODE:
            record = await DBF.selectUnsubscribeCodeByCode(code);
            break;
        case PENDING_UPDATE:
            record = await DBF.selectPendingUpdateByCode(code);
            break;
        default: return false;
    }

    if (!record) {
        return false;
    }

    const subId = Number(record.sub_id);
    return (subId === id);
}
export async function confirmationCodeBelongsToSubId(code, id) {
    const type = CONFIRMATION_CODE;
    return codeBelongsToSubId(type, code, id);
}
export async function updateCodeBelongsToSubId(code, id) {
    const type = UPDATE_CODE;
    return codeBelongsToSubId(type, code, id);
}
export async function unsubscribeCodeBelongsToSubId(code, id) {
    const type = UNSUBSCRIBE_CODE;
    return codeBelongsToSubId(type, code, id);
}
export async function pendingCodeBelongsToSubId(code, id) {
    const type = PENDING_UPDATE;
    return codeBelongsToSubId(type, code, id);
}