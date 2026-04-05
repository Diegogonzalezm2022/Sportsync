const FirebaseDb = require("../../app/FirebaseDb");

const { describe, expect, test, beforeAll } = require('@jest/globals')
const {GeoPoint, collection, doc, getFirestore, getDoc, deleteDoc} = require("@firebase/firestore")

let dbInstance
let dbConnection

beforeAll(async () => {
    dbInstance = await FirebaseDb.create();
    dbConnection = getFirestore();
})

test("gymIsInsertedInDBWhenNewGymIsCreated", async ()=> {
    const addedGym = await dbInstance.addGym({
            name: "Test Gym",
            description: "Test description",
            contactInfo: "Phone: 123456789",
            schedule: "14:00-20:00",
            location: new GeoPoint(0, 0)
        });
    const dbGymRef = doc(dbConnection, "gyms", addedGym);
    const dbGym = await getDoc(dbGymRef);
    const gymData = dbGym.data();
    await deleteDoc(dbGymRef);
    expect(gymData.name).toEqual("Test Gym");
    expect(gymData.description).toEqual("Test description");
    expect(gymData.location).toEqual(new GeoPoint(0, 0));
    expect(gymData.contactInfo).toEqual("Phone: 123456789");
    expect(gymData.schedule).toEqual("14:00-20:00");
    expect(gymData.rating).toEqual(0);
    expect(gymData.ratingCount).toEqual(0);
})

test("professionalIsInsertedInDBWhenNewProfessionalIsCreated", async ()=> {
    const addedProfessional = await dbInstance.addProfessional({
        name: "Test Professional",
        description: "Test description",
        contactInfo: "Phone: 123456789",
        schedule: "14:00-20:00",
        location: new GeoPoint(0, 0)
    });
    const dbProfessionalRef = doc(dbConnection, "professionals", addedProfessional);
    const dbProfessional = await getDoc(dbProfessionalRef);
    const professionalData = dbProfessional.data();
    await deleteDoc(dbProfessionalRef);
    expect(professionalData.name).toEqual("Test Professional");
    expect(professionalData.description).toEqual("Test description");
    expect(professionalData.location).toEqual(new GeoPoint(0, 0));
    expect(professionalData.contactInfo).toEqual("Phone: 123456789");
    expect(professionalData.schedule).toEqual("14:00-20:00");
    expect(professionalData.rating).toEqual(0);
    expect(professionalData.ratingCount).toEqual(0);
})