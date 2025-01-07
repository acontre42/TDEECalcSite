"use strict";
import CalCalc from './public/CalCalc.js';

// calcBMRImperial
test('Ensure correct BMR for valid imperial units', () => {
    let age = 90, sex = "male", feet = 5, inches = 11, lbs = 190;
    expect(CalCalc.calcBMRImperial(age, sex, feet, inches, lbs)).toEqual(1544);
});

test('Ensure "ERROR" for NaN lbs', () => {
    let age = 90, sex = "male", feet = 5, inches = 11, lbs = "!";
    expect(CalCalc.calcBMRImperial(age, sex, feet, inches, lbs)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing insufficient args to calcBMRImperial', () => {
    let age = 90, sex = "male", feet = 5;
    expect(CalCalc.calcBMRImperial(age, sex, feet)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing value other than "male" or "female" for sex (imperial)', () => {
    let age = 90, sex = "femal", feet = 5, inches = 11, lbs = 190;
    expect(CalCalc.calcBMRImperial(age, sex, feet, inches, lbs)).toEqual("ERROR");
});

//calcBMRMetric
test('Ensure correct BMR for valid metric units', () => {
    let age = 90, sex = "female", cm = 170, kg = 70;
    expect(CalCalc.calcBMRMetric(age, sex, cm, kg)).toEqual(1152);
});

test('Ensure "ERROR" for NaN cm', () => {
    let age = 90, sex = "male", cm = "!", kg = 70;
    expect(CalCalc.calcBMRMetric(age, sex, cm, kg)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing insufficient args to calcBMRMetric', () => {
    let age = 90, sex = "male";
    expect(CalCalc.calcBMRMetric(age, sex)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing value other than "male" or "female" for sex (metric)', () => {
    let age = 90, sex = "femal", cm = 170, kg = 70;
    expect(CalCalc.calcBMRMetric(age, sex, cm, kg)).toEqual("ERROR");
});

//calcTDEE
test('Ensure correct TDEE for activityLvl = sedentary', () => {
    let bmr = 1544, activityLvl = 'sedentary';
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(1853);
});

test('Ensure correct TDEE for activityLvl = light', () => {
    let bmr = 1544, activityLvl = 'light';
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2162);
});

test('Ensure correct TDEE for activityLvl = moderate', () => {
    let bmr = 1544, activityLvl = 'moderate';
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2548);
});

test('Ensure correct TDEE for activityLvl = heavy', () => {
    let bmr = 1544, activityLvl = 'heavy';
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual(2934);
});

test('Ensure "ERROR" when passing insufficient args to calcTDEE', () => {
    let bmr = 1544;
    expect(CalCalc.calcTDEE(bmr)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing invalid args to calcTDEE', () => {
    let bmr = 1544, activityLvl = 9;
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing invalid string activityLvl to calcTDEE', () => {
    let bmr = 1544, activityLvl = "extreme";
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
});

test('Ensure "ERROR" when passing NaN bmr to calcTDEE', () => {
    let bmr = "!", activityLvl = "extreme";
    expect(CalCalc.calcTDEE(bmr, activityLvl)).toEqual("ERROR");
});