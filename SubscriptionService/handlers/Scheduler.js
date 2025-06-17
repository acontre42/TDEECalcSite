"use strict";
import * as DBF from '../DBFunc.js';
import * as Emailer from '../Emailer.js';

// Responsible for inserting update_code, sending email, and updating scheduled_reminder.
export async function scheduleReminders() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    console.log(`Handling scheduled_reminders at ${today}`); // *** DELETE

    const EMAIL_CATEGORY = Emailer.UPDATE_REMIND;
    const todaysReminders = await DBF.selectScheduledReminderByDate(month, day, year);
    if (!todaysReminders) {
        console.log('No reminders');
        return;
    }
    
    for (let reminder of todaysReminders) {
        // *** TO DO: get subId, get subscriber, insert updateCode, send reminder email, schedule new reminder
        let subId = Number(reminder.sub_id);

        let subscriber = await DBF.selectSubscriberById(subId);
        if (!subscriber) {
            // If there is an error getting subscriber from database, it can be handled in the next go-around
            console.log('ERROR SELECTING USER INSIDE SCHEDULER.JS');
            continue;
        }

        // If updateCode already exists, previous email attempt or update schedule_reminder attempt failed or else date would've been updated.
        // If it doesn't, insert a new updateCode.
        let updateCode = await DBF.selectUpdateCodeBySubId(subId);
        if (!updateCode) {
            updateCode = await DBF.newUpdateCode(subId);
        }
        
        if (!updateCode) {
            console.log('ERROR INSERTING NEW UPDATE_CODE INSIDE SCHEDULER.JS');
            continue;
        }
        console.log(EMAIL_CATEGORY, subscriber.email, subId, updateCode.code); // *** DELETE
        let emailSent = await Emailer.sendEmail(EMAIL_CATEGORY, subscriber.email, subId, Number(updateCode.code));
        if (!emailSent) {
            console.log('ERROR SENDING EMAIL FROM WITHIN SCHEDULER.JS');
            continue;
        }

        // If everything successful up to this point, we can update scheduled_reminder's date_scheduled to the date of the next reminder.
        let updatedSchedule = await DBF.updateScheduledReminder(subId);
        if (!updatedSchedule) {
            // *** TO DO: log?
            console.log('ERROR UPDATING SCHEDULED_REMINDER INSIDE SCHEDULER.JS');
        }

    }
}