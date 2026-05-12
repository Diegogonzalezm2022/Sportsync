import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

emailjs.init("bOhMQRr1h4BzhaNUT");

const resp = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await resp.json();
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const userId  = sessionStorage.getItem("userId");
const params  = new URLSearchParams(window.location.search);
const ownerId = params.get("id") || sessionStorage.getItem("userId");
const isOwner = (userId === ownerId);

if (!userId) window.location.href = "Login.html";

// Configurar token cuando el usuario esté autenticado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        loadData();
    }
});

// ── Cargar datos del gym ──────────────────────────────
async function loadData() {
    try {
        const d = await api.getGym(ownerId);
        if (!d || !d.id) {
            document.getElementById("profileName").textContent = "Perfil no encontrado";
            return;
        }

        document.getElementById("profileName").textContent  = d.name        || "—";
        document.getElementById("profileDesc").textContent  = d.description || "—";
        document.getElementById("contactLines").textContent = d.contactInfo  || "—";

        if (d.schedule) {
            if (typeof d.schedule === "object") {
                document.getElementById("scheduleDays").textContent  = d.schedule.days || "—";
                document.getElementById("scheduleHours").textContent =
                    (d.schedule.from && d.schedule.to) ? `${d.schedule.from}–${d.schedule.to}` : "";
            } else {
                document.getElementById("scheduleDays").textContent = d.schedule;
            }
        }

        if (d.photoURL) {
            document.getElementById("profilePhotoImg").src = d.photoURL;
            document.getElementById("profilePhotoImg").style.display = "block";
            document.getElementById("photoCaption").style.display = "none";
        }

        if (d.gallery && d.gallery.length > 0) {
            document.getElementById("galleryCarousel").innerHTML = d.gallery.map(src => `
                <div class="gallery-slot">
                    <img src="${src}" style="width:100%;height:100%;object-fit:cover;">
                </div>`).join("");
        }

        if (d.rating) {
            const rounded = Math.round(d.rating);
            document.querySelectorAll(".star").forEach(s => {
                if (+s.dataset.value <= rounded) s.classList.add("star--active");
            });
            document.getElementById("ratingHint").textContent = `${d.rating.toFixed(1)} / 5`;
        }

        if (isOwner) {
            document.getElementById("ownerControls").style.display = "block";
            document.getElementById("editBtn").onclick = () =>
                window.location.href = `EditProfessionalPage.html?id=${ownerId}&type=gym`;
            document.getElementById("editBtnVet").onclick = () =>
                window.location.href = `ViewReservation.html?id=${ownerId}&type=gym`;
            document.getElementById("starsContainer").style.pointerEvents = "none";
            document.getElementById("ratingHint").textContent = "Tu perfil";
        } else {
            // Estrellas en modo lectura — la valoración se hace desde el historial
            document.getElementById("starsContainer").style.pointerEvents = "none";
            
            // Mostrar formulario de comentario solo a usuarios no dueños
            const commentForm = document.getElementById("commentForm");
            if (commentForm) commentForm.style.display = "flex";

            if (d.rating) {
                const count = d.ratingCount || 0;
                document.getElementById("ratingHint").textContent =
                    `${d.rating.toFixed(1)} / 5 (${count} valoracion${count !== 1 ? "es" : ""})`;
            } else {
                document.getElementById("ratingHint").textContent = "Sin valoraciones aún";
            }
        }

        loadActivities();
    } catch (error) {
        console.error("Error cargando datos del gimnasio:", error);
    }
}

// ── Comentarios ───────────────────────────────────────
let commentsLoaded = false;

document.getElementById("commentsToggleBtn").addEventListener("click", async () => {
    const box = document.getElementById("commentsBox");
    const btn = document.getElementById("commentsToggleBtn");
    const visible = box.style.display !== "none";
    box.style.display = visible ? "none" : "block";
    btn.textContent = visible ? "💬 Ver comentarios" : "💬 Ocultar comentarios";
    if (!visible && !commentsLoaded) {
        await loadComments();
        commentsLoaded = true;
    }
});

async function loadComments() {
    const list = document.getElementById("commentList");
    try {
        // TODO: Crear endpoint en backend para comentarios
        list.innerHTML = `<p class="no-comments">Funcionalidad de comentarios pendiente de implementar en el backend.</p>`;
    } catch (e) {
        console.error(e);
        list.innerHTML = `<p class="no-comments">Error al cargar comentarios.</p>`;
    }
}

document.getElementById("commentSubmitBtn").addEventListener("click", async () => {
    const input = document.getElementById("commentInput");
    const text  = input.value.trim();
    if (!text) return;

    const btn = document.getElementById("commentSubmitBtn");
    btn.disabled = true; btn.textContent = "Publicando...";

    try {
        // TODO: Implementar en backend
        alert("Funcionalidad de comentarios pendiente de implementar en el backend.");
        input.value = "";
    } catch (e) {
        console.error(e);
        alert("Error al publicar el comentario.");
    }
    btn.disabled = false; btn.textContent = "Publicar";
});

// ── Actividades ───────────────────────────────────────
let allActivities = [];
let myActivityIds = new Set();

async function loadActivities(fromDate = null, toDate = null) {
    const container = document.getElementById("activitiesSection");
    container.innerHTML = `<p style="font-size:0.85rem;color:#999;">Cargando actividades...</p>`;
    try {
        const activities = await api.getActivitiesByOwner(ownerId);
        allActivities = activities;

        let filtered = allActivities;
        if (fromDate || toDate) {
            filtered = allActivities.filter(a => {
                if (!a.date) return true;
                const actDate = new Date(a.date);
                if (fromDate && actDate < new Date(fromDate)) return false;
                if (toDate   && actDate > new Date(toDate))   return false;
                return true;
            });
        }
        renderActivities(filtered);
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color:red;">Error al cargar actividades.</p>`;
    }
}

function renderActivities(activities) {
    const container = document.getElementById("activitiesSection");
    if (activities.length === 0) {
        container.innerHTML = `<p style="font-size:0.85rem;color:#999;">No hay actividades.</p>`;
        return;
    }
    container.innerHTML = activities.map(a => {
        const alreadySignedUp = myActivityIds.has(a.id);
        const isVetoed = window.myVetoedIds?.has(a.id);
        const noSlots = (a.availableSlots ?? a.slots ?? 0) <= 0;

        const stripeBtn = a.stripeLink
            ? `<a href="${a.stripeLink}" target="_blank" rel="noopener"
              class="stripe-pay-btn"
              style="display:inline-block; padding:8px 14px; background:#635bff;
                     color:white; border-radius:6px; font-size:0.82rem;
                     font-weight:600; text-decoration:none; margin-left:6px;">
              💳 Pagar online
           </a>`
            : "";

        return `
    <div class="activity-card">
        <div class="activity-info">
            <div class="activity-row"><span class="activity-field-label">Nombre:</span> <span class="activity-value">${a.name}</span></div>
            <div class="activity-row"><span class="activity-field-label">Horario:</span> <span class="activity-value">${a.schedule || "—"}</span></div>
            <div class="activity-row"><span class="activity-field-label">Fecha:</span> <span class="activity-value">${a.date || "—"}</span></div>
        </div>
        <div class="activity-right">
            <div class="activity-row"><span class="activity-field-label">Precio:</span> <span class="activity-value">${a.price}€</span></div>
            <div class="activity-row"><span class="activity-field-label">Cupo:</span> <span class="activity-value">${a.availableSlots ?? a.slots ?? 0}</span></div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${isOwner
                ? `<span class="activity-owner-badge">Tu actividad</span>`
                : `<button class="signup-btn ${alreadySignedUp ? 'signup-btn--done' : ''} ${(noSlots && !alreadySignedUp) || isVetoed ? 'signup-btn--full' : ''}"
                    data-id="${a.id}" data-name="${a.name}" data-date="${a.date || ''}"
                    data-schedule="${a.schedule || ''}" data-price="${a.price || 0}"
                    ${alreadySignedUp || noSlots || isVetoed ? 'disabled' : ''}>
                    ${alreadySignedUp ? '✓ Apuntado' : isVetoed ? '🚫 Vetado' : noSlots ? 'Completo' : 'Apuntarme'}
                   </button>
                   ${stripeBtn}`
            }
        </div>
    </div>`;
    }).join("");

    if (!isOwner) {
        container.querySelectorAll(".signup-btn:not([disabled])").forEach(btn => {
            btn.onclick = async () => {
                const activityId = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = "Reservando...";
                try {
                    await api.makeReservation(userId, activityId, ownerId);
                    btn.textContent = "✓ Apuntado";
                    btn.classList.add("signup-btn--done");
                } catch (e) {
                    console.error(e);
                    alert(e.message || "Error al hacer la reserva.");
                    btn.disabled = false;
                    btn.textContent = "Apuntarme";
                }
            };
        });
    }
}

document.getElementById("dateFromBtn").onclick = () =>
    document.getElementById("dateFromInput").showPicker?.() || document.getElementById("dateFromInput").click();
document.getElementById("dateToBtn").onclick = () =>
    document.getElementById("dateToInput").showPicker?.() || document.getElementById("dateToInput").click();

document.getElementById("dateFromInput").onchange = function () {
    const toVal = document.getElementById("dateToInput").value;
    if (toVal && this.value > toVal) {
        alert("La fecha desde no puede ser mayor que la fecha hasta.");
        this.value = "";
        document.getElementById("dateFromLabel").textContent = "Fecha desde";
        return;
    }
    const [y, m, d] = this.value.split("-");
    if (this.value) document.getElementById("dateFromLabel").textContent = `${d}/${m}/${y}`;
    loadActivities(this.value, toVal);
};

document.getElementById("dateToInput").onchange = function () {
    const fromVal = document.getElementById("dateFromInput").value;
    if (fromVal && this.value < fromVal) {
        alert("La fecha hasta no puede ser menor que la fecha desde.");
        this.value = "";
        document.getElementById("dateToLabel").textContent = "Fecha hasta";
        return;
    }
    const [y, m, d] = this.value.split("-");
    if (this.value) document.getElementById("dateToLabel").textContent = `${d}/${m}/${y}`;
    loadActivities(fromVal, this.value);
};

document.getElementById("carouselLeft").onclick  = () =>
    document.getElementById("galleryCarousel").scrollBy({ left: -140, behavior: "smooth" });
document.getElementById("carouselRight").onclick = () =>
    document.getElementById("galleryCarousel").scrollBy({ left: 140, behavior: "smooth" });
