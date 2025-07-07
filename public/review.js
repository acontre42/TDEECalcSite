"use strict";
import * as Misc from './MiscFunc.js';

const APPROVE = document.getElementById("approve");
const REJECT = document.getElementById("reject");
const RESULT_DIV = document.getElementById("resultDiv");
const PENDING_DIV = document.getElementById("pendingDiv");
const cookies = Misc.getCookiesAsProps(document.cookie);

APPROVE.addEventListener("click", approveUpdate);
REJECT.addEventListener("click", rejectUpdate);

async function approveUpdate() {
    let id = cookies.id;
    let code = cookies.pendingCode;
    let path = `/update/confirm/${id}/${code}`;

    try {
        const response = await fetch(path, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        let message = result.message;

        PENDING_DIV.remove();
        RESULT_DIV.innerHTML = `<p>${message}</p>`;
        Misc.unhideElem(RESULT_DIV);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
}

async function rejectUpdate() {
    let id = cookies.id;
    let code = cookies.pendingCode;
    let path = `/update/reject/${id}/${code}`;

    try {
        const response = await fetch(path, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        let message = result.message;

        PENDING_DIV.remove();
        RESULT_DIV.innerHTML = `<p>${message}</p>`;
        Misc.unhideElem(RESULT_DIV);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
}