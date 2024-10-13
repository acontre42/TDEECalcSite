// The Calorie Calculator (CalCalc) class is used to calculate BMR & TDEE based on the measurements provided to it.
// BMR is calculated using the Mifflin-St. Jeor equation which goes as follows:
// MEN: (10 * kg) + (6.25 * cm) - (5 * age) + 5
// WOMEN: (10 * kg) + (6.25 * cm) - (5 * age) - 161
// TDEE is calculated using the following activity level multipliers: Sedentary = 1.2, Light = 1.4, Moderate = 1.65, Heavy = 1.9

const MALE = "male", FEMALE = "female";
const MOD_M = 5, MOD_F = -161;
const SEDENTARY = "sedentary", LIGHT = "light", MODERATE = "moderate", HEAVY = "heavy";
const mSED = 1.2, mLIT = 1.4, mMOD= 1.65, mHVY = 1.9; // Activity level multipliers
const ERROR = "ERROR";

export default class CalCalc {
    static calcBMRMetric(age, sex, cm, kg) {
        if (isNaN(age) || isNaN(cm) || isNaN(kg) || typeof(sex) !== "string") {
            console.log("ERROR: one or more arguments is of incorrect type");
            return ERROR;
        }
        if (sex !== MALE && sex !== FEMALE) {
            console.log("ERROR: sex entered must be male or female");
            return ERROR;
        }

        let modifier = (sex == MALE ? MOD_M : MOD_F);
        let bmr = (10 * kg) + (6.25 * cm) - (5 * age) + modifier;
        return Math.round(bmr);
    }

    static calcBMRImperial(age, sex, feet, inches, lbs) {
        if (isNaN(age) || isNaN(feet) || isNaN(inches) || isNaN(lbs) || typeof(sex) !== "string") {
            console.log("ERROR: one or more arguments is of incorrect type");
            return ERROR;
        }
        if (sex !== MALE && sex !== FEMALE) {
            console.log("ERROR: sex entered must be male or female.");
            return ERROR;
        }

        let totalInches = inches + (feet * 12);
        let cm = totalInches * 2.54;
        let kg = lbs / 2.205;
        return this.calcBMRMetric(age, sex, cm, kg);
    }

    static calcTDEE(bmr, activityLvl) {
        if (isNaN(bmr)) {
            console.log("ERROR: bmr is NaN.")
            return ERROR;
        }
        else if (typeof(activityLvl) !== "string") {
            console.log("ERROR: activityLvl is not a string");
            return ERROR;
        }
        else {
            let multiplier;
            switch (activityLvl) {
                case SEDENTARY:
                    multiplier = mSED;
                    break;
                case LIGHT:
                    multiplier = mLIT;
                    break;
                case MODERATE:
                    multiplier = mMOD;
                    break;
                case HEAVY:
                    multiplier = mHVY;
                    break;
                default:
                    console.log("ERROR: A non-standard activityLvl has been entered.");
                    return ERROR;
            }

            let tdee = bmr * multiplier;
            tdee = Math.round(tdee);
            return tdee;
        }
    }
}