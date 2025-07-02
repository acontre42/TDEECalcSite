"use strict";

import * as DBF from '../model/DBFunc.js';

// TABLE NAMES
const CONFIRMATION_CODE = 'confirmation_code', 
    UPDATE_CODE = 'update_code', 
    UNSUBSCRIBE_CODE = 'unsubscribe_code', 
    PENDING_UPDATE = 'pending_update';

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