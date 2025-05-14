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

// Returns chosen option from set of radio buttons with a given name.
export function getRadioValue(name) {
    let chosen;
    let options = document.querySelectorAll(`input[name="${name}"]`);
    for (let option of options) {
        if (option.checked == true) {
            chosen = option.value;
            break;
        }
    }
    return chosen;
}

// Separates document.cookie into separate cookie objects
export function getCookiesAsObjects(docCookies) {
    const cookiePairs = docCookies.split('; ');

    let cookies = [];
    cookiePairs.forEach((pair) => {
        let nameValue = pair.split('=');
        const cookie = {
            name: nameValue[0],
            value: nameValue[1]
        };
        cookies.push(cookie);
    });

    return cookies;
}

// Convert cookies in document.cookie into properties for one cookies object
export function getCookiesAsProps(docCookies) {
    const cookiePairs = docCookies.split('; ');

    let cookies = {};
    cookiePairs.forEach((pair) => {
        let cookie = pair.split('=');
        let name = cookie[0];
        let value = cookie[1];
        cookies[name] = value;
    });

    return cookies;
}