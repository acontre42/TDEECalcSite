// Subscription Service?
// - Prepares data to pass back and forth between server.js and DBFunc.js
// - Holds interval ids for subscribing users and sending emails. Makes note of emails being sent out
"use strict";
import dotenv from 'dotenv'; 
import {fileURLToPath} from 'url'; 
import path from 'path'; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//console.log(__dirname, __filename);
dotenv.config({
    override: true,
    path: path.join(__dirname, '/development.env')
});

import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.TEST_USER,
        pass: process.env.TEST_PASS
    }
});

import * as DBF from './DBFunc.js';

const ERROR = null;
const EMAIL_CONFIRMATION = 'email confirmation', UPDATE_CONFIRMATION = 'update_confirmation';
const usersToHandle = [];
const scheduledEmails = []; 
const handleUsersIntervalId = setInterval(handleUsers, 30000); // Handle users every 30 seconds.
const sendEmailIntervalId = setInterval(sendEmails, 60000); // Send emails once a minute.

// Add user to usersToHandle array and send message back if no errors 
// Returns a string to be displayed to user
export async function addUser(user) {
    const errorMessage = `There was an error while attempting to subscribe. Please try again later.`;
    if (!user || !user.age || !user.sex || !user.email || !user.freq || !user.measurement_sys || !user.est_bmr || !user.est_tdee) {
        return errorMessage;
    }

    const dbuser = convertToDBFormat(user);
    if (!dbuser) {
        return errorMessage;
    }
    else {
        usersToHandle.push(dbuser);
        let message = `A confirmation email will be sent to ${dbuser.email}.`;
        return message;
    }
}

// Convert weight and height measurements into height_value and weight_value to match database fields
function convertToDBFormat(user) {
    let sub = {...user};

    switch (user.measurement_sys) {
        case 'imperial':
            if (!user.feet || (!user.inches && user.inches !== 0) || !user.lbs) {
                return ERROR;
            }
            sub.weight_value = user.lbs;
            sub.height_value = (user.feet * 12) + user.inches;
            break;
        case 'metric':
            if (!user.cm || !user.kg) {
                return ERROR;
            }
            sub.weight_value = user.kg;
            sub.height_value = user.cm;
            break;
        default:
            return ERROR;
    }

    return sub;
}

// Convert height_value and weight_value into metric or imperial units
function convertFromDBFormat(sub) {
    // *** TO DO
    let user; // = {...sub};
    switch (sub.measurement_sys) {
        case 'imperial':
            user.feet = Math.floor(sub.height_value / 12);
            user.inches = sub.height_value % 12;
            user.lbs = sub.weight_value;
            break;
        case 'metric':
            user.cm = sub.height_value;
            user.kg = sub.weight_value;
            break;
        default:
            return ERROR;
    }

    return user;
}

// Check if user already in database.
// If confirmed, create pending_update. Schedule new update confirmation email.
// If pending, update subscriber_measurements and confirmation_code. Schedule new confirmation email.
// If not in database, subscribe. Schedule new confirmation email.
async function handleUsers() {
    while (usersToHandle.length > 0) {
        const user = usersToHandle.pop();
        let schedEm;

        const existingSub = await DBF.selectSubscriberByEmail(user.email);
        if (existingSub) {
            if (existingSub.confirmed) {
                // *** TO DO
            }
            else {
                // *** TO DO
            }
        }
        else {
            const id = await DBF.subscribe(user);
            if (id) {
                schedEm = {
                    id: id,
                    type: EMAIL_CONFIRMATION,
                    subscriber: user
                };
                scheduledEmails.push(schedEm);
            }
        }
    }
}

// Send emails in batches
function sendEmails() {
    console.log(`Sending emails at ${new Date()}`);
    
    while (scheduledEmails.length > 0) {
        let schedEm = scheduledEmails.pop();
        console.log(schedEm);
        /*
        const recipient = schedEm.subscriber.email;
        const category = schedEm.type;
        let emailSubject;
        let emailContents;
        if (schedEm.type === EMAIL_CONFIRMATION) {
            // TO DO
            emailSubject = 'Please confirm your email to receive TDEE reminders';
            emailContents = ``;
        }
        else if (schedEm.type === UPDATE_CONFIRMATION) {
            // TO DO
            emailSubject = 'Please confirm your updated measurements';
            emailContents = ``;
        }
        else {
            // TO DO
        }

        let mailOptions = {
            from: process.env.TEST_USER,
            to: process.env.TEST_USER,
            subject: emailSubject,
            text: emailContents
        };
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log(`Verification email sent to ${recipient}`);
                console.log(`Response: ${info.response}`);
                const res = await DBF.insertEmailSent(category, recipient, emailSubject, emailContents);
                if (!res) {
                    // TO DO
                }
            }
        });
        */
    }
    
}
