"use strict";
import * as Emailer from '../Emailer.js';

export async function sendConfirmationEmail(requests) {
    console.log('HANDLING SUB REQUESTS'); // *** DELETE
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const TYPE = Emailer.EMAIL_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, confirmationCode} = request;
        if (!email || !subId || !confirmationCode) {
            continue;
        }

        await Emailer.sendEmail(TYPE, email, subId, confirmationCode);
    }
}

export async function sendPendingEmail(requests) {
    console.log('HANDLING PENDING REQUESTS'); // *** DELETE
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const TYPE = Emailer.UPDATE_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, pendingCode} = request;
        if (!email || !subId || !pendingCode) {
            continue;
        }

        await Emailer.sendEmail(TYPE, email, subId, pendingCode);
    }
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