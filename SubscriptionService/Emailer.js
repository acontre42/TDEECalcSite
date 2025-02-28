// Emailer.js composes emails depending on type and sends them out.
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

// GLOBAL VARIABLES
export const EMAIL_CONFIRM = 'email confirmation', 
            UPDATE_CONFIRM = 'update confirmation', 
            UNSUB_CONFIRM = 'unsubscribe', 
            UPDATE_REMIND = 'reminder';
const BASE_URL = `${process.env.HOST}/public/`;

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
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            success = false;
        }
        else {
            console.log(`Verification email sent to ${email.recipient}`);
            console.log(`Response: ${info.response}`);
            success = true;
        }
    });

    return success;
}

// To be called by SubscriptionAPI.js
// Sets up email details and calls send function. Returns true/false.
export async function sendEmail(type, recipient, subId, code) {
    if (!type || !recipient || !subId || !code) {
        return false;
    }

    const UNSUBSCRIBE_LINK = BASE_URL + 'unsubscribe';
    const UNSUBSCRIBE_INFO = `\nTo stop receiving emails, please follow instructions at ${UNSUBSCRIBE_LINK}`;
    let email = {
        recipient: recipient
    };
    let link = BASE_URL;
    let extraInfo;
    switch(type) {
        case EMAIL_CONFIRM:
            link += `confirm/user/${subId}/${code}`;
            extraInfo = `This confirmation link will expire in 7 days`;

            email.subject = `Please confirm your email to start receiving BMR/TDEE update reminders!`;
            email.contents = `To begin receiving reminders to update your BMR/TDEE, please confirm your email at ${link} `;
            email.contents += `\n\n ${extraInfo}`;
            break;
        case UPDATE_CONFIRM:
            link += `confirm/update/${subId}/${code}`;
            extraInfo = `This confirmation link will expire in 30 minutes. If you did not request this change, please ignore this email.`;
            extraInfo += UNSUBSCRIBE_INFO;

            email.subject = `Were you trying to update your measurements?`;
            email.contents = ``; // *** TO DO
            break;
        case UPDATE_REMIND:
            link += `update/${subId}/${code}`;
            extraInfo = `This link will expire once you save your updated measurements by clicking on the 'Save' button. `
            extraInfo += `If you would like to change your saved measurements, you can do so at any time by manually entering your email on the homepage.`;
            extraInfo += UNSUBSCRIBE_INFO;

            email.subject = `It's time to update your measurements!`;
            email.contents = ``; // *** TO DO
            break;
        case UNSUB_CONFIRM:
            link += `unsubscribe/${subId}/${code}`;
            extraInfo = `This link will expire in 30 minutes. If you did not request this, please ignore this email.`;

            email.subject = `Please confirm you would like to unsubscribe from receiving reminders`;
            email.contents = `To stop receiving reminders from us, click here: ${link} `;
            email.contents += `\n\n ${extraInfo}`
            break;
        default: email = {};
    }

    if (!email) {
        console.log('Error creating email'); // *** DELETE

        return false;
    }
    else {
        console.log(`To: ${email.recipient}, Subject: ${email.subject}, Contents: ${email.contents}`); // *** DELETE
        return true; // *** DELETE

        //return send(email);
    }
}