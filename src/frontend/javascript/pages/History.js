import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import FirebaseDb from "../../../backend/javascript/app/FirebaseDb.js";

// Inicialización de Firebase y DB
const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const response = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await response.json();
const app = initializeApp(firebaseConfig);
const db = await FirebaseDb.create();

/**
 * FUNCIÓN GLOBAL PARA COMPARTIR
 */
window.shareReservation = function(ownerName, activityName, activityId) {
    const shareUrl = `${window.location.origin}/pages/ActivityDetail.html?id=${activityId}`;

    const shareData = {
        title: "¡Mira esta actividad en SportSync!",
        text: `Me he apuntado a ${activityName} en ${ownerName}. ¡Vente conmigo!`,
        url: shareUrl
    };

    if (navigator.share) {
        navigator.share(shareData).catch(err => console.log("Error al compartir:", err));
    } else {
        navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
        alert("Enlace de actividad copiado al portapapeles.");
    }
};

async function loadReservations() {
    const reservations = await db.getUserReservations(userId);

    const enriched = await Promise.all(reservations.map(async r => {
        let ownerName = r.gymOrProId;
        let activityName = r.activityId;
        let availableSlots = null;

        try {
            if (r.ownerType === "gym") {
                const gym = await db.getGym(r.gymOrProId);
                ownerName = gym.name;
            } else {
                const pro = await db.getProfessional(r.gymOrProId);
                ownerName = pro.name;
            }
        } catch (e) { console.error("Error cargando dueño:", e); }

        try {
            const actData = await db.getActivity(r.activityId);
            if (actData) {
                activityName            = actData.name     || r.activityId;
                r.activitySchedule      = actData.schedule || "—";
                r.activityPrice         = actData.price    || "—";
                r.activityDate          = actData.date     || "—";
                r.activityMaxCancelDate = actData.maxCancelDate || null; // ✅ guardamos para renderPast
                availableSlots          = actData.availableSlots ?? actData.slots ?? 0;
            }
        } catch (e) { console.error("Error cargando actividad:", e); }

        return { ...r, ownerName, activityName, availableSlots };
    }));

    const active    = enriched.filter(r => r.status === "active");
    const cancelled = enriched.filter(r => r.status === "cancelled");
    const done      = enriched.filter(r => r.status === "done");
    const past      = [...done, ...cancelled];

    renderActive(active);
    renderPast(past);
}

// --- RENDERIZAR ACTIVAS ---
function renderActive(reservations) {
    const list = document.getElementById("activeList");
    if (reservations.length === 0) {
        list.innerHTML = `<p class="loading-hint">No tienes reservas activas.</p>`;
        return;
    }

    list.innerHTML = reservations.map(r => `
        <article class="reservation-card" data-id="${r.id}">
            <div class="card-info">
                <p><strong>${r.ownerType === "gym" ? "Gym" : "Profesional"}:</strong> ${r.ownerName}</p>
                <p><strong>Actividad:</strong> ${r.activityName}</p>
                <p><strong>Horario:</strong> ${formatSchedule(r.activitySchedule)}</p>
            </div>
            <div class="card-status">
                <p>Pago: ${r.paid ? "✓" : "Pendiente"}</p>
            </div>
            <div class="card-actions">
                <button class="icon-btn share-icon" title="Compartir"
                    onclick="window.shareReservation('${r.ownerName}', '${r.activityName}', '${r.activityId}')">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
                <button class="action-btn cancel-btn"
                    data-id="${r.id}"
                    data-activity-name="${r.activityName}"
                    data-activity-schedule="${r.activitySchedule || '—'}"
                    data-activity-price="${r.activityPrice || '—'}"
                    data-activity-date="${r.activityDate || '—'}"
                    data-owner-name="${r.ownerName}">
                    Cancelar
                </button>
            </div>
        </article>`).join("");

    list.querySelectorAll(".cancel-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("¿Seguro que quieres cancelar esta reserva?")) return;

            btn.disabled = true;
            btn.textContent = "Cancelando...";

            try {
                const { id, activityName, activitySchedule, activityPrice, activityDate, ownerName } = btn.dataset;

                await db.cancelReservation(id);

                const userEmail = sessionStorage.getItem("userEmail") || "";
                const userName  = userEmail.split("@")[0] || "Cliente";

                await emailjs.send("service_ak2mcnm", "template_czzg7qg", {
                    type:              "cancelada ❌",
                    user_name:         userName,
                    user_email:        userEmail,
                    activity_name:     activityName,
                    activity_date:     activityDate,
                    activity_schedule: activitySchedule,
                    activity_price:    activityPrice,
                    owner_name:        ownerName,
                    comment:           "¡Hasta la próxima!"
                });

                alert("Reserva cancelada y correo enviado.");
                await loadReservations();
            } catch (e) {
                console.error(e);
                btn.disabled = false;
                btn.textContent = "Cancelar";

                if (e.message === "Cancel limit passed") {
                    alert("No se puede cancelar: ha pasado la fecha límite de cancelación.");
                } else {
                    alert("Error al cancelar la reserva.");
                }
            }
        });
    });
}

// --- RENDERIZAR PASADAS ---
function renderPast(reservations) {
    const list = document.getElementById("pastList");
    if (reservations.length === 0) {
        list.innerHTML = `<p class="loading-hint">No tienes reservas pasadas.</p>`;
        return;
    }

    list.innerHTML = reservations.map(r => {
        // Calcular si se puede volver a reservar
        const now = new Date();
        const maxDate = r.activityMaxCancelDate
            ? new Date(r.activityMaxCancelDate.seconds * 1000)
            : null;
        const canRebook = (r.availableSlots > 0) && (!maxDate || maxDate > now);

        return `
        <article class="reservation-card past-card" data-id="${r.id}">
            <button class="delete-card-btn" data-id="${r.id}" title="Eliminar del historial">✕</button>
            <div class="card-info">
                <p><strong>${r.ownerType === "gym" ? "Gimnasio" : "Profesional"}:</strong> ${r.ownerName}</p>
                <p><strong>Actividad:</strong> ${r.activityName}</p>
            </div>
            <div class="card-actions past-actions">
                <button class="icon-btn share-icon"
                    onclick="window.shareReservation('${r.ownerName}', '${r.activityName}', '${r.activityId}')">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
                ${canRebook ? `
                    <button class="action-btn rebook-btn" data-id="${r.id}">
                        Volver a reservar
                    </button>
                ` : ""}
                <span class="status-text">${r.status === "done" ? "Hecho" : "Cancelado"}</span>
            </div>
        </article>`;
    }).join("");

    // Botones eliminar del historial
    list.querySelectorAll(".delete-card-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("¿Eliminar del historial?")) return;
            await db.deleteReservation(btn.dataset.id);
            btn.closest(".reservation-card").remove();
        });
    });

    // Botones volver a reservar
    list.querySelectorAll(".rebook-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("¿Quieres volver a activar esta reserva?")) return;
            btn.disabled = true;
            btn.textContent = "Reservando...";
            try {
                await db.reactivateReservation(btn.dataset.id);
                alert("¡Reserva reactivada!");
                await loadReservations();
            } catch (e) {
                console.error(e);
                btn.disabled = false;
                btn.textContent = "Volver a reservar";
                alert(e.message || "Error al reactivar la reserva.");
            }
        });
    });
}

function formatSchedule(schedule) {
    if (!schedule) return "—";
    if (typeof schedule === "object" && schedule.seconds) {
        return new Date(schedule.seconds * 1000).toLocaleDateString("es-ES", {
            weekday: "long", day: "numeric", month: "long"
        });
    }
    return schedule;
}

// Botón eliminar todo el historial
document.getElementById("deleteAllPastBtn")?.addEventListener("click", async () => {
    if (!confirm("¿Eliminar todo el historial?")) return;

    const reservations = await db.getUserReservations(userId);
    const past = reservations.filter(r => r.status === "cancelled" || r.status === "done");

    await Promise.all(past.map(r => db.deleteReservation(r.id)));
    await loadReservations();
});

loadReservations();