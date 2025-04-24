"use strict";
import * as Misc from './MiscFunc.js';

const UNSUB_DIV = document.getElementById("unsubDiv");
const EMAIL_INPUT = document.getElementById("email");
const RESULT_DIV = document.getElementById("resultDiv");
const INVALID_EMAIL_SPAN = document.getElementById("invalidEmail");

// EVENT LISTENERS
document.getElementById("unsubscribe").addEventListener("click", unsubscribe);
EMAIL_INPUT.addEventListener("focusout", checkEmailInput);


// FUNCTIONS
async function unsubscribe(event) {
    event.preventDefault();

    const email = String(EMAIL_INPUT.value);
    if (Misc.isValidEmailFormat(email)) { 
        try {
            const response = await fetch("/unsubscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({email: email})
            });
            const result = await response.json();
            console.log(result);
            
        }
        catch(err) {
            console.log(err);
            RESULT_DIV.innerHTML = `<p>There was an error processing this request. Please try again later.</p>`
        }

        Misc.hideElem(UNSUB_DIV);
        Misc.unhideElem(RESULT_DIV);
    }
}

function checkEmailInput(event) {
    let emailString = event.target.value;
    !Misc.isValidEmailFormat(emailString) ? Misc.unhideElem(INVALID_EMAIL_SPAN) : Misc.hideElem(INVALID_EMAIL_SPAN);
}