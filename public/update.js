"use strict";

import * as CalcDiv from '/CalcDiv.js';
import * as Misc from '/MiscFunc.js';

const SAVE_DIV = document.getElementById("saveDiv");
const RESULT_DIV = document.getElementById("resultDiv");
const USER_DIV = document.getElementById("userDiv");
const INFO_DIV = document.getElementById("infoDiv");
const BMR_SPAN = document.getElementById("bmr");
const TDEE_SPAN = document.getElementById("tdee");

document.getElementById("calculate").addEventListener("click", calculate);
document.getElementById("clear").addEventListener("click", clear);
document.getElementById("save").addEventListener("click", save);
document.getElementById("imperial").addEventListener("click", () => { Misc.hideElem(SAVE_DIV) });
document.getElementById("metric").addEventListener("click", () => { Misc.hideElem(SAVE_DIV) });

// EVENT LISTENER FUNCTIONS
// If calculation valid, display result and show #saveDiv.
function calculate() {
    Misc.hideElem(SAVE_DIV);

    if (CalcDiv.calculate()) {
        Misc.unhideElem(SAVE_DIV);
    }
}

// Hide #saveDiv and clear inputs.
function clear() {
    Misc.hideElem(SAVE_DIV);
    CalcDiv.clear();
}

// If all fields valid and filled out, save new measurements and display result message.
async function save() {
    let cookies = Misc.getCookiesAsProps(document.cookie);
    let id = cookies['id'];
    let updateCode = cookies['updateCode'];
    let path = `/update/${id}/${updateCode}`;

    let measurements = CalcDiv.getMeasurements();
    measurements["est_bmr"] = Number(BMR_SPAN.innerText);
    measurements["est_tdee"] = Number(TDEE_SPAN.innerText);
    if (measurements) {
        let message;
        try {
            const response = await fetch(path, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(measurements)
            });
            const result = await response.json();
            message = result.message;
        }
        catch (err) {
            console.log(err);
            message = 'There was an error while attempting to update the measurements. Please try again.';
        }

        RESULT_DIV.innerHTML = `<p>${message}</p>`;
        Misc.hideElem(SAVE_DIV);
        Misc.hideElem(USER_DIV);
        Misc.hideElem(INFO_DIV);
        Misc.unhideElem(RESULT_DIV);
    }
}