const { Given,When,Then, BeforeAll } = require('@cucumber/cucumber')
const assert = require('assert')
const {GeoPoint, Timestamp, getFirestore, doc, getDoc, deleteDoc} = require("@firebase/firestore");
const FirebaseDb = require("../../app/FirebaseDb");

let dbInstance;
let dbConnection;
let dataToAdd;
let addedId;

let searchResults;
let activityId;
let activityId2;
let reservationId;
let reservationId2;
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

When('the gym is added to the system', async function () {
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

// ── ADD PROFESSIONAL ──────────────────────────────────────────────
Given('the data of a new professional', function () {
    dataToAdd = {
        name: "Test Professional",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: new GeoPoint(0, 0)
    }
});

When('the professional is added to the system', async function () {
    addedId = await dbInstance.addProfessional(dataToAdd);
});

Then('the new professional appears on the database', async function () {
    const dbProfessionalRef = doc(dbConnection, "professionals", addedId);
    const dbProfessional = await getDoc(dbProfessionalRef);
    const professionalData = dbProfessional.data();
    await deleteDoc(dbProfessionalRef);
    assert(professionalData.name === "Test Professional");
    assert(professionalData.description === "Test description");
    assert(professionalData.location.isEqual(new GeoPoint(0, 0)));
    assert(professionalData.contactInfo === "Phone: 123456789");
    assert(professionalData.schedule === "14:00-20:00");
    assert(professionalData.rating === 0);
    assert(professionalData.ratingCount === 0);
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

Then('the gym does not appear in the search results', async () => {
    const found = searchResults.some(gym => gym.id === addedId);
    assert(!found, "The gym was found in search results");
    await deleteDoc(doc(dbConnection, "gyms", addedId));
})

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
        availableSlots: 10,
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
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() + 86400000)
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

// ── AVAILABLE SLOTS UPDATING WHEN MAKING A RESERVATION ───────────────────────────────────────
Then("the activity's available slots are reduced by one", async () => {
    const snap = await getDoc(doc(dbConnection, "activities", activityId));
    assert(snap.data().availableSlots === 9);
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
})

// ── AVAILABLE SLOTS UPDATING WHEN MAKING CANCELLING ───────────────────────────────────────
Then("the activity's available slots are increased by one", async () => {
    const snap = await getDoc(doc(dbConnection, "activities", activityId));
    assert(snap.data().availableSlots === 10);
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
})

// ── ADDING ACTIVITIES ───────────────────────────────────────

let type;

Given("a gym that exists in the database", async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: new GeoPoint(0, 0)
    })
    type="gym"
})

Given("a professional that exists in the database", async () => {
    addedId = await dbInstance.addGym({
        name: "Test Professional",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: new GeoPoint(0, 0)
    })
    type="professional"
})

When('they create an activity', async () => {
    activityId = await dbInstance.addActivity(addedId, type, {
        name: "Test activity",
        maxCancelDate: new Date(2026, 7, 8),
        price: 11.99,
        availableSlots: 20,
        schedule: new Date(2026, 8, 8, 14),
    });
})

Then('the activity appears in the database', async () => {
    const activitySnap = await getDoc(doc(dbConnection, "activities", activityId));
    const activityData = activitySnap.data();
    await deleteDoc(doc(dbConnection, "activities", activityId));
    if (type === "gym") {
        await deleteDoc(doc(dbConnection, "gyms", addedId));
    } else if (type === "professional") {
        await deleteDoc(doc(dbConnection, "professionals", activityId));
    }
    assert(activityData.name === "Test activity");
    assert(activityData.ownerId === addedId);
    assert(activityData.ownerType === type);
    assert(activityData.price === 11.99);
    assert(activityData.availableSlots === 20);
    assert(activityData.schedule.toDate().getTime() === new Date(2026, 8, 8, 14).getTime());
    assert(activityData.maxCancelDate.toDate().getTime() === new Date(2026, 7, 8).getTime());
})

// ── LIMIT CANCELLATIONS ───────────────────────────────────────
let cancellationResult;

Given('the activity has a cancellation deadline in the future', async () => {
    addedId = await dbInstance.addGym({
        name: "Test Gym Limit",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: new GeoPoint(0, 0)
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
        location: new GeoPoint(0, 0)
    });

    activityId = await dbInstance.addActivity(addedId, "gym", {
        name: "Test Activity Limit",
        availableSlots: 10,
        maxCancelDate: new Date(Date.now() - 86400000)
    });

    reservationId = await dbInstance.makeReservation(testUserId, activityId, addedId);
});

When('the user tries to cancel the reservation', async () => {
    cancellationResult = await dbInstance.cancelReservation(reservationId);
});

Then('the cancellation is accepted', async () => {
    assert(cancellationResult.success, "The cancellation should have been accepted");
    const snap = await getDoc(doc(dbConnection, "reservations", reservationId));
    assert(snap.data().status === "cancelled", "Status is not cancelled");
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});

Then('the cancellation is rejected', async () => {
    assert(!cancellationResult.success, "The cancellation should have been rejected");
    const snap = await getDoc(doc(dbConnection, "reservations", reservationId));
    assert(snap.data().status === "active", "Status should still be active");
    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});

// ── GET USER HISTORY ───────────────────────────────────────
Given('the user has an active and a cancelled reservation', async () => {
    const existingReservations = await dbInstance.getUserReservations(testUserId);
    for (const res of existingReservations) {
        await deleteDoc(doc(dbConnection, "reservations", res.id));
    }

    addedId = await dbInstance.addGym({
        name: "Test Gym Book",
        description: "Test",
        contactInfo: "Phone: 000000000",
        schedule: "08:00-22:00",
        location: new GeoPoint(0, 0)
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
    assert(searchResults.length === 2, "Expected exactly 2 reservations");

    const hasActive = searchResults.some(r => r.id === reservationId && r.status === "active");
    const hasCancelled = searchResults.some(r => r.id === reservationId2 && r.status === "cancelled");

    assert(hasActive, "Active reservation missing");
    assert(hasCancelled, "Cancelled reservation missing");

    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "reservations", reservationId2));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "activities", activityId2));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});

// -- Scenario 2: Filtrado solo por activas --
When('the user requests only active reservations', async () => {
    searchResults = await dbInstance.getUserReservations(testUserId, "active");
});

Then('the system returns a list with only the active reservation', async () => {
    assert(searchResults.length === 1, "Expected exactly 1 active reservation");
    assert(searchResults[0].id === reservationId, "The returned reservation is not the active one");
    assert(searchResults[0].status === "active", "The status is not active");

    await deleteDoc(doc(dbConnection, "reservations", reservationId));
    await deleteDoc(doc(dbConnection, "reservations", reservationId2));
    await deleteDoc(doc(dbConnection, "activities", activityId));
    await deleteDoc(doc(dbConnection, "activities", activityId2));
    await deleteDoc(doc(dbConnection, "gyms", addedId));
});