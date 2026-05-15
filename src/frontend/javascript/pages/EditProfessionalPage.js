import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const resp = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await resp.json();
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const typeParam = params.get("type") || "gym";
const collectionName = typeParam === "gym" ? "gyms" : "professionals";
const ownerId = sessionStorage.getItem("userId");

let scheduleData = { days: "", from: "08:00", to: "20:00" };
let galleryImages = [];
let profilePhotoBase64 = null;
let currentLocation = null;

// Helper de geolocalización
function getLocationPromise() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });
}

function setLocationStatus(location) {
    const el = document.getElementById("locationStatus");
    if (location) {
        el.textContent = `✓ ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        el.className = "location-status ok";
    } else {
        el.textContent = "Sin ubicación guardada";
        el.className = "location-status err";
    }
}

// Botón actualizar ubicación
document.getElementById("updateLocationBtn").addEventListener("click", async () => {
    const btn = document.getElementById("updateLocationBtn");
    btn.disabled = true;
    btn.textContent = "Obteniendo ubicación...";
    const loc = await getLocationPromise();
    if (loc) {
        currentLocation = loc;
        setLocationStatus(loc);
        try {
            await api.request(`/${collectionName}/${ownerId}`, {
                method: 'PUT',
                body: JSON.stringify({ location: loc })
            });
            btn.textContent = "✓ Ubicación guardada";
        } catch (e) {
            console.error(e);
            btn.textContent = "Error al guardar";
        }
    } else {
        btn.textContent = "No se pudo obtener";
        document.getElementById("locationStatus").textContent = "Permiso denegado o error";
        document.getElementById("locationStatus").className = "location-status err";
    }
    setTimeout(() => { btn.disabled = false; btn.textContent = "📍 Actualizar mi ubicación"; }, 2500);
});

// Configurar token y cargar datos
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        init();
    }
});

// Cargar datos actuales
async function init() {
    try {
        const d = typeParam === "gym"
            ? await api.getGym(ownerId)
            : await api.getProfessional(ownerId);

        if (d && d.id) {
            document.getElementById("inputName").value = d.name || "";
            document.getElementById("inputDesc").value = d.description || "";
            document.getElementById("inputContact").value = d.contactInfo || "";

            if (d.photoURL) {
                const p = document.getElementById("profilePhotoPreview");
                p.src = d.photoURL; p.style.display = "block";
                document.getElementById("photoPlaceholder").style.display = "none";
            }

            if (d.schedule && typeof d.schedule === "object") {
                scheduleData = d.schedule;
                document.getElementById("scheduleBtn").textContent =
                    `${d.schedule.days} (${d.schedule.from}-${d.schedule.to})`;
            }

            if (d.location) {
                currentLocation = d.location;
                setLocationStatus(d.location);
            }

            galleryImages = d.gallery || [];
            renderGallery();
        }
        loadActivities();
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

// Foto de perfil
document.getElementById("profilePhotoBox").onclick = () =>
    document.getElementById("profilePhotoInput").click();

document.getElementById("profilePhotoInput").onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        profilePhotoBase64 = ev.target.result;
        const p = document.getElementById("profilePhotoPreview");
        p.src = profilePhotoBase64; p.style.display = "block";
        document.getElementById("photoPlaceholder").style.display = "none";
    };
    reader.readAsDataURL(e.target.files[0]);
};

// Guardar perfil
document.getElementById("saveProfileBtn").onclick = async () => {
    const btn = document.getElementById("saveProfileBtn");
    btn.disabled = true; btn.textContent = "Guardando...";

    const upd = {
        name: document.getElementById("inputName").value,
        description: document.getElementById("inputDesc").value,
        contactInfo: document.getElementById("inputContact").value,
        schedule: scheduleData
    };
    if (profilePhotoBase64) upd.photoURL = profilePhotoBase64;

    // Intentar obtener ubicación al guardar si no hay una ya
    if (!currentLocation) {
        const loc = await getLocationPromise();
        if (loc) {
            currentLocation = loc;
            setLocationStatus(loc);
        }
    }
    if (currentLocation) upd.location = currentLocation;

    try {
        await api.request(`/${collectionName}/${ownerId}`, {
            method: 'PUT',
            body: JSON.stringify(upd)
        });
        document.getElementById("saveMsg").style.display = "block";
        setTimeout(() => { document.getElementById("saveMsg").style.display = "none"; }, 2500);
    } catch (e) {
        console.error(e);
        alert("Error al guardar.");
    }

    btn.disabled = false; btn.textContent = "Guardar Perfil y Horario";
};

// Modal horario
document.getElementById("scheduleBtn").onclick = () =>
    document.getElementById("scheduleModal").classList.add("active");

document.getElementById("closeScheduleModal").onclick = () => {
    const days = Array.from(document.querySelectorAll("#dayChecks input:checked"))
        .map(i => i.value).join("/");
    scheduleData = {
        days,
        from: document.getElementById("timeFrom").value,
        to: document.getElementById("timeTo").value
    };
    document.getElementById("scheduleBtn").textContent =
        `${days} (${scheduleData.from}-${scheduleData.to})`;
    document.getElementById("scheduleModal").classList.remove("active");
};

// Galería
function renderGallery() {
    const cont = document.getElementById("galleryCarousel");
    cont.innerHTML = galleryImages.map((img, i) => `
        <div class="gallery-slot">
            <img src="${img}">
            <button class="del-img" onclick="window.delImg(${i})">X</button>
        </div>`).join("");
}
window.delImg = (i) => { galleryImages.splice(i, 1); renderGallery(); };

document.getElementById("addGalleryBtn").onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
        const r = new FileReader();
        r.onload = (ev) => { galleryImages.push(ev.target.result); renderGallery(); };
        r.readAsDataURL(e.target.files[0]);
    };
    input.click();
};

document.getElementById("saveGalleryBtn").onclick = async () => {
    const btn = document.getElementById("saveGalleryBtn");
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
        await api.request(`/${collectionName}/${ownerId}`, {
            method: 'PUT',
            body: JSON.stringify({ gallery: galleryImages })
        });
        alert("Galería guardada");
    } catch (e) {
        console.error("Error al guardar galería:", e);
        alert("Error al guardar galería: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Galería";
    }
};

// Actividades
async function loadActivities() {
    const list = document.getElementById("activitiesList");
    try {
        const activities = await api.getActivitiesByOwner(ownerId);
        if (activities.length === 0) {
            list.innerHTML = "<p>No tienes actividades creadas aún.</p>";
            return;
        }
        list.innerHTML = activities.map(d => {
            return `
        <div style="border-bottom:1px solid #eee; padding:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>
                <strong>${d.name}</strong> (${String(d.date).split('T')[0]}${d.maxCancelDate && d.maxCancelDate !== d.date ? ` - ${String(d.maxCancelDate).split('T')[0]}` : ""})
                ${d.stripeLink ? `<span style="font-size:0.75rem; color:#27ae60; margin-left:6px;">💳 Pago online</span>` : ""}
            </span>
            <button onclick="window.delAct('${d.id}')">Eliminar</button>
        </div>`;
        }).join("");
    } catch (e) {
        console.error(e);
        list.innerHTML = "<p>Error al cargar actividades.</p>";
    }
}


document.getElementById("activityForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const name = document.getElementById("actName").value;
        const date = document.getElementById("actDate").value;
        const schedule = document.getElementById("actTime").value;

        // Check for duplicates
        const existingActivities = await api.getActivitiesByOwner(ownerId);
        const isDuplicate = existingActivities.some(act =>
            act.name === name &&
            act.date === date &&
            act.schedule === schedule
        );

        if (isDuplicate) {
            alert("Ya existe una actividad con el mismo nombre, fecha y hora.");
            return;
        }

        const activityData = {
            name,
            date,
            maxCancelDate: document.getElementById("actMaxCancelDate").value,
            schedule,
            price: document.getElementById("actPrice").value,
            slots: document.getElementById("actSlots").value,
            availableSlots: document.getElementById("actSlots").value,
            stripeLink: document.getElementById("actStripeLink").value.trim() || null,
        };

        await api.createActivity(ownerId, typeParam, activityData);

        document.getElementById("activityForm").reset();
        await loadActivities();
    } catch (e) {
        console.error(e);
        alert("Error al crear actividad.");
    }
})

window.delAct = async (id) => {
    if (confirm("¿Borrar?")) {
        try {
            await api.deleteActivity(id);
            await loadActivities();
        } catch (e) {
            console.error(e);
            alert("Error al eliminar.");
        }
    }
};
