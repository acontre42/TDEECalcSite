"use strict";

import * as Delete from './handlers/Delete.js';
import * as Scheduler from './handlers/Scheduler.js';

const ONE_MIN = 60000, THIRTY_MIN = 1800000, ONE_HOUR = 3600000;

// INTERVAL IDs
const handleSchedulerId = setInterval(Scheduler.scheduleReminders, ONE_HOUR); // Check/schedule reminders every hour.
const deleteConfirmationId = setInterval(Delete.deleteExpiredConfirmationCodes, THIRTY_MIN); // Check/delete expired confirmation_codes every hour.
const deleteUpdateId = setInterval(Delete.deleteExpiredUpdateCodes, THIRTY_MIN); // Check/delete expired update_codes every hour.
const deletePendingId = setInterval(Delete.deleteExpiredPendingUpdates, ONE_MIN); // Check/delete expired pending_updates every minute.
const deleteUnsubscribeId = setInterval(Delete.deleteExpiredUnsubscribeCodes, ONE_MIN); // Check/delete expired unsubscribe_codes every minute.

// CONSOLE.LOG INFO
console.log(`Background Task \t / \t Interval
    handleScheduler \t \t ${ONE_HOUR / ONE_MIN} min
    deleteConfirmation \t \t ${THIRTY_MIN / ONE_MIN} min
    deleteUpdate \t \t ${THIRTY_MIN / ONE_MIN} min
    deletePending \t \t ${ONE_MIN / ONE_MIN} min
    deleteUnsubscribe \t \t ${ONE_MIN / ONE_MIN} min`);