import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';

const firebaseDb = require('javascript/app/FirebaseDb');

// Initialize Firebase Admin SDK
// You must provide a service account key for full admin access.
// Download it from Firebase Console -> Project Settings -> Service Accounts
// Save it as 'serviceAccountKey.json' in the backend folder.
try {
  // Try to load service account if it exists
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

const db = firebaseDb.create();
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

// --- ROUTES ---

// Health check
app.get('/api/health', (req, res) => res.status(200).send('OK'));

// Users
app.get('/api/users/:id', authenticateUser, async (req, res) => {
  try {
    return res.json(await db.getUser(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateUser, async (req, res) => {
  try {
    const { userData, userId } = req.body;
    if (userId) {
      await db.addUser(userData, userId);
      res.json({ id: userId });
    } else {
      const id = (await db).addUser(userData)
      res.json({ id: id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/role', authenticateUser, async (req, res) => {
  try {
    await db.setUserRole(req.params.id, req.body.role)
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gyms
app.get('/api/gyms/:id', async (req, res) => {
  try {
    res.json((await db).getGym(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gyms', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });

    res.json((await db).findGymsByDistance(lat, lng, radiusKm));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gyms', authenticateUser, async (req, res) => {
  try {
    const { gymData, ownerId } = req.body;
    if (ownerId) {
      (await db).addGym(gymData, ownerId)
      res.json({ id: ownerId });
    } else {
      const id = (await db).addGym(gymData)
      res.json({ id: id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Professionals
app.get('/api/professionals/:id', async (req, res) => {
  try {
    res.json((await db).getProfessional(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/professionals', authenticateUser, async (req, res) => {
  try {
    const { proData, ownerId } = req.body;
    if (ownerId) {
      await db.addProfessional(proData, ownerId)
      res.json({ id: ownerId });
    } else {
      const id = (await db).addProfessional(proData)
      res.json({ id: id});
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activities
app.get('/api/activities/:id', async (req, res) => {
  try {
    // Firestore Timestamps need to be handled, but simple res.json might not serialize them exactly the same way.
    // Client SDK has .toDate(), we might need to convert server timestamps to ISO strings or milliseconds.
    const data = (await db).getActivity(req.params.id);
    if (data.maxCancelDate && data.maxCancelDate.toDate) {
      data.maxCancelDate = data.maxCancelDate.toDate().toISOString();
    }
    if (data.createdAt && data.createdAt.toDate) {
      data.createdAt = data.createdAt.toDate().toISOString();
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activities', authenticateUser, async (req, res) => {
  try {
    const { ownerId, ownerType, activityData } = req.body;
    
    // Convert strings back to dates if needed
    if (activityData.maxCancelDate) {
       activityData.maxCancelDate = admin.firestore.Timestamp.fromDate(Date.parse(activityData.maxCancelDate));
    }
    
    const id = (await db).addActivity(ownerId, ownerType,activityData);
    res.json({ id: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reservations
app.post('/api/reservations', authenticateUser, async (req, res) => {
  try {
    const { userId, activityId, gymOrProId } = req.body;

    /*TODO: Aplicar solución a concurrencia en API*/

    const result = (await db).makeReservation(userId, activityId, gymOrProId)
    
    res.json({ id: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/cancel', authenticateUser, async (req, res) => {
  try {

    /*TODO: Aplicar solución a concurrencia en API*/

    await db.cancelReservation(req.params.id)

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/reactivate', authenticateUser, async (req, res) => {
  try {

    /*TODO: Aplicar solución a concurrencia en API*/

    await db.reactivateReservation(req.params.id)
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reservations/:id', authenticateUser, async (req, res) => {
  try {
    await db.deleteReservation(req.params.id)
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queries for Reservations
app.get('/api/users/:id/reservations', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;
    res.json((await db).getUserReservations(req.params.id, status));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities/:id/reservations', authenticateUser, async (req, res) => {
  try {
    res.json((await db).getActivityReservations(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ratings
app.post('/api/rate', authenticateUser, async (req, res) => {
  try {
    const { targetId, targetType, score } = req.body;
    /*TODO: Aplicar solución a concurrencia en API*/
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
    const id=(await db).addMaterial(materialData)
    res.json({ id: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
