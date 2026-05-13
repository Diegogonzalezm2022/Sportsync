const API_BASE_URL = (window.__API_BASE_URL__) || 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getAuthHeader() {
    if (!this.token) return {};
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.getAuthHeader(), ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async createUser(userData, userId) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ userData, userId })
    });
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async setUserRole(id, role) {
    return this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }

  async getGyms(lat, lng, radius) {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat);
    if (lng) params.append('lng', lng);
    if (radius) params.append('radiusKm', radius);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/gyms${query}`);
  }

  async getGym(id) {
    return this.request(`/gyms/${id}`);
  }

  async createGym(gymData, ownerId = null) {
    return this.request('/gyms', {
      method: 'POST',
      body: JSON.stringify({ gymData, ownerId })
    });
  }

  async updateGym(id, gymData) {
    return this.request(`/gyms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gymData)
    });
  }

  async getProfessionals(lat, lng, radius) {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat);
    if (lng) params.append('lng', lng);
    if (radius) params.append('radiusKm', radius);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/professionals${query}`);
  }

  async getProfessional(id) {
    return this.request(`/professionals/${id}`);
  }

  async createProfessional(proData, ownerId = null) {
    return this.request('/professionals', {
      method: 'POST',
      body: JSON.stringify({ proData, ownerId })
    });
  }

  async updateProfessional(id, proData) {
    return this.request(`/professionals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(proData)
    });
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async getActivities(ownerId, ownerType) {
    const params = new URLSearchParams();
    if (ownerId) params.append('ownerId', ownerId);
    if (ownerType) params.append('ownerType', ownerType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/activities${query}`);
  }

  async getActivitiesByOwner(ownerId) {
    const params = new URLSearchParams();
    params.append('ownerId', ownerId);
    return this.request(`/activities?${params.toString()}`);
  }

  async getActivity(id) {
    return this.request(`/activities/${id}`);
  }

  async createActivity(ownerId, ownerType, activityData) {
    return this.request('/activities', {
      method: 'POST',
      body: JSON.stringify({ ownerId, ownerType, activityData })
    });
  }

  async updateActivity(id, activityData) {
    return this.request(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ activityData })
    });
  }

  async deleteActivity(id) {
    return this.request(`/activities/${id}`, {
      method: 'DELETE'
    });
  }

  async makeReservation(userId, activityId, gymOrProId, ownerType) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify({ userId, activityId, gymOrProId, ownerType })
    });
  }

  async completeReservation(id) {
    return this.request(`/reservations/${id}/complete`, {
      method: 'POST'
    });
  }

  async rateReservation(id, score) {
    return this.request(`/reservations/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score })
    });
  }

  async cancelReservation(id) {
    return this.request(`/reservations/${id}/cancel`, {
      method: 'POST'
    });
  }

  async reactivateReservation(id) {
    return this.request(`/reservations/${id}/reactivate`, {
      method: 'POST'
    });
  }

  async deleteReservation(id) {
    return this.request(`/reservations/${id}`, {
      method: 'DELETE'
    });
  }

  async getComments(ownerId, ownerType) {
    const params = new URLSearchParams();
    if (ownerId) params.append('ownerId', ownerId);
    if (ownerType) params.append('ownerType', ownerType);
    return this.request(`/comments?${params.toString()}`);
  }

  async deleteComment(id) {
    console.log("Aún no implementado")
  }

  async getUserReservations(userId, status = null) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users/${userId}/reservations${query}`);
  }

  async getActivityReservations(activityId) {
    return this.request(`/activities/${activityId}/reservations`);
  }

  async rateTarget(targetId, targetType, score) {
    return this.request('/rate', {
      method: 'POST',
      body: JSON.stringify({ targetId, targetType, score })
    });
  }

  async addMaterial(materialData) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({ materialData })
    });
  }
}

const api = new ApiService();
export default api;
