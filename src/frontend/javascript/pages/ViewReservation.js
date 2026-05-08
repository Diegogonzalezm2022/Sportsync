import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, where,
    doc, updateDoc, getDoc, increment
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

emailjs.init("bOhMQRr1h4BzhaNUT");

// ── Firebase init ──────────────────────────────────────────────
let app;
try {
    app = getApp();
} catch {
    const response = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();
    app = initializeApp(firebaseConfig);
}
const db = getFirestore(app);

// ── Sesión y tipo de propietario ───────────────────────────────
// Usa sessionStorage igual que GymPage y ProfessionalPage
const userId    = sessionStorage.getItem("userId");
const params    = new URLSearchParams(window.location.search);
// "type" viene de la URL: ?id=XXX&type=gym  o  ?id=XXX&type=professional
const ownerType = params.get("type") || "gym";
// El ownerId es el propio usuario logueado (solo el dueño accede aquí)
const ownerId   = params.get("id") || userId;

if (!userId) {
    window.location.href = "Login.html";
}

// ── Nombre del dueño para el email ────────────────────────────
let ownerName = "";

async function loadOwnerName() {
    const col  = ownerType === "gym" ? "gyms" : "professionals";
    const snap = await getDoc(doc(db, col, ownerId));
    ownerName  = snap.exists() ? (snap.data().name || "") : "";
}

// ── Carga el dashboard ─────────────────────────────────────────
async function loadDashboard() {
    const container = document.getElementById("activities-list");

    try {
        // ownerType dinámico: funciona tanto para "gym" como para "professional"
        const q = query(
            collection(db, "activities"),
            where("ownerId", "==", ownerId)
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

            const activitySection = document.createElement("div");
            activitySection.className = "activity-group";
            activitySection.innerHTML = `
                <div class="activity-summary">
                    <div class="activity-summary-left">
                        <p><strong>Actividad:</strong> ${actData.name}</p>
                        <p><strong>Horario:</strong>   ${actData.schedule || "Sin horario"}</p>
                        <p><strong>Fecha:</strong>     ${actData.date     || "Sin fecha"}</p>
                    </div>
                    <div class="activity-summary-right">
                        <p><strong>Precio:</strong> ${actData.price}€</p>
                        <p><strong>Plazas disponibles:</strong>
                            <span id="slots-${actId}">${actData.availableSlots ?? actData.slots}</span>
                        </p>
                    </div>
                </div>
                <div class="users-list" id="users-container-${actId}">
                    <p style="padding:10px;font-size:0.9em;color:gray;">Buscando participantes...</p>
                </div>`;
            container.appendChild(activitySection);

            loadParticipants(actId, actData);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Error al cargar datos.</p>";
    }
}

// ── Carga los usuarios inscritos en una actividad ──────────────
async function loadParticipants(activityId, actData) {
    const listDiv = document.getElementById(`users-container-${activityId}`);

    try {
        const q = query(
            collection(db, "reservations"),
            where("activityId", "==", activityId),
            where("status",     "==", "active")
        );
        const resSnap = await getDocs(q);

        if (resSnap.empty) {
            listDiv.innerHTML = "<p style='padding:10px;color:black;'>No hay usuarios inscritos.</p>";
            return;
        }

        listDiv.innerHTML = "";

        for (const resDoc of resSnap.docs) {
            const resData  = resDoc.data();
            const userSnap = await getDoc(doc(db, "users", resData.userId));
            const userData = userSnap.exists() ? userSnap.data() : null;
            const userName = userData
                ? `${userData.name} ${userData.surname || ""}`.trim()
                : "Usuario Anónimo";
            const userEmail = userData?.email || "";

            const row = document.createElement("div");
            row.className = "user-row";
            row.innerHTML = `
                <span class="user-name">${userName}</span>
                <button class="veto-btn"
                    data-res-id="${resDoc.id}"
                    data-act-id="${activityId}"
                    data-user-email="${userEmail}"
                    data-user-name="${userName}"
                    data-act-name="${actData.name}"
                    data-act-date="${actData.date     || '—'}"
                    data-act-schedule="${actData.schedule || '—'}"
                    data-act-price="${actData.price   || '—'}">
                    🚫 Vetar
                </button>`;

            row.querySelector(".veto-btn").addEventListener("click", (e) => {
                handleVeto(e.currentTarget);
            });

            listDiv.appendChild(row);
        }
    } catch (e) {
        console.error("Error cargando participantes:", e);
        listDiv.innerHTML = "<p style='color:red;'>Error al cargar participantes.</p>";
    }
}

// ── Vetar usuario ──────────────────────────────────────────────
async function handleVeto(btn) {
    if (!confirm("¿Seguro que quieres vetar a este usuario?")) return;

    const reservationId  = btn.dataset.resId;
    const activityId     = btn.dataset.actId;
    const userEmail      = btn.dataset.userEmail;
    const userName       = btn.dataset.userName;
    const actName        = btn.dataset.actName;
    const actDate        = btn.dataset.actDate;
    const actSchedule    = btn.dataset.actSchedule;
    const actPrice       = btn.dataset.actPrice;

    btn.disabled    = true;
    btn.textContent = "Vetando...";

    try {
        // 1. Marcar reserva como vetada
        await updateDoc(doc(db, "reservations", reservationId), { status: "vetoed" });

        // 2. Devolver plaza a la actividad
        await updateDoc(doc(db, "activities", activityId), { availableSlots: increment(1) });

        // 3. Enviar email al usuario vetado
        if (userEmail) {
            try {
                await emailjs.send("service_ak2mcnm", "template_czzg7qg", {
                    type:              "vetada ❌",
                    user_name:         userName,
                    user_email:        userEmail,
                    activity_name:     actName,
                    activity_date:     actDate,
                    activity_schedule: actSchedule,
                    activity_price:    actPrice,
                    owner_name:        ownerName,   // ← ya no queda vacío
                    comment:           "Has sido vetado de esta actividad y no podrás volver a inscribirte. Para cualquier consulta, contacta con el gimnasio o profesional correspondiente."
                });
            } catch (emailErr) {
                console.warn("Email no enviado:", emailErr);
            }
        }

        // 4. Actualizar UI
        btn.textContent = "✓ Vetado";
        btn.closest(".user-row").classList.add("user-row--vetoed");

        const slotSpan = document.getElementById(`slots-${activityId}`);
        if (slotSpan) slotSpan.textContent = parseInt(slotSpan.textContent) + 1;

    } catch (e) {
        console.error(e);
        alert("Error al procesar el veto.");
        btn.disabled    = false;
        btn.textContent = "🚫 Vetar";
    }
}

window.handleVeto = handleVeto;

// ── Iniciar ────────────────────────────────────────────────────
await loadOwnerName();
await loadDashboard();