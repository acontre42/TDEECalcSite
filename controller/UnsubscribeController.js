"use strict";

import * as DBF from '../model/DBFunc.js';
import { sendUnsubscribeEmail } from './handlers/Send.js';

const unsubRequests = []; // {email, subId, unsubscribeCode} 

const ONE_MIN = 60000;
const handleUnsubReqId = setInterval(() => sendUnsubscribeEmail(unsubRequests), ONE_MIN); // Handle unsubRequests every minute.

// CONSOLE.LOG INFO
console.log(`UnsubscibeController Task / \t Interval
    handleUnsubReq \t \t ${ONE_MIN / 1000} sec`);

// FUNCTIONS
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
    
    const request = {
        email: sub.email,
        subId: subId,
        unsubscribeCode: Number(unsubscribeCode.code)
    };
    unsubRequests.push(request);
    
    return true;
}

// Unsubscribes user and returns true/false depending on result.
export async function unsubscribe(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const deleted = await DBF.deleteSubscriberById(id);
    return (deleted ? true : false);
}