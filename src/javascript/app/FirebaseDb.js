// FirebaseDb.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class FirebaseDb {

    constructor() {
        this.db = null;
        this.app = null;
    }

    static async create() {
        const instance = new FirebaseDb();
        await instance._init();
        return instance;
    }

    async _init() {
        const response = await fetch("../assets/firebaseConfig.json");
        const firebaseConfig = await response.json();
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
    }

    async makeReservation(userId, activityId, gymOrProId) {
        const reservationsRef = collection(this.db, "reservations");
        const docRef = await addDoc(reservationsRef, {
            userId,
            activityId,
            gymOrProId,
            status: "active",
            paid: false,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    async cancelReservation(reservationId) {
        const reservationRef = doc(this.db, "reservations", reservationId);
        await updateDoc(reservationRef, {
            status: "cancelled"
        });
    }

    async findGymsByDistance(lat, lng, radiusKm = 10) {
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        const gymsRef = collection(this.db, "gyms");
        const q = query(
            gymsRef,
            where("location.lat", ">=", lat - latDelta),
            where("location.lat", "<=", lat + latDelta)
        );

        const snapshot = await getDocs(q);
        const gyms = [];

        snapshot.forEach(docSnap => {
            const gym = { id: docSnap.id, ...docSnap.data() };
            if (
                gym.location.lng >= lng - lngDelta &&
                gym.location.lng <= lng + lngDelta
            ) {
                gyms.push(gym);
            }
        });

        return gyms;
    }

    async addGym(gymData) {
        const gymsRef = collection(this.db, "gyms");
        const docRef = await addDoc(gymsRef, {
            ...gymData,
            rating: 0,
            ratingCount: 0,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    async addProfessional(proData) {
        const prosRef = collection(this.db, "professionals");
        const docRef = await addDoc(prosRef, {
            ...proData,
            rating: 0,
            ratingCount: 0,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    async addActivity(ownerId, ownerType, activityData) {
        const activitiesRef = collection(this.db, "activities");
        const docRef = await addDoc(activitiesRef, {
            ownerId,
            ownerType,
            ...activityData,
            availableSlots: activityData.slots,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    async getUserReservations(userId, status = null) {
        const reservationsRef = collection(this.db, "reservations");
        const conditions = [where("userId", "==", userId)];
        if (status) conditions.push(where("status", "==", status));

        const q = query(reservationsRef, ...conditions);
        const snapshot = await getDocs(q);

        const reservations = [];
        snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
        return reservations;
    }

    async getActivityReservations(activityId) {
        const reservationsRef = collection(this.db, "reservations");
        const q = query(
            reservationsRef,
            where("activityId", "==", activityId),
            where("status", "==", "active")
        );
        const snapshot = await getDocs(q);

        const reservations = [];
        snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
        return reservations;
    }

    async rateTarget(targetId, targetType, score) {
        const colName = targetType === "gym" ? "gyms" : "professionals";
        const targetRef = doc(this.db, colName, targetId);
        const targetSnap = await getDoc(targetRef);

        if (!targetSnap.exists()) throw new Error("Entidad no encontrada");

        const { rating, ratingCount } = targetSnap.data();
        const newCount = ratingCount + 1;
        const newRating = ((rating * ratingCount) + score) / newCount;

        await updateDoc(targetRef, {
            rating: newRating,
            ratingCount: newCount
        });
    }
}

export default FirebaseDb;