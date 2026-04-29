import firebaseConfig from './config';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadDashboard() {
    const container = document.getElementById('activities-list');

    try {
        // 1. Traer todas las actividades
        const actSnap = await getDocs(collection(db, "activities"));
        container.innerHTML = ""; // Limpiar el "Cargando..."

        for (const actDoc of actSnap.docs) {
            const actData = actDoc.data();
            const actId = actDoc.id;

            // Creamos la estructura de la actividad
            const activitySection = document.createElement('div');
            activitySection.className = 'activity-group';
            activitySection.innerHTML = `
                <div class="activity-summary">
                    <div class="activity-summary-left">
                        <p><strong>Activity name:</strong> ${actData.name}</p>
                        <p><strong>Schedule:</strong> ${actData.schedule?.toDate().toLocaleString() || 'Sin fecha'}</p>
                    </div>
                    <div class="activity-summary-right">
                        <p><strong>Price:</strong> ${actData.price}€</p>
                        <p><strong>Available slots:</strong> <span id="slots-${actId}">${actData.availableSlots}</span></p>
                    </div>
                </div>
                <div class="users-list" id="users-container-${actId}">
                    <p style="padding:10px; font-size: 0.9em; color: gray;">Buscando participantes...</p>
                </div>
            `;
            container.appendChild(activitySection);

            // 2. Traer las reservas de esta actividad
            loadParticipants(actId);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Error al cargar datos.</p>";
    }
}

async function loadParticipants(activityId) {
    const listDiv = document.getElementById(`users-container-${activityId}`);

    // Filtramos reservas: solo las de esta actividad y que no estén canceladas/vetadas
    const q = query(collection(db, "reservations"), where("activityId", "==", activityId), where("status", "==", "active"));
    const resSnap = await getDocs(q);

    if (resSnap.empty) {
        listDiv.innerHTML = "<p style='padding:10px;'>No hay usuarios inscritos.</p>";
        return;
    }

    listDiv.innerHTML = ""; // Limpiar

    for (const resDoc of resSnap.docs) {
        const resData = resDoc.data();

        // 3. Buscar el NOMBRE del usuario usando el userId de la reserva
        const userSnap = await getDoc(doc(db, "users", resData.userId));
        const userName = userSnap.exists() ? userSnap.data().name : "Usuario Anónimo";

        const row = document.createElement('div');
        row.className = 'user-row';
        row.innerHTML = `
            <span class="user-name">${userName}</span>
            <button class="veto-btn" onclick="handleVeto('${resDoc.id}', '${activityId}', this)">Vetar</button>
        `;
        listDiv.appendChild(row);
    }
}

// Función para vetar (Backend + UI)
async function handleVeto(reservationId, activityId, btn) {
    if (!confirm("¿Seguro que quieres vetar a este usuario?")) return;

    try {
        // Actualizar Firebase
        await updateDoc(doc(db, "reservations", reservationId), { status: "vetoed" });
        await updateDoc(doc(db, "activities", activityId), { availableSlots: increment(1) });

        // UI
        btn.textContent = '✓ Vetado';
        btn.disabled = true;
        btn.closest('.user-row').classList.add('user-row--vetoed');

        // Actualizar número de plazas
        const slotSpan = document.getElementById(`slots-${activityId}`);
        slotSpan.textContent = parseInt(slotSpan.textContent) + 1;

    } catch (e) {
        alert("Error al procesar el veto.");
    }
}

// Exponer la función al objeto global window
window.handleVeto = handleVeto;

// Ejecutar al cargar la página
loadDashboard();