"use strict";

import * as CalcDiv from '/CalcDiv.js';
import * as Misc from '/MiscFunc.js';

const SAVE_DIV = document.getElementById("saveDiv");

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

// If all fields valid and filled out, save new measurements.
function save() {
    let measurements = CalcDiv.getMeasurements();
    if (measurements) {
        alert('Updated');
        // *** TO DO: save measurements & display message
    }
}