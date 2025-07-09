"use strict";
import * as DBF from '../../model/DBFunc.js';
import * as Emailer from '../../model/Emailer.js';
import fs from 'fs';
const LOG_FILE_PATH = './logs/scheduling_errors.txt';

// Responsible for inserting update_code, sending email, and updating scheduled_reminder.
export async function scheduleReminders() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    console.log(`Handling scheduled_reminders at ${today.toLocaleString()}`);

    const EMAIL_CATEGORY = Emailer.UPDATE_REMIND;
    const todaysReminders = await DBF.selectScheduledReminderByDate(month, day, year);
    if (!todaysReminders) {
        return;
    }

    for (let reminder of todaysReminders) {
        let subId = Number(reminder.sub_id);

        let subscriber = await DBF.selectSubscriberById(subId);
        // If there is an error getting subscriber from database, it can be handled in the next go-around
        if (!subscriber) {
            continue;
        }

        // If updateCode already exists, previous email attempt or update schedule_reminder attempt failed or else date would've been updated.
        // If it doesn't, insert a new updateCode.
        let updateCode = await DBF.selectUpdateCodeBySubId(subId);
        if (!updateCode) {
            updateCode = await DBF.newUpdateCode(subId);
        }
        
        if (!updateCode) {
            continue;
        }
        
        // If error sending email, it can hopefully be sent in next go around
        let emailSent = await Emailer.sendEmail(EMAIL_CATEGORY, subscriber.email, subId, Number(updateCode.code));
        if (!emailSent) {
            continue;
        }

        // If everything successful up to this point, we can update scheduled_reminder's date_scheduled to the date of the next reminder.
        let updatedSchedule = await DBF.updateScheduledReminder(subId);
        if (!updatedSchedule) {
            let sched_err = {
                sub_id: subId,
                update_code: Number(updateCode.code),
                date_reminder_sent: new Date()
            };
            fs.appendFile(LOG_FILE_PATH, `${JSON.stringify(sched_err)}\n`, function (err) {
                if (err) {
                    console.log('ERROR WHILE LOGGING SCHEDULING ERROR INSIDE SCHEDULER.JS');
                }
            });
        }
        
    }
}