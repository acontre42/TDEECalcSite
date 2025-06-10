"use strict";
import * as Emailer from '../Emailer.js';

export async function sendConfirmationEmail(requests) {
    // *** TO DO
}

export async function sendPendingEmail(requests) {
    // *** TO DO
}

// Handles unsubscribeRequests by sending unsubscribe confirmation emails
export async function sendUnsubscribeEmail(requests) {
    console.log('HANDLING UNSUB REQUESTS'); // *** DELETE
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const TYPE = Emailer.UNSUB_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, unsubscribeCode} = request;
        if (!email || !subId || !unsubscribeCode) {
            continue;
        }

        await Emailer.sendEmail(TYPE, email, subId, unsubscribeCode);
    }
}