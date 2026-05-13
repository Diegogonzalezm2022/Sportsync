import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';

import FirebaseDb from './javascript/app/FirebaseDb.js';

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = new URL('./serviceAccountKey.json', import.meta.url);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'proyecto2026ps'
  });
  console.log("Firebase Admin initialized with service account.");
} catch (e) {
  console.warn("WARNING: Could not load serviceAccountKey.json. Error:", e.message);
  console.warn("Initializing with default config. Firestore admin access may not work locally without it.");
  admin.initializeApp({ projectId: 'proyecto2026ps' });
}

const db = FirebaseDb.create();
const app = express();

app.use(cors());
app.use(express.json());

// Middleware to verify Firebase ID Token
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Helper to convert Firestore Timestamps to ISO strings
const serializeData = (data) => {
  if (!data) return data;
  const serialized = { ...data };
  for (const key of Object.keys(serialized)) {
    if (serialized[key] && typeof serialized[key].toDate === 'function') {
      serialized[key] = serialized[key].toDate().toISOString();
    }
  }
  return serialized;
};

// --- ROUTES ---

// Health check
app.get('/api/health', (req, res) => res.status(200).send('OK'));

// Users
app.get('/api/users/:id', authenticateUser, async (req, res) => {
  try {
    const user = await db.getUser(req.params.id);
    res.json(user ? serializeData(user) : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authenticateUser, async (req, res) => {
  try {
    await db.updateUser(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateUser, async (req, res) => {
  try {
    const { userData, userId } = req.body;
    const id = await db.addUser(userData, userId);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/role', authenticateUser, async (req, res) => {
  try {
    await db.setUserRole(req.params.id, req.body.role);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Admin routes ──────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

app.get('/api/admin/users', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users.map(u => serializeData(u)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const user = await db.getUser(req.params.id);
    res.json(user ? serializeData(user) : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/users/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.updateUser(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.deleteUserAccount(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gyms
app.get('/api/gyms/:id', async (req, res) => {
  try {
    const gym = await db.getGym(req.params.id);
    res.json(gym ? serializeData(gym) : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gyms', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });
    const gyms = await db.findGymsByDistance(parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
    res.json(gyms.map(g => serializeData(g)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gyms', authenticateUser, async (req, res) => {
  try {
    const { gymData, ownerId } = req.body;
    const id = await db.addGym(gymData, ownerId);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/gyms/:id', authenticateUser, async (req, res) => {
  try {
    await db.updateGym(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Professionals
app.get('/api/professionals', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });
    const professionals = await db.findProfessionalsByDistance(parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
    res.json(professionals.map(p => serializeData(p)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/professionals/:id', async (req, res) => {
  try {
    const pro = await db.getProfessional(req.params.id);
    res.json(pro ? serializeData(pro) : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/professionals', authenticateUser, async (req, res) => {
  try {
    const { proData, ownerId } = req.body;
    const id = await db.addProfessional(proData, ownerId);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/professionals/:id', authenticateUser, async (req, res) => {
  try {
    await db.updateProfessional(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activities
app.get('/api/activities', async (req, res) => {
  try {
    const { ownerId, ownerType } = req.query;

    if (ownerId) {
      const activities = await db.findActivitiesByOwner(ownerId);
      return res.json(activities.map(a => serializeData(a)));
    }

    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  try {
    const activity = await db.getActivity(req.params.id);
    res.json(activity ? serializeData(activity) : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activities', authenticateUser, async (req, res) => {
  try {
    const { ownerId, ownerType, activityData } = req.body;

    if (activityData.maxCancelDate) {
       activityData.maxCancelDate = admin.firestore.Timestamp.fromDate(new Date(activityData.maxCancelDate));
    }

    const id = await db.addActivity(ownerId, ownerType, activityData);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/activities/:id', authenticateUser, async (req, res) => {
  try {
    const { activityData } = req.body;
    await db.updateActivity(req.params.id, activityData || req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/activities/:id', authenticateUser, async (req, res) => {
  try {
    await db.deleteActivity(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reservations
app.post('/api/reservations', authenticateUser, async (req, res) => {
  try {
    const { userId, activityId, gymOrProId, ownerType } = req.body;
    const result = await db.makeReservation(userId, activityId, gymOrProId, ownerType);
    res.json({ id: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/complete', authenticateUser, async (req, res) => {
  try {
    await db.completeReservation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/rate', authenticateUser, async (req, res) => {
  try {
    const { score } = req.body;
    const result = await db.rateReservation(req.params.id, score);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/cancel', authenticateUser, async (req, res) => {
  try {
    await db.cancelReservation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/reactivate', authenticateUser, async (req, res) => {
  try {
    await db.reactivateReservation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/veto', authenticateUser, async (req, res) => {
  try {
    await db.vetoReservation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reservations/:id', authenticateUser, async (req, res) => {
  try {
    await db.deleteReservation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queries for Reservations
app.get('/api/users/:id/reservations', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;
    const reservations = await db.getUserReservations(req.params.id, status);
    res.json(reservations.map(r => serializeData(r)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities/:id/reservations', authenticateUser, async (req, res) => {
  try {
    const reservations = await db.getActivityReservations(req.params.id);
    res.json(reservations.map(r => serializeData(r)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ratings
app.post('/api/rate', authenticateUser, async (req, res) => {
  try {
    const { targetId, targetType, score } = req.body;
    await db.rateTarget(targetId, targetType, score);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Materials
app.post('/api/materials', authenticateUser, async (req, res) => {
  try {
    const { materialData } = req.body;
    const id = await db.addMaterial(materialData);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
