// Emailer.js composes emails depending on the category, sends them out, and logs them into database.
"use strict"; 

import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({
    override: true,
    path: path.join(__dirname, '../development.env')
});

import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.TEST_USER,
        pass: process.env.TEST_PASS
    }
});

import * as fs from 'fs';
const LOG_FILE_PATH = './logs/unlogged_emails.txt';

import * as DBF from './DBFunc.js';

// GLOBAL VARIABLES
export const EMAIL_CONFIRM = 'email confirmation', 
            UPDATE_CONFIRM = 'update confirmation', 
            UNSUB_CONFIRM = 'unsubscribe', 
            UPDATE_REMIND = 'reminder';
const BASE_URL = `http://localhost:3000/public/`; // ***

// FUNCTIONS
// (To be called by other email functions) Actually sends email. Returns true/false depending on outcome.
async function send(email) {
    if (!email) {
        return false;
    }

    let mailOptions = {
        from: process.env.TEST_USER,
        to: process.env.TEST_USER,      // *** TO DO: change to email.recipient in future
        subject: email.subject,
        text: email.contents
    };

    let success;
    transporter.sendMail(mailOptions, async function(error, info) {
        if (error) {
            console.log(error);
            success = false;
        }
        else {
            const logged = await DBF.insertEmailSent(email);
            if (!logged) {
                const logString = `${new Date()} \n ${JSON.stringify(email)} \n-\n`;
                fs.appendFile(LOG_FILE_PATH, logString, function (err) {
                    if (err) {
                        console.log(`Failed to log email in both database and log file. \nEmail: ${email}`);
                    }
                    else {
                        console.log('Logged email in log file');
                    }
                });
            }
            console.log(`Verification email sent to ${email.recipient}`);
            console.log(`Response: ${info.response}`);
            success = true;
        }
    });

    return success;
}

// Retrieves correct email template and calls send function. Returns true/false.
export async function sendEmail(category, recipient, subId, code) {
    if (!category || !recipient || !subId || !code) {
        return false;
    }

    let email = composeEmail(category, subId, code);

    if (!email) {
        console.log('Error creating email'); // *** DELETE
        return false;
    }
    else {
        email.recipient = recipient;
        email.category = category;
        console.log(email); // *** DELETE
        return true; // *** DELETE

        //return send(email);
    }
}

// Return email of desired category
function composeEmail(category, subId, code) {
    const UNSUBSCRIBE_URL = BASE_URL + 'unsubscribe';
    const UNSUBSCRIBE_INFO = `\nTo stop receiving emails, please follow instructions at ${UNSUBSCRIBE_URL}`;

    let link = BASE_URL;
    let email = {};
    switch (category) {
        case EMAIL_CONFIRM:
            link += `confirm/user/${subId}/${code}`;
            email.subject = `Please confirm your email to start receiving reminders!`;
            email.contents = `To begin receiving reminders to update your BMR/TDEE, please confirm your email at ${link} `;
            email.contents += `\n\n This confirmation link will expire in 7 days.`;
            break;
        case UPDATE_CONFIRM:
            link += `confirm/update/${subId}/${code}`;
            email.subject = `Were you trying to update your measurements?`;
            email.contents = `To view and approve these pending changes, click here: ${link} `;
            email.contents += `\n\n This confirmation link will expire in 30 minutes. If you did not request this change, please ignore this email. `
            email.contents += UNSUBSCRIBE_INFO;
            break;
        case UPDATE_REMIND:
            link += `update/${subId}/${code}`;
            email.subject = `It's time to update your measurements!`;
            email.contents = `To update your previously saved measurements and calculate a new BMR/TDEE, please click here: ${link} `;
            email.contents += `\n\n This link will expire in 7 days or once you click the 'Save' button. `
            email.contents += `However, measurements can be manually updated at any time by entering your email on the homepage after using the calculator.`
            email.contents += UNSUBSCRIBE_INFO;
            break;
        case UNSUB_CONFIRM:
            link += `unsubscribe/${subId}/${code}`;
            email.subject = `Please confirm you would like to unsubscribe from receiving reminders`;
            email.contents = `To stop receiving reminders from us, click here: ${link} `;
            email.contents += `\n\n This link will expire in 30 minutes. If you did not request this, please ignore this email.`;
            break;
        default: return null;
    }

    return email;
}