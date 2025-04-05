"use strict";
import * as DBF from './SubscriptionService/DBFunc.js';

beforeAll(() => {
    console.log("TESTING ENVIRONMENT? " + process.env.TESTING); // *** TESTING=true npm test, TESTING=true npm test -- dbfunc.test.js
});

afterAll(async () => {
    await DBF.truncateTestTables();
    await DBF.endPool();
});

describe('TEST FREQUENCY RELATED FUNCTIONS', () => {
    test('Returns correct freq_id for valid frequency descriptor', async () => {
        let freq_id = await DBF.getFreqId('biannually');
        expect(freq_id).toEqual(4);
        freq_id = await DBF.getFreqId('monthly');
        expect(freq_id).toEqual(1);
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
        freq_id = await DBF.getFreqId();
        expect(freq_id).toEqual(null);
    });
    
    test('Returns correct num_days when given valid freqId', async () => {
        let num_days = await DBF.getFreqNumDays(5);
        expect(num_days).toEqual(365);
        num_days = await DBF.getFreqNumDays(3);
        expect(num_days).toEqual(90);
        num_days = await DBF.getFreqNumDays(1);
        expect(num_days).toEqual(30);
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
        num_days = await DBF.getFreqNumDays();
        expect(num_days).toEqual(null);
    });
});

describe('INSERTING NEW USERS IN DATABASE', () => {
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
    let id;

    beforeAll(async () => {
        id = await DBF.subscribe(validSub);
    });

    test('Successfully inserts new user into database (subscriber, subscriber_measurements, confirmation_code)', async () => {
        expect(id).not.toBeNaN();
        const measurements = await DBF.selectSubMeasurementsBySubId(id);
        expect(measurements.sub_id).toEqual(id);
        const code = await DBF.selectConfirmationCodeBySubId(id);
        expect(code.sub_id).toEqual(id);
    });

    test('Returns null when trying to insert repeat subscriber', async () => {
        const badId = await DBF.subscribe(validSub);
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

describe('CONFIRMING USERS', () => {
    let sub = {
        email: 'confirm@user.com',
        freq: 'yearly',
        age: 30,
        sex: 'female',
        est_tdee: 1800,
        est_bmr: 1500,
        measurement_sys: 'imperial',
        height_value: 64,
        weight_value: 160
    };
    let id;
    let confirmed;

    beforeAll(async () => {
        id = await DBF.subscribe(sub);
        confirmed = await DBF.confirmSubscriber(id);
    });

    test('Successfully confirms subscriber, deletes confirmation_code, creates scheduled_reminder', async () => {
        expect(confirmed).toEqual(true);
        const sub = await DBF.selectSubscriberById(id);
        expect(sub.confirmed).toEqual(true);
        expect(sub.date_confirmed).not.toBeNull();
        const cc = await DBF.selectConfirmationCodeBySubId(id);
        expect(cc).toBeNull();
        const sched_r =  await DBF.selectScheduledReminderBySubId(id);
        expect(sched_r).not.toBeNull();
    });

    test('Returns false when passing invalid id', async () => {
        let result = await DBF.confirmSubscriber(-1);
        expect(result).toEqual(false);
        result = await DBF.confirmSubscriber();
        expect(result).toEqual(false);
        result = await DBF.confirmSubscriber({});
        expect(result).toEqual(false);
    });

    test('Returns false when attempting to confirm user who is already confirmed', async () => {
        let result = await DBF.confirmSubscriber(id);
        expect(result).toEqual(false);
    });
});
    
describe('SELECTING SUBSCRIBER AND RELATED TABLES', () => {
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

    test('Returns correct subscriber object when passing valid id', async () => {
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

    test('Returns correct subscriber object when passing valid email', async () => {
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

    test('Returns correct subscriber_measurements object when passing valid subId', async () => {
        let sm = await DBF.selectSubMeasurementsBySubId(testId);
        expect(Number(sm.age)).toEqual(testSub.age);
        expect(sm.sex).toEqual(testSub.sex);
        expect(Number(sm.est_tdee)).toEqual(testSub.est_tdee);
        expect(Number(sm.est_bmr)).toEqual(testSub.est_bmr);
        expect(sm.measurement_sys).toEqual(testSub.measurement_sys);
        expect(Number(sm.height_value)).toEqual(testSub.height_value);
        expect(Number(sm.weight_value)).toEqual(testSub.weight_value);
    });

    test('Returns null when passing invalid subId', async () => {
        let sm = await DBF.selectSubMeasurementsBySubId();
        expect(sm).toBeNull();
        sm = await DBF.selectSubMeasurementsBySubId(-1);
        expect(sm).toBeNull();
        sm = await DBF.selectSubMeasurementsBySubId({});
        expect(sm).toBeNull();
        sm = await DBF.selectSubMeasurementsBySubId(String(testId));
        expect(sm).toBeNull();
    });

    test('Returns valid confirmation_code when passing valid subId/code', async () => {
        const cc1 = await DBF.selectConfirmationCodeBySubId(testId);
        const cc2 = await DBF.selectConfirmationCodeByCode(cc1.code);
        expect(cc1.code).toEqual(cc2.code);
    });

    test('Returns null when passing invalid subId/code', async () => {
        let cc = await DBF.selectConfirmationCodeBySubId();
        expect(cc).toBeNull();
        cc = await DBF.selectConfirmationCodeBySubId(-1);
        expect(cc).toBeNull();
        cc = await DBF.selectConfirmationCodeByCode();
        expect(cc).toBeNull();
        cc = await DBF.selectConfirmationCodeBySubId({});
        expect(cc).toBeNull();
    });

});

describe('UPDATING SUBSCRIBER AND RELATED TABLES', () => {
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

        const date_sent = new Date(updatedCode.date_created);
        const date_expires = new Date(updatedCode.date_expires);
        expect(date_expires).toEqual(new Date(date_sent.setDate(date_sent.getDate() + 7))); // ensure expires 7 days later
    });
});

describe('DELETING CONFIRMATION_CODES', () => {
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

    test('Successfully deletes confirmation_code', async () => {
        await DBF.deleteConfirmationCode(id);
        const deletedCode = await DBF.selectConfirmationCodeBySubId(id);
        expect(deletedCode).toBeNull();
    });
});

describe('DELETING USER FROM DATABASE', () => {
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