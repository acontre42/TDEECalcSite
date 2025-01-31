"use strict";
import * as DBF from './DBFunc.js';

beforeAll(() => {
    console.log("TESTING ENVIRONMENT? " + process.env.TESTING); // *** TESTING=true npm test, TESTING=true npm test -- dbfunc.test.js
});

afterAll(() => {
    DBF.endPool();
});

describe('Test frequency related functions', () => {
    test('Returns correct freq_id for valid frequency descriptor', async () => {
        const freq_id = await DBF.getFreqId('biannually');
        expect(freq_id).toEqual(4);
    });
    
    test('Returns null when given invalid frequency descriptor', async () => {
        let freq_id = await DBF.getFreqId(8);
        expect(freq_id).toEqual(null);
        freq_id = await DBF.getFreqId('');
        expect(freq_id).toEqual(null);
        freq_id = await DBF.getFreqId(0);
        expect(freq_id).toEqual(null);
        freq_id = await DBF.getFreqId({});
        expect(freq_id).toEqual(null);
        freq_id = await DBF.getFreqId(null);
        expect(freq_id).toEqual(null);
        freq_id = await DBF.getFreqId([]);
        expect(freq_id).toEqual(null);
    });
    
    test('Returns null when not given frequency descriptor', async () => {
        const freq_id = await DBF.getFreqId();
        expect(freq_id).toEqual(null);
    });
    
    test('Returns correct num_days when given valid freqId', async () => {
        const num_days = await DBF.getFreqNumDays(5);
        expect(num_days).toEqual(365);
    });
    
    test('Returns null when given invalid freqId', async () => {
        let num_days = await DBF.getFreqNumDays({});
        expect(num_days).toEqual(null);
        num_days = await DBF.getFreqNumDays('');
        expect(num_days).toEqual(null);
        num_days = await DBF.getFreqNumDays(null);
        expect(num_days).toEqual(null);
        num_days = await DBF.getFreqNumDays([]);
        expect(num_days).toEqual(null);
    });

    test('Returns null when not given any freqId', async () => {
        const num_days = await DBF.getFreqNumDays();
        expect(num_days).toEqual(null);
    });
});

describe('Inserting new users in database', () => {
    const validSub = {
        email: 'test@email.net',
        freq: 'monthly',
        age: 20,
        sex: 'male',
        est_tdee: 2500,
        est_bmr: 1800,
        measurement_sys: 'imperial',
        height_value: 70,
        weight_value: 200
    };

    test('Successfully inserts new user into database (subscriber, subscriber_measurements, confirmation_code)', async () => {
        const id = await DBF.subscribe(validSub);
        expect(id).not.toBeNaN();
        const measurements = await DBF.selectSubMeasurementsBySubId(id);
        expect(measurements.sub_id).toEqual(id);
        const code = await DBF.selectConfirmationCodeBySubId(id);
        expect(code.sub_id).toEqual(id);
        await DBF.deleteSubscriberById(id);
    });

    test('Returns null when trying to insert repeat subscriber', async () => {
        const validId = await DBF.subscribe(validSub);
        const badId = await DBF.subscribe(validSub);
        await DBF.deleteSubscriberById(validId);
        expect(badId).toBeNull();
    });
    
    test('Returns null after trying to insert invalid subscriber', async () => {
        let badId = await DBF.subscribe({});
        expect(badId).toBeNull();
        badId = await DBF.subscribe({email: 'hi', freq: 'yearly'});
        expect(badId).toBeNull();
        badId = await DBF.subscribe(`{
            email: 'test@email.net',
            freq: 'monthly',
            age: 20,
            sex: 'male',
            est_tdee: 2500,
            est_bmr: 1800,
            measurement_sys: 'imperial',
            height_value: 70,
            weight_value: 200
        }`);
        badId = await DBF.subscribe({
            email: 'email',
            freq: 'monthly',
            age: 'age',
            sex: 'male',
            est_tdee: 2500,
            est_bmr: 1800,
            measurement_sys: 'imperial',
            height_value: 70,
            weight_value: 200
        });
        expect(badId).toBeNull();
        badId = await DBF.subscribe(1);
        expect(badId).toBeNull();
        badId = await DBF.subscribe(null);
        expect(badId).toBeNull();
    })
});
    
describe('Selecting subscriber', () => {
    let testSub = {
        email: 'test2@email.net',
        freq: 'yearly',
        age: 20,
        sex: 'male',
        est_tdee: 2500,
        est_bmr: 1800,
        measurement_sys: 'imperial',
        height_value: 70,
        weight_value: 200
    };
    let testId;

    beforeAll(async () => {
        testId = await DBF.subscribe(testSub);
    });

    afterAll(async () => {
        await DBF.deleteSubscriberById(testId);
    });

    test('Returns correct object when passing valid id', async () => {
        let sub = await DBF.selectSubscriberById(testId);
        expect(sub.id).toBe(testId);
    });

    test('Returns null when passing invalid id', async () => {
        let sub = await DBF.selectSubscriberById(-1);
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberById({});
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberById('');
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberById('4');
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberById([]);
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberById(null);
        expect(sub).toBeNull();
    });

    test('Returns correct object when passing valid email', async () => {
        let sub = await DBF.selectSubscriberByEmail(testSub.email);
        expect(sub.id).toEqual(testId);
    });

    test('Returns null when passing invalid email', async () => {
        let sub = await DBF.selectSubscriberByEmail('wrong@email.net');
        expect(sub).toBeNull();
        sub = await DBF.selectSubscriberByEmail(0);
        expect(sub).toBeNull();
    });

    test('Returns null when passing invalid value to valid column', async () => {
        let sub = await DBF.selectSubscriberByEmail(null);
        expect(sub).toBeNull();
    });
});

describe('Updating subscriber and related tables', () => {
    let tempSub = {
        email: 'updateme@email.com',
        freq: 'bimonthly',
        age: 20,
        sex: 'male',
        est_tdee: 2500,
        est_bmr: 1800,
        measurement_sys: 'imperial',
        height_value: 70,
        weight_value: 200
    };
    let id;

    beforeAll(async () => {
        id = await DBF.subscribe(tempSub);
    });

    afterAll(async () => {
        await DBF.deleteSubscriberById(id);
    });

    test('Successfully updates subscriber email', async () => {
        let newEmail = 'updated@email.com';
        let res = await DBF.updateSubscriberEmail(id, newEmail);
        expect(res.email).toEqual(newEmail);
    });

    test('Successfully updates subscriber freq_id', async () => {
        let res = await DBF.updateSubscriberFreq(id, 'oops');
        expect(res).toBeNull();
        res = await DBF.updateSubscriberFreq(id, 'yearly');
        expect(res.freq_id).toEqual(5);
    });
    
    test('Successfully updates values in subscriber_measurements', async () => {
        const newValues = {
            age: 100,
            sex: 'female',
            est_tdee: 500000,
            weight_value: 500.505
        };
        const updated = await DBF.updateSubMeasurements(id, newValues);

        expect(updated.age).toEqual(newValues.age);
        expect(updated.sex).toEqual(newValues.sex);
        expect(updated.est_tdee).toEqual(newValues.est_tdee);
        expect(Number(updated.weight_value)).toEqual(newValues.weight_value);
        expect(Number(updated.height_value)).toEqual(tempSub.height_value);
        expect(updated.est_bmr).toEqual(tempSub.est_bmr);
        expect(updated.measurement_sys).toEqual(tempSub.measurement_sys);

        const newerValues = {
            measurement_sys: 'metric',
            height_value: 160,
            est_bmr: 2000
        };
        const updated2 = await DBF.updateSubMeasurements(id, newerValues);
        expect(Number(updated2.height_value)).toEqual(newerValues.height_value);
        expect(updated2.est_bmr).toEqual(newerValues.est_bmr);
        expect(updated2.measurement_sys).toEqual(newerValues.measurement_sys);
        expect(updated2.age).toEqual(updated.age);
        const updatedDate = new Date(updated.date_last_updated);
        const updatedDate2 = new Date(updated2.date_last_updated);
        expect(updatedDate2.valueOf()).toBeGreaterThan(updatedDate.valueOf());
    });

    test('Returns null and does not update subscriber_measurements when invalid value passed', async () => {
        const currentValues = await DBF.selectSubMeasurementsBySubId(id);
        const newValues = {
            age: 1000,
            est_bmr: 1000.505
        };
        const badUpdate = await DBF.updateSubMeasurements(id, newValues);
        expect(badUpdate).toBeNull();

        const sameValues = await DBF.selectSubMeasurementsBySubId(id);
        expect(currentValues.age).toEqual(sameValues.age);
    });

    test('Successfully updates confirmation_code', async () => {
        const newCode = 55555555;
        const updatedCode = await DBF.updateConfirmationCode(id, newCode);
        expect(updatedCode.code).toEqual(newCode);

        const date_sent = new Date(updatedCode.date_sent);
        const date_expires = new Date(updatedCode.date_expires);
        expect(date_expires).toEqual(new Date(date_sent.setDate(date_sent.getDate() + 7))); // ensure expires 7 days later
    });
});

describe('Deleting confirmation_codes', () => {
    let sub = {
        email: 'deletecode',
        freq: 'monthly',
        age: 20,
        sex: 'male',
        est_tdee: 2500,
        est_bmr: 1800,
        measurement_sys: 'imperial',
        height_value: 70,
        weight_value: 200
    };
    let id;

    beforeAll(async () => {
        id = await DBF.subscribe(sub);
    });

    afterAll(async () => {
        await DBF.deleteSubscriberById(id);
    });

    test('Successfully deletes confirmation_code', async () => {
        await DBF.deleteConfirmationCode(id);
        const deletedCode = await DBF.selectConfirmationCodeBySubId(id);
        expect(deletedCode).toBeNull();
    });
});

describe('Deleting user from database', () => {
    let tempSub = {
        email: 'deleteme@email.com',
        freq: 'bimonthly',
        sex: 'male',
        age: 30,
        measurement_sys: 'imperial',
        weight_value: 180,
        height_value: 70,
        est_bmr: 1800,
        est_tdee: 2400
    };
    let id;

    beforeAll(async () => {
        id = await DBF.subscribe(tempSub);
    });

    test('Successfully deletes subscriber from all tables', async () => {
        let numDeleted = await DBF.deleteSubscriberById(id);
        expect(numDeleted).toEqual(1);
        let sub = await DBF.selectSubscriberById(id);
        expect(sub).toBeNull();
        let measurements = await DBF.selectSubMeasurementsBySubId(id);
        expect(measurements).toBeNull();
        let code = await DBF.selectConfirmationCodeBySubId(id);
        expect(code).toBeNull();
    });
});