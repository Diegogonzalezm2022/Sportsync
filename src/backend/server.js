import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';

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

const db = admin.firestore();
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
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
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
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) return res.json({});
    return res.json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateUser, async (req, res) => {
  try {
    const { userData, userId } = req.body;
    if (userId) {
      await db.collection('users').doc(userId).set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: userId });
    } else {
      const docRef = await db.collection('users').add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/role', authenticateUser, async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).update({
      role: req.body.role,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gyms
app.get('/api/gyms/:id', async (req, res) => {
  try {
    const gymDoc = await db.collection('gyms').doc(req.params.id).get();
    if (!gymDoc.exists) return res.json({});
    res.json(gymDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gyms', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });

    const radius = parseFloat(radiusKm) || 10;
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos(parseFloat(lat) * Math.PI / 180));

    const gymsRef = db.collection('gyms');
    const snapshot = await gymsRef
      .where("location.lat", ">=", parseFloat(lat) - latDelta)
      .where("location.lat", "<=", parseFloat(lat) + latDelta)
      .get();

    const gyms = [];
    snapshot.forEach(docSnap => {
      const gym = { id: docSnap.id, ...docSnap.data() };
      if (
        gym.location.lng >= parseFloat(lng) - lngDelta &&
        gym.location.lng <= parseFloat(lng) + lngDelta
      ) {
        gyms.push(gym);
      }
    });
    res.json(gyms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gyms', authenticateUser, async (req, res) => {
  try {
    const { gymData, ownerId } = req.body;
    if (ownerId) {
      await db.collection('gyms').doc(ownerId).set({
        ...gymData,
        rating: 0,
        ratingCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: ownerId });
    } else {
      const docRef = await db.collection('gyms').add({
        ...gymData,
        rating: 0,
        ratingCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Professionals
app.get('/api/professionals/:id', async (req, res) => {
  try {
    const proDoc = await db.collection('professionals').doc(req.params.id).get();
    if (!proDoc.exists) return res.json({});
    res.json(proDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/professionals', authenticateUser, async (req, res) => {
  try {
    const { proData, ownerId } = req.body;
    if (ownerId) {
      await db.collection('professionals').doc(ownerId).set({
        ...proData,
        rating: 0,
        ratingCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: ownerId });
    } else {
      const docRef = await db.collection('professionals').add({
        ...proData,
        rating: 0,
        ratingCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activities
app.get('/api/activities/:id', async (req, res) => {
  try {
    const docSnap = await db.collection('activities').doc(req.params.id).get();
    if (!docSnap.exists) return res.json({});
    
    // Firestore Timestamps need to be handled, but simple res.json might not serialize them exactly the same way.
    // Client SDK has .toDate(), we might need to convert server timestamps to ISO strings or milliseconds.
    const data = docSnap.data();
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
       activityData.maxCancelDate = admin.firestore.Timestamp.fromDate(new Date(activityData.maxCancelDate));
    }
    
    const docRef = await db.collection('activities').add({
      ownerId,
      ownerType,
      ...activityData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reservations
app.post('/api/reservations', authenticateUser, async (req, res) => {
  try {
    const { userId, activityId, gymOrProId } = req.body;
    
    const activityRef = db.collection('activities').doc(activityId);
    
    const result = await db.runTransaction(async (t) => {
      const activityDoc = await t.get(activityRef);
      if (!activityDoc.exists) throw new Error("Activity not found");
      
      const availableSlots = activityDoc.data().availableSlots;
      if (availableSlots <= 0) throw new Error("Activity full");
      
      const resRef = db.collection('reservations').doc();
      t.set(resRef, {
        userId,
        activityId,
        gymOrProId,
        status: "active",
        paid: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      t.update(activityRef, {
        availableSlots: availableSlots - 1
      });
      
      return resRef.id;
    });
    
    res.json({ id: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/cancel', authenticateUser, async (req, res) => {
  try {
    const reservationRef = db.collection('reservations').doc(req.params.id);
    
    await db.runTransaction(async (t) => {
      const resDoc = await t.get(reservationRef);
      if (!resDoc.exists) throw new Error("Reservation not found");
      
      const activityId = resDoc.data().activityId;
      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await t.get(activityRef);
      
      const maxCancelDate = activityDoc.data().maxCancelDate;
      if (maxCancelDate && maxCancelDate.toDate() < new Date()) {
          throw new Error("Cancel limit passed");
      }
      
      t.update(reservationRef, { status: "cancelled" });
      t.update(activityRef, {
          availableSlots: activityDoc.data().availableSlots + 1
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations/:id/reactivate', authenticateUser, async (req, res) => {
  try {
    const reservationRef = db.collection('reservations').doc(req.params.id);
    
    await db.runTransaction(async (t) => {
      const resDoc = await t.get(reservationRef);
      if (!resDoc.exists) throw new Error("Reservation not found");
      
      const activityId = resDoc.data().activityId;
      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await t.get(activityRef);
      const actData = activityDoc.data();
      
      if ((actData.availableSlots ?? 0) <= 0) {
          throw new Error("No hay plazas disponibles");
      }

      const maxCancelDate = actData.maxCancelDate;
      if (maxCancelDate && maxCancelDate.toDate() < new Date()) {
          throw new Error("La actividad ya no admite nuevas reservas");
      }
      
      t.update(reservationRef, { status: "active" });
      t.update(activityRef, {
          availableSlots: actData.availableSlots - 1
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reservations/:id', authenticateUser, async (req, res) => {
  try {
    await db.collection('reservations').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queries for Reservations
app.get('/api/users/:id/reservations', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('reservations').where('userId', '==', req.params.id);
    if (status) query = query.where('status', '==', status);
    
    const snapshot = await query.get();
    const reservations = [];
    snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities/:id/reservations', authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection('reservations')
      .where('activityId', '==', req.params.id)
      .where('status', '==', 'active')
      .get();
    
    const reservations = [];
    snapshot.forEach(docSnap => reservations.push({ id: docSnap.id, ...docSnap.data() }));
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ratings
app.post('/api/rate', authenticateUser, async (req, res) => {
  try {
    const { targetId, targetType, score } = req.body;
    if (targetType !== "gym" && targetType !== "professional") {
        return res.status(400).json({ error: "targetType must be a gym or professional" });
    }
    const colName = targetType === "gym" ? "gyms" : "professionals";
    const targetRef = db.collection(colName).doc(targetId);
    
    await db.runTransaction(async (t) => {
      const targetSnap = await t.get(targetRef);
      if (!targetSnap.exists) throw new Error("Entidad no encontrada");
      
      const { rating, ratingCount } = targetSnap.data();
      const newCount = ratingCount + 1;
      const newRating = ((rating * ratingCount) + score) / newCount;
      
      t.update(targetRef, {
        rating: newRating,
        ratingCount: newCount
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Materials
app.post('/api/materials', authenticateUser, async (req, res) => {
  try {
    const { materialData } = req.body;
    const docRef = await db.collection('materials').add({
      ...materialData,
      rating: 0,
      ratingCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
