"use strict";
import * as Misc from '/MiscFunc.js';
import * as CalcDiv from '/CalcDiv.js';

// VARIABLES
const EMAIL_DIV = document.getElementById("emailDiv"), SUBSCRIBED_DIV = document.getElementById("subscribedDiv");
const INVALID_EMAIL_SPAN = document.getElementById("invalidEmail");
const BMR_SPAN = document.getElementById("bmr"), TDEE_SPAN = document.getElementById("tdee");
const EMAIL_INPUT = document.getElementById("email");

// EVENT LISTENERS
document.getElementById("calculate").addEventListener("click", calculate);
document.getElementById("clear").addEventListener("click", clear);
document.getElementById("subscribe").addEventListener("click", subscribe);
EMAIL_INPUT.addEventListener("focusout", checkEmailInput);
EMAIL_INPUT.addEventListener("change", checkEmailInput);

// EVENT LISTENER FUNCTIONS
// Calculate and display BMR/TDEE and show email div.
function calculate() {
    if (CalcDiv.calculate()) {
        EMAIL_INPUT.value = '';
        Misc.unhideElem(EMAIL_DIV);
        Misc.hideElem(SUBSCRIBED_DIV);
    }
}

// Clear inputs and hide subscription-related divs.
function clear() {
    CalcDiv.clear();
    EMAIL_INPUT.value = '';
    Misc.hideElem(EMAIL_DIV);
    Misc.hideElem(SUBSCRIBED_DIV);
}

// If all fields filled and valid, call postData function and hide email div.
function subscribe(event) {
    event.preventDefault();

    let email = String(EMAIL_INPUT.value);
    if (Misc.isValidEmailFormat(email)) {
        let person = CalcDiv.getMeasurements();
        if (person == null) {
            console.log("Not all fields valid.");
            return;
        }
        else {
            person["email"] = email;
            person["freq"] = CalcDiv.getFreq();
            person["est_bmr"] = Number(BMR_SPAN.innerText);
            person["est_tdee"] = Number(TDEE_SPAN.innerText);
            console.log("Person: ", person);
            Misc.hideElem(EMAIL_DIV);
            Misc.unhideElem(SUBSCRIBED_DIV);
            postData(person);
        }
    }
    else {
        Misc.unhideElem(INVALID_EMAIL_SPAN);
    }
}

// If invalid email format, show error.
function checkEmailInput(event) {
    let emailString = event.target.value;
    !Misc.isValidEmailFormat(emailString) ? Misc.unhideElem(INVALID_EMAIL_SPAN) : Misc.hideElem(INVALID_EMAIL_SPAN);
}

// Post function
async function postData(data) {
    try {
        const response = await fetch("/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log(`Result: ${result.message}`);
        document.getElementById('subscribeMsg').innerText = result.message;
        EMAIL_INPUT.value = '';
    }
    catch (error) {
        console.log(error);
    }
}