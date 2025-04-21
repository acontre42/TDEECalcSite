"use strict";

const HIDDEN_ELEM_CLASS = "hidden-elem";

export function hideElem(elem) { 
    elem.classList.add(HIDDEN_ELEM_CLASS);
}

export function unhideElem(elem) {
    elem.classList.remove(HIDDEN_ELEM_CLASS);
}

export function isValidEmailFormat(emailString) {
    let regex = /^[\w!#$%&'*+-/=?^_`{|}~]{1,64}@[\w.]{1,63}\.[a-zA-Z0-9-]{1,63}$/i;
    return regex.test(emailString);
}