const { Given,When,Then, BeforeAll } = require('@cucumber/cucumber')
const assert = require('assert')
const {GeoPoint, getFirestore, doc, getDoc, deleteDoc} = require("@firebase/firestore");
const FirebaseDb = require("../../app/FirebaseDb");

let dbInstance;
let dbConnection;
let dataToAdd;
let addedId;

let searchResults;
let activityId;
let reservationId;
const testUserId = "test-user-cucumber";

BeforeAll(async () => {
    dbInstance = await FirebaseDb.create();
    dbConnection = getFirestore();
})

// ── ADD GYM ──────────────────────────────────────────────
Given('the data of a new gym', function () {
    dataToAdd = {
        name: "Test Gym",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: new GeoPoint(0, 0)
    }
});

When('this data is added to the system', async function () {
    addedId = await dbInstance.addGym(dataToAdd);
});

Then('the new gym appears on the database', async function () {
    const dbGymRef = doc(dbConnection, "gyms", addedId);
    const dbGym = await getDoc(dbGymRef);
    const gymData = dbGym.data();
    await deleteDoc(dbGymRef);
    assert(gymData.name === "Test Gym");
    assert(gymData.description === "Test description");
    assert(gymData.location.isEqual(new GeoPoint(0, 0)));
    assert(gymData.contactInfo === "Phone: 123456789");
    assert(gymData.schedule === "14:00-20:00");
    assert(gymData.rating === 0);
    assert(gymData.ratingCount === 0);
})

// ── SEARCH GYM ───────────────────────────────────────────
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
    assert(found, "The gym was not found in search results");
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});

// ── BOOK GYM ─────────────────────────────────────────────
Given('there is an activity with available slots', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Book",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: new GeoPoint(0, 0)
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity",
        slots: 10,
        maxCancelDate: new Date(Date.now() + 86400000).toISOString()
    });
});

When('the user books the activity', async () => {
    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

Then('the reservation appears in the database with status active', async () => {
    const snap = await getDoc(doc(dbConnection, "reservations", reservationId));
    const data = snap.data();
    assert(snap.exists(), "Reservation does not exist");
    assert(data.status === "active", "Status is not active");
    assert(data.userId === testUserId, "UserId does not match");
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});

// ── CANCEL BOOKING ───────────────────────────────────────
Given('the user has an active reservation', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Cancel",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: new GeoPoint(0, 0)
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Cancel",
        slots: 10,
        maxCancelDate: new Date(Date.now() + 86400000).toISOString()
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

When('the user cancels the reservation', async () => {
    await dbInstance.cancelReservation(reservationId);
});

Then('the reservation status is cancelled in the database', async () => {
    const snap = await getDoc(doc(dbConnection, "reservations", reservationId));
    const data = snap.data();
    assert(snap.exists(), "Reservation does not exist");
    assert(data.status === "cancelled", "Status is not cancelled");
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});