"use strict";

import * as DBF from '../model/DBFunc.js';

// Confirms subscriber's status and returns true/false depending on result
export async function confirmUser(id) {
    if (!id || typeof id != 'number') {
        return false;
    }

    const confirmed = await DBF.confirmSubscriber(id);
    return confirmed;
}