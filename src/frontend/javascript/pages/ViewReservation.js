import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ── Firebase init desde JSON ───────────────────────────────────
let app;
try {
    app = getApp();
} catch {
    const response = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();
    app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db   = getFirestore(app);

// ── DIAGNÓSTICO: borra esto cuando funcione ────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("NO HAY SESIÓN → redirigiendo");
        window.location.href = "Login.html";
        return;
    }

    console.log("UID de Auth:", user.uid);
    console.log("Email:", user.email);

    const userSnap = await getDoc(doc(db, "users", user.uid));
    console.log("Doc existe en users:", userSnap.exists());
    if (userSnap.exists()) {
        console.log("Role:", userSnap.data().role);
    }

    // COMENTADO temporalmente para no redirigir
    // if (!userSnap.exists() || userSnap.data().role !== "gym") {
    //     window.location.href = "Index.html";
    //     return;
    // }

    loadDashboard(user.uid);
});

// ── Carga solo las actividades del gimnasio logueado ───────────
async function loadDashboard(gymUid) {
    const container = document.getElementById('activities-list');

    try {
        // Solo actividades donde ownerId == UID del gimnasio logueado
        const q = query(
            collection(db, "activities"),
            where("ownerId", "==", gymUid),
            where("ownerType", "==", "gym")
        );
        const actSnap = await getDocs(q);
        container.innerHTML = "";

        if (actSnap.empty) {
            container.innerHTML = "<p>No tienes actividades creadas aún.</p>";
            return;
        }

        for (const actDoc of actSnap.docs) {
            const actData = actDoc.data();
            const actId   = actDoc.id;

            const activitySection = document.createElement('div');
            activitySection.className = 'activity-group';
            activitySection.innerHTML = `
                <div class="activity-summary">
                    <div class="activity-summary-left">
                        <p><strong>Actividad:</strong> ${actData.name}</p>
                        <p><strong>Horario:</strong> ${actData.schedule || 'Sin horario'}</p>
                        <p><strong>Fecha:</strong> ${actData.date || 'Sin fecha'}</p>
                    </div>
                    <div class="activity-summary-right">
                        <p><strong>Precio:</strong> ${actData.price}€</p>
                        <p><strong>Plazas disponibles:</strong> <span id="slots-${actId}">${actData.availableSlots ?? actData.slots}</span></p>
                    </div>
                </div>
                <div class="users-list" id="users-container-${actId}">
                    <p style="padding:10px; font-size:0.9em; color:gray;">Buscando participantes...</p>
                </div>
            `;
            container.appendChild(activitySection);

            loadParticipants(actId);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Error al cargar datos.</p>";
    }
}

// ── Carga los usuarios inscritos en una actividad ──────────────
async function loadParticipants(activityId) {
    const listDiv = document.getElementById(`users-container-${activityId}`);

    try {
        const q = query(
            collection(db, "reservations"),
            where("activityId", "==", activityId),
            where("status", "==", "active")
        );
        const resSnap = await getDocs(q);

        if (resSnap.empty) {
            listDiv.innerHTML = "<p style='padding:10px; color:gray;'>No hay usuarios inscritos.</p>";
            return;
        }

        listDiv.innerHTML = "";

        for (const resDoc of resSnap.docs) {
            const resData  = resDoc.data();

            // Buscar nombre del usuario en la colección "users"
            const userSnap = await getDoc(doc(db, "users", resData.userId));
            const userData = userSnap.exists() ? userSnap.data() : null;
            const userName = userData
                ? `${userData.name} ${userData.surname || ''}`.trim()
                : "Usuario Anónimo";

            const row = document.createElement('div');
            row.className = 'user-row';
            row.innerHTML = `
                <span class="user-name">${userName}</span>
                <button class="veto-btn" data-res-id="${resDoc.id}" data-act-id="${activityId}">
                    🚫 Vetar
                </button>
            `;

            // Listener en el botón (evita usar onclick inline con parámetros)
            row.querySelector('.veto-btn').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                handleVeto(btn.dataset.resId, btn.dataset.actId, btn);
            });

            listDiv.appendChild(row);
        }
    } catch (e) {
        console.error("Error cargando participantes:", e);
        listDiv.innerHTML = "<p style='color:red;'>Error al cargar participantes.</p>";
    }
}

// ── Vetar usuario ──────────────────────────────────────────────
async function handleVeto(reservationId, activityId, btn) {
    if (!confirm("¿Seguro que quieres vetar a este usuario?")) return;

    try {
        await updateDoc(doc(db, "reservations", reservationId), { status: "vetoed" });
        await updateDoc(doc(db, "activities", activityId), { availableSlots: increment(1) });

        btn.textContent = '✓ Vetado';
        btn.disabled    = true;
        btn.closest('.user-row').classList.add('user-row--vetoed');

        const slotSpan = document.getElementById(`slots-${activityId}`);
        if (slotSpan) slotSpan.textContent = parseInt(slotSpan.textContent) + 1;

    } catch (e) {
        console.error(e);
        alert("Error al procesar el veto.");
    }
}

window.handleVeto = handleVeto;