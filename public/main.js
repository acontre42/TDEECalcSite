"use strict";
import CalCalc from "/CalCalc.js";
import * as Misc from '/MiscFunc.js';

// VARIABLES
const METRIC = "metric", IMPERIAL = "imperial", MALE = "male", FEMALE = "female";
const INPUT_ID_STRINGS = ["age", "feet", "inches", "cm", "lbs", "kg"];
const INPUT_ID_STRINGS_IMPERIAL = ["age", "feet", "inches", "lbs"];
const INPUT_ID_STRINGS_METRIC = ["age", "cm", "kg"];
const EMAIL_DIV = document.getElementById("emailDiv"), SUBSCRIBED_DIV = document.getElementById("subscribedDiv");
const INVALID_EMAIL_SPAN = document.getElementById("invalidEmail");
const BMR_SPAN = document.getElementById("bmr"), TDEE_SPAN = document.getElementById("tdee");
const EMAIL_INPUT = document.getElementById("email");
const DISPLAY_SUMMARY = document.getElementById("displaySummary");

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
    document.querySelectorAll(".metric-sys").forEach((elem) => Misc.hideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => Misc.unhideElem(elem));
}

function useMetric() {
    measurement_system = METRIC;
    document.querySelectorAll(".metric-sys").forEach((elem) => Misc.unhideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => Misc.hideElem(elem));
}
// Check input, calculate/display BMR & TDEE, hide/display subscription-related elements.
function calculate() {
    EMAIL_INPUT.value = '';

    if (!allFieldsFilledOut()) {
        return;
    }

    let person = getMeasurements();
    if (person == null) {
        return;
    }
    DISPLAY_SUMMARY.innerText = createSummary(person); // Display person's summary above estimates
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
    let activityLvl = getActivityLevel();
    let tdee = CalCalc.calcTDEE(bmr, activityLvl);
    TDEE_SPAN.innerText = tdee;

    Misc.unhideElem(EMAIL_DIV);
    Misc.hideElem(SUBSCRIBED_DIV);
}
// Set all user inputs and spans back to default, hide subscription-related divs.
function clear() {
    measurement_system == IMPERIAL ? useImperial() : useMetric();
    document.getElementById(measurement_system).checked = true;
    document.getElementById(MALE).checked = true;
    INPUT_ID_STRINGS.forEach((id) => document.getElementById(id).value = '');
    BMR_SPAN.innerText = '';
    TDEE_SPAN.innerText = '';
    EMAIL_INPUT.value = '';
    DISPLAY_SUMMARY.innerText = '';
    Misc.hideElem(EMAIL_DIV);
    Misc.hideElem(SUBSCRIBED_DIV);
    document.getElementById("age").focus();
}

function subscribe(event) {
    event.preventDefault();

    if (!allFieldsFilledOut()) {
        return;
    }

    let email = String(EMAIL_INPUT.value);
    if (Misc.isValidEmailFormat(email)) {
        let person = getMeasurements();
        if (person == null) {
            console.log("Not all fields valid.");
            return;
        }
        else {
            person["email"] = email;
            person["freq"] = getFreq();
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

function checkEmailInput(event) {
    let emailString = event.target.value;
    !Misc.isValidEmailFormat(emailString) ? Misc.unhideElem(INVALID_EMAIL_SPAN) : Misc.hideElem(INVALID_EMAIL_SPAN);
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
const getActivityLevel = Misc.getRadioValue.bind(null, "activityLevel");
const getFreq = Misc.getRadioValue.bind(null, "freq");
// Returns user's entered measurements if valid. Else, return null. Should be called after ensuring all fields have been filled out with allFieldsFilledOut().
function getMeasurements() {
    const minValues = {
        "age": 12,
        "feet": 4,
        "inches": 0,
        "lbs": 60,
        "cm": 122,
        "kg": 27.3
    };
    let person = {};
    let inputs;
    measurement_system === IMPERIAL ? inputs = [...INPUT_ID_STRINGS_IMPERIAL] : inputs = [...INPUT_ID_STRINGS_METRIC];
    for (let id of inputs) {
        if (document.getElementById(id).value < minValues[id]) {
            alert(id + " cannot be less than " + minValues[id]);
            return null;
        }
        else {
            person[id] = Number(document.getElementById(id).value);
        }
    }
    person["sex"] = (document.getElementById(MALE).checked == true ? MALE : FEMALE);
    person["measurement_sys"] = measurement_system;
    return person;
}
// Create a summary string of user's entered measurements to display above estimated BMR/TDEE
function createSummary(person) {
    let summary = `You are a(n) ${person.age} year old ${person.sex} standing `;

    if (person.measurement_sys == IMPERIAL) {
        summary += `${person.feet}' ${person.inches}" `;
    }
    else {
        summary += `${person.cm} cm `;
    }
    
    summary += `tall and weighing in at `;

    if (person.measurement_sys == IMPERIAL) {
        summary += ` ${person.lbs} lbs.`;
    }
    else {
        summary += ` ${person.kg} kg.`;
    }

    return summary;
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
    }
    catch (error) {
        console.log(error);
    }
}