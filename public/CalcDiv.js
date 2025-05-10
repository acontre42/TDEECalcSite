"use strict";
import CalCalc from '/CalCalc.js';
import * as Misc from '/MiscFunc.js';

const METRIC = "metric", IMPERIAL = "imperial", MALE = "male", FEMALE = "female";
const INPUT_ID_STRINGS = ["age", "feet", "inches", "cm", "lbs", "kg"];
const INPUT_ID_STRINGS_IMPERIAL = ["age", "feet", "inches", "lbs"];
const INPUT_ID_STRINGS_METRIC = ["age", "cm", "kg"];
const BMR_SPAN = document.getElementById("bmr"), TDEE_SPAN = document.getElementById("tdee");
const DISPLAY_SUMMARY = document.getElementById("displaySummary");

// MAIN
let measurement_system = Misc.getRadioValue("measurements");
setView();

// EVENT LISTENERS
document.getElementById(IMPERIAL).addEventListener("click", useImperial);
document.getElementById(METRIC).addEventListener("click", useMetric);
document.getElementById("calculate").addEventListener("click", calculate);
document.getElementById("clear").addEventListener("click", clear);

// FUNCTIONS
// Hide metric system divs
function useImperial() {
    measurement_system = IMPERIAL;
    document.querySelectorAll(".metric-sys").forEach((elem) => Misc.hideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => Misc.unhideElem(elem));
}

// Hide imperial system divs
function useMetric() {
    measurement_system = METRIC;
    document.querySelectorAll(".metric-sys").forEach((elem) => Misc.unhideElem(elem));
    document.querySelectorAll(".imperial-sys").forEach((elem) => Misc.hideElem(elem));
}

// Sets which inputs to show to user based on chosen system
function setView() {
    (measurement_system == IMPERIAL ? useImperial() : useMetric());
}

// Check inputs & calculate/display BMR & TDEE.
function calculate() {
    if (!allFieldsFilledOut()) {
        return;
    }

    let person = getMeasurements();
    if (person == null) {
        return;
    }
    // Display person's summary above estimates
    DISPLAY_SUMMARY.innerText = createSummary(person);
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
}

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
    person["sex"] = Misc.getRadioValue("sex");
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

// Set all user inputs and spans back to default.
function clear() {
    setView();
    INPUT_ID_STRINGS.forEach((id) => document.getElementById(id).value = '');
    BMR_SPAN.innerText = '';
    TDEE_SPAN.innerText = '';
    DISPLAY_SUMMARY.innerText = '';
    document.getElementById("age").focus();
}

// Checks all visible inputs in #userInputDiv for missing values. If any, alert them and return false. Else, return true.
function allFieldsFilledOut() {
    let missing = [];
    if (document.getElementById(MALE).checked == false && document.getElementById(FEMALE).checked == false) {
        missing.push("sex");
    }

    let chosen = getActivityLevel();
    if (!chosen) {
        missing.push('activity level');
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