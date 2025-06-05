"use strict";
import * as DBF from '../DBFunc.js';

const CONFIRMATION = 'confirmation_code', UPDATE = 'update_code', UNSUBSCRIBE = 'unsubscribe_code', PENDING = 'pending_update';
export const deleteExpiredConfirmationCodes = deleteExpired.bind(null, CONFIRMATION, DBF.selectExpiredConfirmationCodes, DBF.deleteSubscriberById);
export const deleteExpiredUpdateCodes = deleteExpired.bind(null, UPDATE, DBF.selectExpiredUpdateCodes, DBF.deleteUpdateCodeByCode);
export const deleteExpiredUnsubscribeCodes = deleteExpired.bind(null, UNSUBSCRIBE, DBF.selectExpiredUnsubscribeCodes, DBF.deleteUnsubscribeCodeByCode);
export const deleteExpiredPendingUpdates = deleteExpired.bind(null, PENDING, DBF.selectExpiredPendingUpdates, DBF.deletePendingUpdateByCode);

// Get array of expired records and delete them from database
// Confirmation codes delete all subscriber-related records from database by subId while all others delete single records by code
async function deleteExpired(table, selectFunc, deleteFunc) {
    console.log(`Deleting expired records from ${table} table at ${new Date()}`);
    let numDeleted = 0;

    const records = await selectFunc();
    for (let record of records) {
        console.log(record);
        let field = ( table === CONFIRMATION? Number(record.sub_id) : Number(record.code) );
        let deleted = await deleteFunc(field);
        if (deleted) {
            numDeleted++;
        }
    }

    console.log(`Number of ${table} records deleted: ${numDeleted}`);
}