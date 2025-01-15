"use strict";
import * as DBF from './DBFunc.js';

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


describe('Inserting subscriber', () => {
    const validSub = {
        email: 'test@email.net',
        howOften: 'monthly'
    };

    test('Returns valid id after inserting valid subscriber', async () => {
        const id = await DBF.insertSubscriber(validSub);
        await DBF.deleteSubscriberById(id);
        expect(id).not.toBeNaN();
    });

    test('Returns null when trying to insert repeat subscriber', async () => {
        const validId = await DBF.insertSubscriber(validSub);
        const badId = await DBF.insertSubscriber(validSub);
        await DBF.deleteSubscriberById(validId);
        expect(badId).toBeNull();
    });
    
    test('Returns null after trying to insert invalid subscriber', async () => {
        let badId = await DBF.insertSubscriber({});
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber({email: {}});
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber({email: 1});
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber({howOften: 9});
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber({howOften: 'yearly'});
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber('');
        expect(badId).toBeNull();
        badId = await DBF.insertSubscriber(1);
        expect(badId).toBeNull();
    })
});
    
describe('Selecting subscriber', () => {
    let testSub = {
        email: 'test2@email.net',
        howOften: 'yearly'
    };
    let testId;

    beforeAll(async () => {
        testId = await DBF.insertSubscriber(testSub);
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

describe('Deleting subscribers', () => {
    let tempSub = {
        email: 'deleteme@email.com',
        howOften: 'bimonthly'
    };
    let id;

    beforeAll(async () => {
        id = await DBF.insertSubscriber(tempSub);
    });

    test('Successfully deletes subscriber', async () => {
        let numDeleted = await DBF.deleteSubscriberById(id);
        expect(numDeleted).toEqual(1);
        let sub = await DBF.selectSubscriberById(id);
        expect(sub).toBeNull();
    });
});