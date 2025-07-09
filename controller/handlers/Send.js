"use strict";
import * as Emailer from '../../model/Emailer.js';

export async function sendConfirmationEmail(requests) {
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const EMAIL_CATEGORY = Emailer.EMAIL_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, confirmationCode} = request;
        if (!email || !subId || !confirmationCode) {
            continue;
        }

        await Emailer.sendEmail(EMAIL_CATEGORY, email, subId, confirmationCode);
    }
}

export async function sendPendingEmail(requests) {
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const EMAIL_CATEGORY = Emailer.UPDATE_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, pendingCode} = request;
        if (!email || !subId || !pendingCode) {
            continue;
        }

        await Emailer.sendEmail(EMAIL_CATEGORY, email, subId, pendingCode);
    }
}

// Handles unsubscribeRequests by sending unsubscribe confirmation emails
export async function sendUnsubscribeEmail(requests) {
    if (!requests || !Array.isArray(requests)) {
        return;
    }

    const EMAIL_CATEGORY = Emailer.UNSUB_CONFIRM;

    while (requests.length > 0) {
        let request = requests.pop();
        let {email, subId, unsubscribeCode} = request;
        if (!email || !subId || !unsubscribeCode) {
            continue;
        }

        await Emailer.sendEmail(EMAIL_CATEGORY, email, subId, unsubscribeCode);
    }
}