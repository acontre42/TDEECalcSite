"use strict";
import * as Misc from './MiscFunc.js';

const UNSUB_DIV = document.getElementById("unsubDiv");
const EMAIL_INPUT = document.getElementById("email");
const CONFIRMATION_DIV = document.getElementById("confirmationDiv");
const INVALID_EMAIL_SPAN = document.getElementById("invalidEmail");

// EVENT LISTENERS
document.getElementById("unsubscribe").addEventListener("click", unsubscribe);
EMAIL_INPUT.addEventListener("focusout", checkEmailInput);


// FUNCTIONS
function unsubscribe(event) {
    event.preventDefault();

    const email = String(EMAIL_INPUT.value);
    if (Misc.isValidEmailFormat(email)) {
        // *** TO DO

        Misc.hideElem(UNSUB_DIV);
        Misc.unhideElem(CONFIRMATION_DIV);
    }
}

function checkEmailInput(event) {
    let emailString = event.target.value;
    !Misc.isValidEmailFormat(emailString) ? Misc.unhideElem(INVALID_EMAIL_SPAN) : Misc.hideElem(INVALID_EMAIL_SPAN);
}