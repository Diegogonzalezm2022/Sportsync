import { Given, When, Then, BeforeAll } from '@cucumber/cucumber';
import assert from 'assert';
import FirebaseDb from '../../app/FirebaseDb.js';

let dbInstance;
let dataToAdd;
let addedId;
let searchResults;
let activityId;
let activityId2;
let reservationId;
let reservationId2;
const testUserId = "test-user-cucumber";

BeforeAll(async () => {
    dbInstance = FirebaseDb.create();
});

// ── ADD GYM ──────────────────────────────────────
Given('the data of a new gym', function () {
    dataToAdd = {
        name: "Test Gym",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: { lat: 0, lng: 0 }
    };
});

When('the gym is added to the system', async function () {
    addedId = await dbInstance.addGym(dataToAdd);
});

Then('the new gym appears on the database', async function () {
    const gym = await dbInstance.getGym(addedId);
    // Cleanup
    // In a real test we would delete, but with firebase-admin we need the backend route
    assert.strictEqual(gym.name, "Test Gym");
    assert.strictEqual(gym.description, "Test description");
    assert.deepStrictEqual(gym.location, { lat: 0, lng: 0 });
    assert.strictEqual(gym.contactInfo, "Phone: 123456789");
    assert.strictEqual(gym.schedule, "14:00-20:00");
    assert.strictEqual(gym.rating, 0);
    assert.strictEqual(gym.ratingCount, 0);
});

// ── ADD PROFESSIONAL ──────────────────────────────────────
Given('the data of a new professional', function () {
    dataToAdd = {
        name: "Test Professional",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: { lat: 0, lng: 0 }
    };
});

When('the professional is added to the system', async function () {
    addedId = await dbInstance.addProfessional(dataToAdd);
});

Then('the new professional appears on the database', async function () {
    const pro = await dbInstance.getProfessional(addedId);
    assert.strictEqual(pro.name, "Test Professional");
    assert.strictEqual(pro.description, "Test description");
    assert.deepStrictEqual(pro.location, { lat: 0, lng: 0 });
    assert.strictEqual(pro.contactInfo, "Phone: 123456789");
    assert.strictEqual(pro.schedule, "14:00-20:00");
    assert.strictEqual(pro.rating, 0);
    assert.strictEqual(pro.ratingCount, 0);
});

// ── SEARCH GYM ───────────────────────────────────
Given('there is a gym near coordinates {float} and {float}', async (lat, lng) => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Search",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "08:00-22:00",
        location: { lat, lng }
    });
});

When('the user searches for gyms within {int} km of {float} and {float}', async (radius, lat, lng) => {
    searchResults = await dbInstance.findGymsByDistance(lat, lng, radius);
});

Then('the gym appears in the search results', async () => {
    const found = searchResults.some(gym => gym.id === addedId);
    assert.strictEqual(found, true, "The gym was not found in search results");
});

Then('the gym does not appear in the search results', async () => {
    const found = searchResults.some(gym => gym.id === addedId);
    assert.strictEqual(found, false, "The gym was found in search results");
});

// ── BOOK GYM ─────────────────────────────────────
Given('there is an activity with available slots', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Book",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: { lat: 0, lng: 0 }
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
    });
});

When('the user books the activity', async () => {
    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

Then('the reservation appears in the database with status active', async () => {
    const reservations = await dbInstance.getActivityReservations(activityId);
    const reservation = reservations.find(r => r.id === reservationId);
    assert.ok(reservation, "Reservation does not exist");
    assert.strictEqual(reservation.status, "active", "Status is not active");
    assert.strictEqual(reservation.userId, testUserId, "UserId does not match");
});

// ── CANCEL BOOKING ───────────────────────────────────────
Given('the user has an active reservation', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Cancel",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: { lat: 0, lng: 0 }
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Cancel",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

When('the user cancels the reservation', async () => {
    await dbInstance.cancelReservation(reservationId);
});

Then('the reservation status is cancelled in the database', async () => {
    const reservations = await dbInstance.getActivityReservations(activityId);
    const reservation = reservations.find(r => r.id === reservationId);
    // After cancelation, it shouldn't appear in active reservations
    assert.ok(!reservation, "Reservation should not appear in active reservations");
});

// ── AVAILABLE SLOTS UPDATING WHEN MAKING A RESERVATION ───────────────────────────────────────
Then("the activity's available slots are reduced by one", async () => {
    const activity = await dbInstance.getActivity(activityId);
    assert.strictEqual(activity.availableSlots, 9);
});

// ── AVAILABLE SLOTS UPDATING WHEN MAKING CANCELLING ───────────────────────────────────────
Then("the activity's available slots are increased by one", async () => {
    const activity = await dbInstance.getActivity(activityId);
    assert.strictEqual(activity.availableSlots, 10);
});

// ── ADDING ACTIVITIES ───────────────────────────────────────

let type;

Given("a gym that exists in the database", async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: { lat: 0, lng: 0 }
    });
    type = "gym";
});

Given("a professional that exists in the database", async () => {
    addedId = await dbInstance.addProfessional({
        name: "Test Professional",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: { lat: 0, lng: 0 }
    });
    type = "professional";
});

When('they create an activity', async () => {
    activityId = await dbInstance.addActivity(addedId, type, {
        name: "Test activity",
        maxCancelDate: new Date(2026, 7, 8),
        price: 11.99,
        availableSlots: 20,
        schedule: new Date(2026, 8, 8, 14),
    });
});

Then('the activity appears in the database', async () => {
    const activityData = await dbInstance.getActivity(activityId);
    assert.strictEqual(activityData.name, "Test activity");
    assert.strictEqual(activityData.ownerId, addedId);
    assert.strictEqual(activityData.ownerType, type);
    assert.strictEqual(activityData.price, 11.99);
    assert.strictEqual(activityData.availableSlots, 20);
});

// ── LIMIT CANCELLATIONS ───────────────────────────────────────
let cancellationResult;

Given('the activity has a cancellation deadline in the future', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Limit",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: { lat: 0, lng: 0 }
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Limit",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

Given('the activity has a cancellation deadline in the past', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Limit",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: { lat: 0, lng: 0 }
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Limit",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() - 86400000)
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

When('the user tries to cancel the reservation', async () => {
    try {
        cancellationResult = await dbInstance.cancelReservation(reservationId);
    } catch (error) {
        cancellationResult = { error: error.message };
    }
});

Then('the cancellation is accepted', async () => {
    assert.ok(cancellationResult.success, "The cancellation should have been accepted");
});

Then('the cancellation is rejected', async () => {
    assert.ok(cancellationResult.error, "The cancellation should have been rejected");
});

// ── GET USER HISTORY ───────────────────────────────────────
Given('the user has an active and a cancelled reservation', async () => {
    const existingReservations = await dbInstance.getUserReservations(testUserId);
    for (const res of existingReservations) {
        await dbInstance.deleteReservation(res.id);
    }

    addedId = await dbInstance.addGym({
        name: "Test Gym Book",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: { lat: 0, lng: 0 }
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
    });

    activityId2 = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Cancel",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
    reservationId2 = await dbInstance.makeReservation(testUserId, activityId2, addedId);

    await dbInstance.cancelReservation(reservationId2);
});

// -- Scenario 1: --
When('the user requests their complete reservation history', async () => {
    searchResults = await dbInstance.getUserReservations(testUserId);
});

Then('the system returns a list with both reservations', async () => {
    assert.strictEqual(searchResults.length, 2, "Expected exactly 2 reservations");

    const hasActive = searchResults.some(r => r.id === reservationId && r.status === "active");
    const hasCancelled = searchResults.some(r => r.id === reservationId2 && r.status === "cancelled");

    assert.ok(hasActive, "Active reservation missing");
    assert.ok(hasCancelled, "Cancelled reservation missing");
});

// -- Scenario 2: Filtrado solo por activas --
When('the user requests only active reservations', async () => {
    searchResults = await dbInstance.getUserReservations(testUserId, "active");
});

Then('the system returns a list with only the active reservation', async () => {
    assert.strictEqual(searchResults.length, 1, "Expected exactly 1 active reservation");
    assert.strictEqual(searchResults[0].id, reservationId, "The returned reservation is not the active one");
    assert.strictEqual(searchResults[0].status, "active", "The status is not active");
});
