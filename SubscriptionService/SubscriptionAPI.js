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

import * as DBF from './DBFunc.js';
import * as Emailer from './Emailer.js';

const ERROR = null;
const EMAIL_CONFIRMATION = 'email confirmation', UPDATE_CONFIRMATION = 'update_confirmation';
const CONFIRMATION_CODE = 'confirmation_code', UPDATE_CODE = 'update_code', UNSUBSCRIBE_CODE = 'unsubscribe_code';
const usersToHandle = [];
const unsubscribeRequests = []; // {subId, unsubscribeCode}
const scheduledEmails = []; 
const handleUsersIntervalId = setInterval(handleUsers, 30000); // Handle users every 30 seconds.
const sendEmailIntervalId = setInterval(sendEmails, 60000); // Send emails once a minute.

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

// If a subscriber exists with the given email and is confirmed, create unsubscribe_code, schedule an email, return true.
// If no subscriber exists or if there is already an associated unsubscribe_code, return false.
export async function createUnsubscribeRequest(email) {
    const sub = await DBF.selectSubscriberByEmail(email);
    if (!sub || !sub.confirmed) {
        return false;
    }
    const subId = Number(sub.id);
    
    const unsubscribeCode = await DBF.insertUnsubscribeCode(subId);
    if (!unsubscribeCode) {
        return false;
    }
    
    const unsubRequest = {
        subId: subId,
        unsubscribeCode: unsubscribeCode.code
    };
    unsubscribeRequests.push(unsubRequest);
    console.log('UNSUB REQUESTS: ', unsubscribeRequests); // *** DELETE
    return true;
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
    console.log('updated record: ', updated); // *** DELETE
    return (updated ? true : false);
}

// Confirms subscriber's status and returns true/false depending on result
export async function confirmUser(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const confirmed = await DBF.confirmSubscriber(id);
    return (confirmed ? true : false);
}

// Unsubscribes user and returns true/false depending on result.
export async function unsubscribe(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const deleted = await DBF.deleteSubscriberById(id);
    return (deleted ? true : false);
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
        let schedEm;

        const existingSub = await DBF.selectSubscriberByEmail(user.email);
        if (existingSub) {
            let subId = Number(existingSub.id);
            let success;
            if (existingSub.confirmed) { // Confirmed Subscriber
                success = await DBF.updateConfirmedSubscriber(subId, user);
                if (success) {
                    schedEm = {
                        id: subId,
                        type: UPDATE_CONFIRMATION,
                        subscriber: user
                    };
                }
            }
            else { // Pending Subscriber
                success = await DBF.updatePendingSubscriber(subId, user);
                if (success) {
                    schedEm = {
                        id: subId,
                        type: EMAIL_CONFIRMATION,
                        subscriber: user
                    };
                }
            }
        }
        else { // New Subscriber
            const id = await DBF.subscribe(user);
            if (id) {
                schedEm = {
                    id: id,
                    type: EMAIL_CONFIRMATION,
                    subscriber: user
                };
            }
        }

        if (schedEm) {
            scheduledEmails.push(schedEm);
        }
    }
}

// Send emails in batches
function sendEmails() { // *** TO DO
    console.log(`Sending emails at ${new Date()}:`, scheduledEmails);
    
    while (scheduledEmails.length > 0) {
        let schedEm = scheduledEmails.pop();
        //console.log(schedEm);
        /* *** TO DO: send email, log email in database
        const recipient = schedEm.subscriber.email;
        const category = schedEm.type;
        */
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