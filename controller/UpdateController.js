"use strict";

import * as DBF from '../model/DBFunc.js';
import { convertToDBFormat, convertToInputFormat } from './FormatConverter.js';

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