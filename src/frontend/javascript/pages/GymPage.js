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

            // Cargar mis reservas para evitar duplicados
            const myRes = await api.getUserReservations(userId);
            myActivityIds = new Map(myRes.map(r => [r.activityId, r.status]));
        }
        // ── Compartir perfil ──────────────────────────────────
        // ── Compartir perfil ──────────────────────────────────
        document.getElementById("shareProfileBtn")?.addEventListener("click", () => {
            const name = document.getElementById("profileName").textContent || "este gimnasio";
            const shareUrl = window.location.href;
            const shareData = {
                title: `${name} en SportSync`,
                text: `¡Echa un vistazo a ${name} en SportSync!`,
                url: shareUrl
            };
            if (navigator.share) {
                navigator.share(shareData).catch(err => console.log("Error al compartir:", err));
            } else {
                navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
                alert("Enlace del perfil copiado al portapapeles.");
            }
        });

        loadActivities();
        loadEquipment();
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
        const comments = await api.getComments(ownerId, "gym");
        if (comments && comments.length > 0) {
            list.innerHTML = "";
            comments.forEach((comment) => {
                let date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("es-ES") : "";
                const canDelete = (comment.userId === userId) || isOwner;
                let commentContainer = document.createElement('div');
                commentContainer.classList.add('comment-item');
                commentContainer.innerHTML = `
                ${canDelete ? `<button class="comment-delete-btn" data-id="${comment.id}" title="Eliminar">✕</button>` : ""}
                <div class="comment-author">${comment.username || "Usuario"}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-date">${date}</div>`;
                list.appendChild(commentContainer);
            })
        } else {
            list.innerHTML = `<p class="no-comments">No hay comentarios</p>`;
        }
        list.querySelectorAll(".comment-delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("¿Eliminar este comentario?")) return;
                await api.deleteComment(btn.dataset.id);
                btn.closest(".comment-item").remove();
                if (!list.querySelector(".comment-item"))
                    list.innerHTML = `<p class="no-comments">Aún no hay comentarios.</p>`;
            });
        });
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
    btn.disabled = true;
    btn.textContent = "Publicando...";

    try {
        await api.addComment(ownerId, "gym", text, userId);
        input.value = "";
    } catch (e) {
        console.error(e);
        alert("Error al publicar el comentario.");
    }
    btn.disabled = false; btn.textContent = "Publicar";
});

// ── Actividades ───────────────────────────────────────
let allActivities = [];
let myActivityIds = new Map();

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
        const alreadySignedUp = myActivityIds.get(a.id); // Ahora guardamos el status
        const isVetoed = window.myVetoedIds?.has(a.id);
        const noSlots = (a.availableSlots ?? a.slots ?? 0) <= 0;

        // Comprobar si la actividad ya pasó (basándonos en la fecha máxima si existe)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const finalDateRaw = a.maxCancelDate || a.date;
        const actDate = (finalDateRaw && finalDateRaw.seconds) 
            ? new Date(finalDateRaw.seconds * 1000) 
            : new Date(finalDateRaw);
        const isPast = actDate < now;

        const stripeBtn = a.stripeLink
            ? `<a href="${a.stripeLink}" target="_blank" rel="noopener"
              class="stripe-pay-btn"
              style="display:inline-block; padding:8px 14px; background:#635bff;
                     color:white; border-radius:6px; font-size:0.82rem;
                     font-weight:600; text-decoration:none; margin-left:6px;">
              💳 Pagar online
           </a>`
            : "";

        let btnText = 'Apuntarme';
        let btnClass = '';
        let btnDisabled = false;

        if (alreadySignedUp === 'done') {
            btnText = '✓ Completada';
            btnClass = 'signup-btn--done';
            btnDisabled = true;
        } else if (alreadySignedUp === 'active') {
            btnText = '✓ Apuntado';
            btnClass = 'signup-btn--done';
            btnDisabled = true;
        } else if (isVetoed) {
            btnText = '🚫 Vetado';
            btnClass = 'signup-btn--full';
            btnDisabled = true;
        } else if (isPast) {
            btnText = 'Finalizada';
            btnClass = 'signup-btn--full';
            btnDisabled = true;
        } else if (noSlots) {
            btnText = 'Completo';
            btnClass = 'signup-btn--full';
            btnDisabled = true;
        }

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
                : `<button class="signup-btn ${btnClass}"
                    data-id="${a.id}" data-name="${a.name}" data-date="${a.date || ''}"
                    data-schedule="${a.schedule || ''}" data-price="${a.price || 0}"
                    ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
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

// ── Equipamiento ──────────────────────────────────────
async function loadEquipment() {
    const container = document.getElementById("equipmentSection");
    if (!container) return;
    container.innerHTML = `<p style="font-size:0.85rem;color:#999;">Cargando equipamiento...</p>`;
    try {
        const snap = await getDocs(query(
            collection(db, "equipment"),
            where("ownerId", "==", ownerId)
        ));
        if (snap.empty) {
            container.innerHTML = `<p style="font-size:0.85rem;color:#999;">No hay equipamiento disponible.</p>`;
            return;
        }
        container.innerHTML = snap.docs.map(d => {
            const e = d.data();
            return `
            <div class="activity-card">
                <div class="activity-info">
                    <div class="activity-row"><span class="activity-field-label">Nombre:</span> <span class="activity-value">${e.name}</span></div>
                    <div class="activity-row"><span class="activity-field-label">Fecha:</span> <span class="activity-value">${e.date || "—"}</span></div>
                    <div class="activity-row"><span class="activity-field-label">Horario:</span> <span class="activity-value">${e.time || "—"}</span></div>
                </div>
                <div class="activity-right">
                    <div class="activity-row"><span class="activity-field-label">Precio:</span> <span class="activity-value">${e.price}€</span></div>
                    <div class="activity-row"><span class="activity-field-label">Cantidad:</span> <span class="activity-value">${e.quantity}</span></div>
                </div>
                <div>
                    ${isOwner
                ? `<span class="activity-owner-badge">Tu equipamiento</span>`
                : `<button class="signup-btn" 
                              onclick="reserveEquip('${d.id}', '${e.name}', '${e.date || ''}', '${e.time || ''}', ${e.price || 0})">
                              Reservar
                           </button>`
            }
                </div>
            </div>`;
        }).join("");
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color:red;">Error al cargar equipamiento.</p>`;
    }
}

window.reserveEquip = async (equipId, name, date, time, price) => {
    try {
        const equipRef  = doc(db, "equipment", equipId);
        const equipSnap = await getDoc(equipRef);
        if (!equipSnap.exists()) { alert("Equipamiento no encontrado."); return; }

        const cur = parseInt(equipSnap.data().quantity) || 0;
        if (cur <= 0) { alert("No quedan unidades disponibles."); return; }

        const existSnap = await getDocs(query(
            collection(db, "equipmentReservations"),
            where("userId", "==", userId),
            where("equipmentId", "==", equipId),
            where("status", "==", "active")
        ));
        if (!existSnap.empty) { alert("Ya tienes este equipamiento reservado."); return; }

        await addDoc(collection(db, "equipmentReservations"), {
            userId,
            equipmentId: equipId,
            gymOrProId:  ownerId,
            ownerType:   "gym",
            name, date, time, price,
            status:    "active",
            createdAt: serverTimestamp()
        });

        await updateDoc(equipRef, { quantity: cur - 1 });
        alert(`Reserva de "${name}" confirmada.`);
        loadEquipment();
    } catch (e) {
        console.error(e);
        alert("Error al reservar el equipamiento.");
    }
};