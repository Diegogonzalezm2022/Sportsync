import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

emailjs.init("bOhMQRr1h4BzhaNUT");

// ── Firebase init ──────────────────────────────────────
let app;
try {
    app = getApp();
} catch {
    const response = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();
    app = initializeApp(firebaseConfig);
}
const auth = getAuth(app);

// ── Sesión y tipo de propietario ───────────────────────
const userId = sessionStorage.getItem("userId");
const params = new URLSearchParams(window.location.search);
const ownerType = params.get("type") || "gym";
const ownerId = params.get("id") || userId;

if (!userId) {
    window.location.href = "Login.html";
}

// Nombre del dueño para el email
let ownerName = "";

async function loadOwnerName() {
    try {
        if (ownerType === "gym") {
            const gym = await api.getGym(ownerId);
            ownerName = gym?.name || "";
        } else {
            const pro = await api.getProfessional(ownerId);
            ownerName = pro?.name || "";
        }
    } catch (error) {
        console.error("Error cargando nombre del dueño:", error);
    }
}

// Configurar token cuando el usuario esté autenticado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        await loadOwnerName();
        loadDashboard();
    }
});

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ── Carga el dashboard ─────────────────────────────────
async function loadDashboard() {
    const container = document.getElementById("activities-list");

    try {
        const activities = await api.getActivitiesByOwner(ownerId);
        container.innerHTML = "";

        if (activities.length === 0) {
            container.innerHTML = "<p>No tienes actividades creadas aún.</p>";
            return;
        }

        for (const actData of activities) {
            const actId = actData.id;

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

// ── Carga los usuarios inscritos en una actividad ─────────────
async function loadParticipants(activityId, actData) {
    const listDiv = document.getElementById(`users-container-${activityId}`);

    try {
        const reservations = await api.getActivityReservations(activityId);

        if (reservations.length === 0) {
            listDiv.innerHTML = "<p style='padding:10px;color:black;'>No hay usuarios inscritos.</p>";
            return;
        }

        listDiv.innerHTML = "";

        for (const resData of reservations) {
            const userData = await api.getUser(resData.userId);
            const userName = userData
                ? `${userData.name} ${userData.surname || ""}`.trim()
                : "Usuario Anónimo";
            const userEmail = userData?.email || "";

            const userPhoto = userData?.photoURL || "";
            const userInitial = userName.charAt(0).toUpperCase() || "?";

            const targetUserId = userData?.id || resData.userId;

            const row = document.createElement("div");
            row.className = "user-row";
            row.innerHTML = `
                <div class="user-info-container">
                    <a href="ProfileUser.html?id=${targetUserId}" class="profile-link" title="Ver perfil de ${escapeHTML(userName)}">
                        <div class="user-avatar">
                            ${userPhoto ? `<img src="${userPhoto}" alt="${escapeHTML(userName)}">` : `<span>${userInitial}</span>`}
                        </div>
                        <span class="user-name">${escapeHTML(userName)}</span>
                    </a>
                </div>
                <button class="veto-btn"
                    data-res-id="${resData.id}"
                    data-act-id="${activityId}"
                    data-user-email="${userEmail}"
                    data-user-name="${escapeHTML(userName)}"
                    data-act-name="${escapeHTML(actData.name)}"
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

// ── Vetar usuario ──────────────────────────────────────
async function handleVeto(btn) {
    if (!confirm("¿Seguro que quieres vetar a este usuario?")) return;

    const reservationId = btn.dataset.resId;
    const activityId = btn.dataset.actId;
    const userEmail = btn.dataset.userEmail;
    const userName = btn.dataset.userName;
    const actName = btn.dataset.actName;
    const actDate = btn.dataset.actDate;
    const actSchedule = btn.dataset.actSchedule;
    const actPrice = btn.dataset.actPrice;

    btn.disabled = true;
    btn.textContent = "Vetando...";

    try {
        await api.request(`/reservations/${reservationId}/veto`, {
            method: 'POST'
        });

        // 3. Enviar email al usuario vetado
        if (userEmail) {
            try {
                await emailjs.send("service_ak2mcnm", "template_czzg7qg", {
                    type: "vetada ❌",
                    user_name: userName,
                    user_email: userEmail,
                    activity_name: actName,
                    activity_date: actDate,
                    activity_schedule: actSchedule,
                    activity_price: actPrice,
                    owner_name: ownerName,
                    comment: "Has sido vetado de esta actividad y no podrás volver a inscribirte. Para cualquier consulta, contacta con el gimnasio o profesional correspondiente."
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
        btn.disabled = false;
        btn.textContent = "🚫 Vetar";
    }
}

window.handleVeto = handleVeto;
