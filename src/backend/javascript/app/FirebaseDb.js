// FirebaseDb.js
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = await fetch('../../../assets/firebaseConfig.json').then(res => res.json());

export default class FirebaseDb {

    constructor() {
        this.app = null;
        this.auth = null;
    }

    static async create() {
        const instance = new FirebaseDb();
        await instance._init();
        return instance;
    }

    async _init() {
        try {
            this.app = getApp();
        } catch (error) {
            this.app = initializeApp(firebaseConfig);
        }
        this.auth = getAuth(this.app);
    }

    async _getToken() {
        if (this.auth.currentUser) {
            return await this.auth.currentUser.getIdToken();
        }
        return null;
    }

    async _fetch(endpoint, options = {}) {
        const token = await this._getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(endpoint, { ...options, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Error');
        return data;
    }

    async makeReservation(userId, activityId, gymOrProId) {
        const data = await this._fetch('/api/reservations', {
            method: 'POST',
            body: JSON.stringify({ userId, activityId, gymOrProId })
        });
        return data.id;
    }

    async cancelReservation(reservationId) {
        return await this._fetch(`/api/reservations/${reservationId}/cancel`, { method: 'POST' });
    }

    async reactivateReservation(reservationId) {
        return await this._fetch(`/api/reservations/${reservationId}/reactivate`, { method: 'POST' });
    }

    async deleteReservation(reservationId) {
        return await this._fetch(`/api/reservations/${reservationId}`, { method: 'DELETE' });
    }

    async findGymsByDistance(lat, lng, radiusKm = 10) {
        return await this._fetch(`/api/gyms?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
    }

    async addGym(gymData, ownerId = null) {
        const data = await this._fetch('/api/gyms', {
            method: 'POST',
            body: JSON.stringify({ gymData, ownerId })
        });
        return data.id;
    }

    async addProfessional(proData, ownerId = null) {
        const data = await this._fetch('/api/professionals', {
            method: 'POST',
            body: JSON.stringify({ proData, ownerId })
        });
        return data.id;
    }

    async addUser(userData, userId = null) {
        const data = await this._fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ userData, userId })
        });
        return data.id;
    }

    async setUserRole(userId, role) {
        await this._fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    }

    async getUser(userId) {
        return await this._fetch(`/api/users/${userId}`);
    }

    async getGym(gymId) {
        return await this._fetch(`/api/gyms/${gymId}`);
    }

    async getProfessional(proId) {
        return await this._fetch(`/api/professionals/${proId}`);
    }

    async addMaterial(materialData) {
        const data = await this._fetch('/api/materials', {
            method: 'POST',
            body: JSON.stringify({ materialData })
        });
        return data.id;
    }

    async addActivity(ownerId, ownerType, activityData) {
        const data = await this._fetch('/api/activities', {
            method: 'POST',
            body: JSON.stringify({ ownerId, ownerType, activityData })
        });
        return data.id;
    }

    async getActivity(activityId) {
        return await this._fetch(`/api/activities/${activityId}`);
    }

    async getUserReservations(userId, status = null) {
        let url = `/api/users/${userId}/reservations`;
        if (status) url += `?status=${status}`;
        return await this._fetch(url);
    }

    async getActivityReservations(activityId) {
        return await this._fetch(`/api/activities/${activityId}/reservations`);
    }

    async rateTarget(targetId, targetType, score) {
        return await this._fetch('/api/rate', {
            method: 'POST',
            body: JSON.stringify({ targetId, targetType, score })
        });
    }
}