// FirebaseDb.js - Backend database layer using Firebase Admin SDK
import admin from 'firebase-admin';

const { Timestamp } = admin.firestore;

class FirebaseDb {

    constructor() {
        this.db = null;
    }

    static create() {
        const instance = new FirebaseDb();
        // Asegurar que admin esté inicializado
        if (!admin.apps.length) {
            try {
                admin.initializeApp({
                    projectId: 'proyecto2026ps'
                });
            } catch (e) {
                // Ya está inicializado
            }
        }
        instance.db = admin.firestore();
        return instance;
    }

    async makeReservation(userId, activityId, gymOrProId) {
        const activityRef = this.db.collection("activities").doc(activityId);
        const activitySnap = await activityRef.get();

        if (!activitySnap.exists) {
            throw new Error("Activity not found");
        }

        const availableSlots = activitySnap.data().availableSlots;
        if (availableSlots <= 0) {
            throw new Error("Activity full");
        }

        const reservationRef = await this.db.collection("reservations").add({
            userId: userId,
            activityId: activityId,
            gymOrProId: gymOrProId,
            status: "active",
            paid: false,
            createdAt: Timestamp.now()
        });

        await activityRef.update({
            availableSlots: availableSlots - 1
        });

        return reservationRef.id;
    }

    async cancelReservation(reservationId) {
        const reservationRef = this.db.collection("reservations").doc(reservationId);
        const reservationSnap = await reservationRef.get();

        if (!reservationSnap.exists) {
            throw new Error("Reservation not found");
        }

        const activityId = reservationSnap.data().activityId;
        const activityRef = this.db.collection("activities").doc(activityId);
        const activitySnap = await activityRef.get();

        if (!activitySnap.exists) {
            throw new Error("Activity not found");
        }

        const maxCancelDate = activitySnap.data().maxCancelDate;
        if (maxCancelDate && maxCancelDate.toDate() < new Date()) {
            throw new Error("Cancel limit passed");
        }

        await reservationRef.update({
            status: "cancelled"
        });

        await activityRef.update({
            availableSlots: admin.firestore.FieldValue.increment(1)
        });

        return { success: true };
    }

    async reactivateReservation(reservationId) {
        const reservationRef = this.db.collection("reservations").doc(reservationId);
        const reservationSnap = await reservationRef.get();

        if (!reservationSnap.exists) {
            throw new Error("Reservation not found");
        }

        const activityId = reservationSnap.data().activityId;
        const activityRef = this.db.collection("activities").doc(activityId);
        const activitySnap = await activityRef.get();

        if (!activitySnap.exists) {
            throw new Error("Activity not found");
        }

        const actData = activitySnap.data();

        if ((actData.availableSlots ?? 0) <= 0) {
            throw new Error("No hay plazas disponibles");
        }

        const maxCancelDate = actData.maxCancelDate;
        if (maxCancelDate && maxCancelDate.toDate() < new Date()) {
            throw new Error("La actividad ya no admite nuevas reservas");
        }

        await reservationRef.update({
            status: "active"
        });

        await activityRef.update({
            availableSlots: admin.firestore.FieldValue.increment(-1)
        });

        return { success: true };
    }

    async deleteReservation(reservationId) {
        await this.db.collection("reservations").doc(reservationId).delete();
    }

    async findGymsByDistance(lat, lng, radiusKm = 10) {
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        const snapshot = await this.db.collection("gyms")
            .where("location.lat", ">=", lat - latDelta)
            .where("location.lat", "<=", lat + latDelta)
            .get();

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
        const data = {
            ...gymData,
            rating: 0,
            ratingCount: 0,
            createdAt: Timestamp.now()
        };

        if (!ownerId) {
            const docRef = await this.db.collection("gyms").add(data);
            return docRef.id;
        } else {
            await this.db.collection("gyms").doc(ownerId).set(data);
            return ownerId;
        }
    }

    async addProfessional(proData, ownerId = null) {
        const data = {
            ...proData,
            rating: 0,
            ratingCount: 0,
            createdAt: Timestamp.now()
        };

        if (!ownerId) {
            const docRef = await this.db.collection("professionals").add(data);
            return docRef.id;
        } else {
            await this.db.collection("professionals").doc(ownerId).set(data);
            return ownerId;
        }
    }

    async addUser(userData, userId = null) {
        const data = {
            ...userData,
            createdAt: Timestamp.now()
        };

        if (!userId) {
            const docRef = await this.db.collection("users").add(data);
            return docRef.id;
        } else {
            await this.db.collection("users").doc(userId).set(data);
            return userId;
        }
    }

    async setUserRole(userId, role) {
        await this.db.collection("users").doc(userId).update({
            role: role
        });
    }

    async getGym(gymId) {
        const gymSnap = await this.db.collection("gyms").doc(gymId).get();
        if (gymSnap.exists) {
            return { id: gymSnap.id, ...gymSnap.data() };
        } else {
            return null;
        }
    }

    async getProfessional(proId) {
        const proSnap = await this.db.collection("professionals").doc(proId).get();
        if (proSnap.exists) {
            return { id: proSnap.id, ...proSnap.data() };
        } else {
            return null;
        }
    }

    async addMaterial(materialData) {
        const data = {
            ...materialData,
            rating: 0,
            ratingCount: 0,
            createdAt: Timestamp.now()
        };
        const docRef = await this.db.collection("materials").add(data);
        return docRef.id;
    }

    async addActivity(ownerId, ownerType, activityData) {
        const data = {
            ownerId: ownerId,
            ownerType: ownerType,
            ...activityData,
            createdAt: Timestamp.now()
        };
        const docRef = await this.db.collection("activities").add(data);
        return docRef.id;
    }

    async getActivity(activityId) {
        const activitySnap = await this.db.collection("activities").doc(activityId).get();
        if (activitySnap.exists) {
            return { id: activitySnap.id, ...activitySnap.data() };
        } else {
            return null;
        }
    }

    async getUser(userId) {
        const userSnap = await this.db.collection("users").doc(userId).get();
        if (userSnap.exists) {
            return { id: userSnap.id, ...userSnap.data() };
        } else {
            return null;
        }
    }

    async getUserReservations(userId, status = null) {
        let query = this.db.collection("reservations").where("userId", "==", userId);

        if (status) {
            query = query.where("status", "==", status);
        }

        const snapshot = await query.get();
        const reservations = [];
        snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
        return reservations;
    }

    async getActivityReservations(activityId) {
        const snapshot = await this.db.collection("reservations")
            .where("activityId", "==", activityId)
            .where("status", "==", "active")
            .get();

        const reservations = [];
        snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
        return reservations;
    }

    async rateTarget(targetId, targetType, score) {
        if (targetType !== "gym" && targetType !== "professional") {
            throw new Error("targetType must be a gym or professional");
        }
        const colName = targetType === "gym" ? "gyms" : "professionals";
        const targetRef = this.db.collection(colName).doc(targetId);
        const targetSnap = await targetRef.get();

        if (!targetSnap.exists) throw new Error("Entidad no encontrada");

        const { rating, ratingCount } = targetSnap.data();
        const newCount = ratingCount + 1;
        const newRating = ((rating * ratingCount) + score) / newCount;

        await targetRef.update({
            rating: newRating,
            ratingCount: newCount
        });
    }
}

export default FirebaseDb;
