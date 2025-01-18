"use strict";
import CalCalc from './public/CalCalc.js';

// calcBMRImperial
describe('Ensure correct BMR for calcBMRImperial', () => {
    let age = 90, sex = "male", feet = 5, inches = 11, lbs = 190;

    test('Ensure correct BMR for valid imperial units', () => {
        expect(CalCalc.calcBMRImperial(age, sex, feet, inches, lbs)).toEqual(1544);
        let zeroInches = 0;
        expect(CalCalc.calcBMRImperial(age, sex, feet, zeroInches, lbs)).toEqual(1369);
        expect(CalCalc.calcBMRImperial(age, "female", feet, inches, lbs)).toEqual(1378);
    });

    test('Ensure "ERROR" when passing insufficient args to calcBMRImperial', () => {
        expect(CalCalc.calcBMRImperial(age)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex, feet)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex, feet, inches)).toEqual("ERROR");
    });

    test('Ensure "ERROR" when passing invalid arguments', () => {
        expect(CalCalc.calcBMRImperial(-1, sex, feet, inches, lbs)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex, null, inches, lbs)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex, feet, "!", lbs)).toEqual("ERROR");
        expect(CalCalc.calcBMRImperial(age, sex, feet, inches, {lbs: 190})).toEqual("ERROR");
    });

    test('Ensure "ERROR" when passing value other than "male" or "female" for sex (imperial)', () => {
        let sex = "mal";
        expect(CalCalc.calcBMRImperial(age, sex, feet, inches, lbs)).toEqual("ERROR");
    });
});

//calcBMRMetric
describe('Ensure correct BMR for calcBMRMetric', () => {
    let age = 90, sex = "female", cm = 170, kg = 70;

    test('Ensure correct BMR for valid metric units', () => {
        expect(CalCalc.calcBMRMetric(age, sex, cm, kg)).toEqual(1152);
        expect(CalCalc.calcBMRMetric(age, "male", cm, kg)).toEqual(1318);
    });

    test('Ensure "ERROR" when passing insufficient args to calcBMRMetric', () => {
        expect(CalCalc.calcBMRMetric(age)).toEqual("ERROR");
        expect(CalCalc.calcBMRMetric(age, sex)).toEqual("ERROR");
        expect(CalCalc.calcBMRMetric(age, sex, cm)).toEqual("ERROR");
    });

    test('Ensure "ERROR" for invalid args', () => {
        expect(CalCalc.calcBMRMetric(age, sex, null, kg)).toEqual("ERROR");
        expect(CalCalc.calcBMRMetric(age, null, cm, kg)).toEqual("ERROR");
    });

    test('Ensure "ERROR" when passing value other than "male" or "female" for sex (metric)', () => {
        let sex = "femal";
        expect(CalCalc.calcBMRMetric(age, sex, cm, kg)).toEqual("ERROR");
    });
});

//calcTDEE
describe('Ensure correct TDEE', () => {
    let bmr = 1544;

    test('Ensure "ERROR" when passing invalid bmr to calcTDEE', () => {
        let activityLvl = "light";
        let badbmr = "";
        expect(CalCalc.calcTDEE(badbmr, activityLvl)).toEqual("ERROR");
        badbmr = null;
        expect(CalCalc.calcTDEE(badbmr, activityLvl)).toEqual("ERROR");
    });

    test('Ensure "ERROR" when passing insufficient args to calcTDEE', () => {
        expect(CalCalc.calcTDEE()).toEqual("ERROR");
        expect(CalCalc.calcTDEE(bmr)).toEqual("ERROR");
    });

    test('Ensure correct TDEE for valid activityLvl', () => {
        let activityLvl = 'sedentary';
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(1853);
        activityLvl = 'light';
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2162);
        activityLvl = 'moderate';
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2548);
        activityLvl = 'heavy';
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2934);
    });
    
    test('Ensure "ERROR" when passing invalid activityLvl to calcTDEE', () => {
        let activityLvl = "extreme";
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
        activityLvl = "";
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
        activityLvl = null;
        expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
    });
});