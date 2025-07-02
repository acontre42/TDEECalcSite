"use strict";

import * as DBF from '../model/DBFunc.js';
import * as Send from './handlers/Send.js';
import { convertToDBFormat } from './FormatConverter.js';

const usersToHandle = [];
const subRequests = []; // {email, subId, confirmationCode}
const pendingRequests = []; // {email, subId, pendingCode} 

const THIRTY_SEC = 30000, ONE_MIN = 60000;

// INTERVAL IDS
const handleUsersIntervalId = setInterval(handleUsers, THIRTY_SEC); // Handle users every 30 seconds.
const handleSubRequestsId = setInterval(() => Send.sendConfirmationEmail(subRequests), THIRTY_SEC); // Handle subRequests every minute.
const handlePendingReqId = setInterval(() => Send.sendPendingEmail(pendingRequests), ONE_MIN); // Handle pendingRequests every minute.

// Convert user to DB format, add them to usersToHandle array, and returns a string to be displayed to user
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

// Confirms subscriber's status and returns true/false depending on result
export async function confirmUser(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const confirmed = await DBF.confirmSubscriber(id);
    return confirmed;
}

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