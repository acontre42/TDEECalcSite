// Converts "database formatted" user data into "input formatted" user data and vice versa.
"use strict";

// Convert weight and height measurements into height_value and weight_value to match database fields
export function convertToDBFormat(user) {
    let sub = {...user};

    switch (user.measurement_sys) {
        case 'imperial':
            if (!user.feet || (!user.inches && user.inches !== 0) || !user.lbs) {
                return ERROR;
            }
            sub.weight_value = user.lbs;
            sub.height_value = (user.feet * 12) + user.inches;
            break;
        case 'metric':
            if (!user.cm || !user.kg) {
                return ERROR;
            }
            sub.weight_value = user.kg;
            sub.height_value = user.cm;
            break;
        default:
            return ERROR;
    }

    return sub;
}

// Convert height_value and weight_value into metric or imperial units to match inputs
export function convertToInputFormat(sub) {
    let user = {...sub};
    switch (sub.measurement_sys) {
        case 'imperial':
            user.feet = Math.floor(sub.height_value / 12);
            user.inches = sub.height_value % 12;
            user.lbs = sub.weight_value;
            break;
        case 'metric':
            user.cm = sub.height_value;
            user.kg = sub.weight_value;
            break;
        default:
            return ERROR;
    }

    return user;
}