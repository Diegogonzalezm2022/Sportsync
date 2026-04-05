const { Given,When,Then, BeforeAll } = require('@cucumber/cucumber')
const assert = require('assert')
const {GeoPoint, getFirestore, doc, getDoc, deleteDoc} = require("@firebase/firestore");
const FirebaseDb = require("../../app/FirebaseDb");

let dbInstance;
let dbConnection;
let dataToAdd;
let addedId;

BeforeAll(async () => {
    dbInstance = await FirebaseDb.create();
    dbConnection = getFirestore();
})

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