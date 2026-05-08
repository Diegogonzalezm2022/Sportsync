// FirebaseDb.js
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
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
    serverTimestamp,
    setDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"

export default class FirebaseDb {

    constructor() {
        this.db = null;
        this.app = null;
    }

    static async create(firebaseConfig = null) {
        const instance = new FirebaseDb();
        await instance._init(firebaseConfig);
        return instance;
    }

    async _init(firebaseConfig = null) {
        try {
            this.app = getApp();
        } catch (error) {
            if (!firebaseConfig) throw new Error("firebaseConfig requerido para inicializar Firebase");
            this.app = initializeApp(firebaseConfig);
        }
        this.db = getFirestore(this.app);
    }

    async makeReservation(userId, activityId, gymOrProId, ownerType) {
        const activityRef = doc(this.db, "activities", activityId);
        const activity = await getDoc(activityRef);
        const availableSlots = activity.data().availableSlots;
        if (availableSlots <= 0) {
            throw new Error("Activity full");
        }
        const reservationsRef = collection(this.db, "reservations");
        const docRef = await addDoc(reservationsRef, {
            userId,
            activityId,
            gymOrProId,
            ownerType: ownerType || null,
            status: "active",
            paid: false,
            createdAt: serverTimestamp()
        });
        await updateDoc(activityRef, {
            availableSlots: availableSlots - 1
        });
        return docRef.id;
    }

    async cancelReservation(reservationId) {
        const reservationRef = doc(this.db, "reservations", reservationId);
        const reservation = await getDoc(reservationRef);
        const activityId = reservation.data().activityId;
        const activityRef = doc(this.db, "activities", activityId);
        const activity = await getDoc(activityRef);

        const maxCancelDate = activity.data().maxCancelDate;
        if (maxCancelDate) {
            const cancelDate = typeof maxCancelDate.toDate === "function"
                ? maxCancelDate.toDate()
                : new Date(maxCancelDate);
            if (cancelDate < new Date()) {
                throw new Error("Cancel limit passed");
            }
        }

        await updateDoc(reservationRef, { status: "cancelled" });
        await updateDoc(activityRef, {
            availableSlots: activity.data().availableSlots + 1
        });

        return { success: true };
    }

    async reactivateReservation(reservationId) {
        const reservationRef = doc(this.db, "reservations", reservationId);
        const reservation = await getDoc(reservationRef);
        const activityId = reservation.data().activityId;
        const activityRef = doc(this.db, "activities", activityId);
        const activity = await getDoc(activityRef);
        const actData = activity.data();

        if ((actData.availableSlots ?? 0) <= 0) {
            throw new Error("No hay plazas disponibles");
        }

        const maxCancelDate = actData.maxCancelDate;
        if (maxCancelDate) {
            const cancelDate = typeof maxCancelDate.toDate === "function"
                ? maxCancelDate.toDate()
                : new Date(maxCancelDate);
            if (cancelDate < new Date()) {
                throw new Error("La actividad ya no admite nuevas reservas");
            }
        }

        await updateDoc(reservationRef, { status: "active" });
        await updateDoc(activityRef, {
            availableSlots: actData.availableSlots - 1
        });

        return { success: true };
    }

    async deleteReservation(reservationId) {
        const reservationRef = doc(this.db, "reservations", reservationId);
        await deleteDoc(reservationRef);
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

    async addGym(gymData, ownerId = null) {
        if (!ownerId) {
            const gymsRef = collection(this.db, "gyms");
            const docRef = await addDoc(gymsRef, {
                ...gymData,
                rating: 0,
                ratingCount: 0,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } else {
            await setDoc(doc(this.db, "gyms", ownerId), {
                ...gymData,
                rating: 0,
                ratingCount: 0,
                createdAt: serverTimestamp()
            });
            return ownerId;
        }
    }

    async addProfessional(proData, ownerId = null) {
        if (!ownerId) {
            const prosRef = collection(this.db, "professionals");
            const docRef = await addDoc(prosRef, {
                ...proData,
                rating: 0,
                ratingCount: 0,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } else {
            await setDoc(doc(this.db, "professionals", ownerId), {
                ...proData,
                rating: 0,
                ratingCount: 0,
                createdAt: serverTimestamp()
            });
            return ownerId;
        }
    }

    async addUser(userData, userId = null) {
        const usersRef = collection(this.db, "users");
        if (!userId) {
            const docRef = await addDoc(usersRef, {
                ...userData,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } else {
            await setDoc(doc(this.db, "users", userId), {
                ...userData,
                createdAt: serverTimestamp()
            });
            return userId;
        }
    }

    async setUserRole(userId, role) {
        const userRef = doc(this.db, "users", userId);
        await updateDoc(userRef, { role });
    }

    async getUser(userId) {
        const userRef = doc(this.db, "users", userId);
        const userDoc = await getDoc(userRef);
        return userDoc.exists() ? userDoc.data() : {};
    }

    async getGym(gymId) {
        const gymRef = doc(this.db, "gyms", gymId);
        const gymDoc = await getDoc(gymRef);
        return gymDoc.exists() ? gymDoc.data() : null;
    }

    async getProfessional(proId) {
        const proRef = doc(this.db, "professionals", proId);
        const proDoc = await getDoc(proRef);
        return proDoc.exists() ? proDoc.data() : null;
    }

    async addMaterial(materialData) {
        const materialsRef = collection(this.db, "materials");
        await addDoc(materialsRef, {
            ...materialData,
            rating: 0,
            ratingCount: 0,
            createdAt: serverTimestamp()
        });
    }

    async addActivity(ownerId, ownerType, activityData) {
        const activitiesRef = collection(this.db, "activities");
        const docRef = await addDoc(activitiesRef, {
            ownerId,
            ownerType,
            ...activityData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    }

    async getActivity(activityId) {
        const activityRef = doc(this.db, "activities", activityId);
        const activityDoc = await getDoc(activityRef);
        return activityDoc.exists() ? activityDoc.data() : null;
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
        if (targetType !== "gym" && targetType !== "professional") {
            throw new Error("targetType must be a gym or professional");
        }
        const colName = targetType === "gym" ? "gyms" : "professionals";
        const targetRef = doc(this.db, colName, targetId);
        const targetSnap = await getDoc(targetRef);

        if (!targetSnap.exists()) throw new Error("Entidad no encontrada");

        const { rating, ratingCount } = targetSnap.data();
        const newCount = ratingCount + 1;
        const newRating = ((rating * ratingCount) + score) / newCount;

        await updateDoc(targetRef, { rating: newRating, ratingCount: newCount });
    }
    async completeReservation(reservationId) {
        const reservationRef = doc(this.db, "reservations", reservationId);
        await updateDoc(reservationRef, { status: "done" });
        return { success: true };
    }

    async rateReservation(reservationId, score) {
        if (score < 1 || score > 5) throw new Error("La puntuación debe estar entre 1 y 5");

        const reservationRef = doc(this.db, "reservations", reservationId);
        const reservationSnap = await getDoc(reservationRef);

        if (!reservationSnap.exists()) throw new Error("Reserva no encontrada");

        const resData = reservationSnap.data();
        if (resData.status !== "done") throw new Error("Solo se pueden valorar reservas completadas");
        if (resData.userRating != null) throw new Error("Ya has valorado esta reserva");

        const { gymOrProId, ownerType } = resData;
        const colName = ownerType === "gym" ? "gyms" : "professionals";
        const targetRef = doc(this.db, colName, gymOrProId);
        const targetSnap = await getDoc(targetRef);

        if (!targetSnap.exists()) throw new Error("Entidad no encontrada");

        const { rating = 0, ratingCount = 0 } = targetSnap.data();
        const newCount  = ratingCount + 1;
        const newRating = ((rating * ratingCount) + score) / newCount;

        await updateDoc(reservationRef, { userRating: score });
        await updateDoc(targetRef, { rating: newRating, ratingCount: newCount });

        return { success: true, newRating, newCount };
    }
}