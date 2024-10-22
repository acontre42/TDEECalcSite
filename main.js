"use strict";
import CalCalc from "/CalCalc.js";

// VARIABLES
const METRIC = "metric", IMPERIAL = "imperial", MALE = "male", FEMALE = "female", HIDDEN_DIV_CLASS = "hidden-div";
const INPUT_ID_STRINGS = ["age", "feet", "inches", "cm", "lbs", "kg"];
const INPUT_ID_STRINGS_IMPERIAL = ["age", "feet", "inches", "lbs"];
const INPUT_ID_STRINGS_METRIC = ["age", "cm", "kg"];
const EMAIL_DIV = document.getElementById("emailDiv"), SUBSCRIBED_DIV = document.getElementById("subscribedDiv");
const EMAIL_SPAN = document.getElementById("emailSpan"), INVALID_EMAIL_SPAN = document.getElementById("invalidEmail");
const BMR_SPAN = document.getElementById("bmr"), TDEE_SPAN = document.getElementById("tdee");
const EMAIL_INPUT = document.getElementById("email");

let measurement_system = IMPERIAL;

// EVENT LISTENERS
document.getElementById(IMPERIAL).addEventListener("click", useImperial);
document.getElementById(METRIC).addEventListener("click", useMetric);
document.getElementById("calculate").addEventListener("click", calculate);
document.getElementById("clear").addEventListener("click", clear);
document.getElementById("subscribe").addEventListener("click", subscribe);
EMAIL_INPUT.addEventListener("focusout", checkEmailInput);
EMAIL_INPUT.addEventListener("change", checkEmailInput);

// EVENT LISTENER FUNCTIONS
function useImperial() {
    measurement_system = IMPERIAL;
    document.querySelectorAll(".metric-sys").forEach((elem) => hideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => unhideElem(elem));
}

function useMetric() {
    measurement_system = METRIC;
    document.querySelectorAll(".metric-sys").forEach((elem) => unhideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => hideElem(elem));
}
// Check input, calculate/display BMR & TDEE, hide/display subscription-related elements.
function calculate() {
    clearEmailInfo();

    if (!allFieldsFilledOut()) {
        return;
    }

    let person = getMeasurements();
    if (person == null) {
        return;
    }
    // Calculate/display BMR
    let bmr;
    if (measurement_system == IMPERIAL) {
        let {age, sex, feet, inches, lbs} = person;
        bmr = CalCalc.calcBMRImperial(age, sex, feet, inches, lbs);
    }
    else {
        let {age, sex, cm, kg} = person;
        bmr = CalCalc.calcBMRMetric(age, sex, cm, kg);
    }
    BMR_SPAN.innerText = bmr;
    // Calculate/display TDEE
    let activityLvl;
    let levels = document.querySelectorAll("input[name='activityLevel'");
    for (let level of levels) {
        if (level.checked == true) {
            activityLvl = level.value;
            break;
        }
    }
    let tdee = CalCalc.calcTDEE(bmr, activityLvl);
    TDEE_SPAN.innerText = tdee;

    unhideElem(EMAIL_DIV);
    hideElem(SUBSCRIBED_DIV);
}
// Set all user inputs and spans back to default, hide subscription-related divs.
function clear() {
    measurement_system == IMPERIAL ? useImperial() : useMetric();
    document.getElementById(measurement_system).checked = true;
    document.getElementById(MALE).checked = true;
    INPUT_ID_STRINGS.forEach((id) => document.getElementById(id).value = '');
    BMR_SPAN.innerText = '';
    TDEE_SPAN.innerText = '';
    clearEmailInfo();
    hideElem(EMAIL_DIV);
    hideElem(SUBSCRIBED_DIV);
    document.getElementById("age").focus();
}

function subscribe(event) {
    event.preventDefault();

    if (!allFieldsFilledOut()) {
        return;
    }

    let email = String(EMAIL_INPUT.value);
    if (isValidEmailFormat(email)) {
        let person = getMeasurements();
        if (person == null) {
            console.log("Not all fields valid.");
            return;
        }
        else {
            hideElem(EMAIL_DIV);
            EMAIL_SPAN.innerText = email;
            unhideElem(SUBSCRIBED_DIV);
            console.log("Subscribed");
            console.log(person); // *** TO DO: DELETE
            // ***TO DO: SUBSCRIBE
        }
    }
    else {
        unhideElem(INVALID_EMAIL_SPAN);
        console.log("Invalid email format"); // *** TO DO: DELEtE
    }
}

function checkEmailInput(event) {
    let emailString = event.target.value;
    !isValidEmailFormat(emailString) ? unhideElem(INVALID_EMAIL_SPAN) : hideElem(INVALID_EMAIL_SPAN);
}

// INPUT CHECKING FUNCTIONS
// Checks all visible inputs in #userInputDiv for missing values. If any, alert them and return false. Else, return true.
function allFieldsFilledOut() {
    let missing = [];
    if (document.getElementById(MALE).checked == false && document.getElementById(FEMALE).checked == false) {
        missing.push("sex");
    }

    let inputs = (measurement_system == IMPERIAL ? INPUT_ID_STRINGS_IMPERIAL : INPUT_ID_STRINGS_METRIC);
    for (let id of inputs) {
        if (document.getElementById(id).value == '') {
            if (id == "inches") {
                document.getElementById(id).value = 0;
            }
            else {
                missing.push(id);
            }
        }
    }

    if (missing.length > 0) {
        let message = "Following fields are empty: " + missing;
        alert(message);
        return false;
    }

    return true;
}

function isValidEmailFormat(emailString) {
    let regex = /^[\w!#$%&'*+-/=?^_`{|}~]{1,64}@[\w.]{1,63}\.[a-zA-Z0-9-]{1,63}$/i;
    return regex.test(emailString);
}

// MISCELLANEOUS FUNCTIONS
function hideElem(elem) { 
    elem.classList.add(HIDDEN_DIV_CLASS);
}

function unhideElem(elem) {
    elem.classList.remove(HIDDEN_DIV_CLASS);
}

function clearEmailInfo() {
    EMAIL_SPAN.innerText = '';
    EMAIL_INPUT.value = '';
}
// Returns user's entered measurements if valid. Else, return null. Should be called after ensuring all fields have been filled out with allFieldsFilledOut().
function getMeasurements() {
    let person = { // prefilled with minimum values
        "sex": '',
        "age": 1,
        "feet": 2,
        "inches": 0,
        "lbs": 15,
        "cm": 60,
        "kg": 6.8
    };
    let inputs;
    measurement_system === IMPERIAL ? inputs = [...INPUT_ID_STRINGS_IMPERIAL] : inputs = [...INPUT_ID_STRINGS_METRIC];
    for (let id of inputs) {
        if (document.getElementById(id).value < person[id]) {
            alert(id + " cannot be less than " + person[id]);
            return null;
        }
        else {
            person[id] = Number(document.getElementById(id).value);
        }
    }
    document.getElementById(MALE).checked == true ? person.sex = MALE : person.sex = FEMALE;
    return person;
}