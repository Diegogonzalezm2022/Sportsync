    import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

    const resp = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await resp.json();
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    const params         = new URLSearchParams(window.location.search);
    const typeParam      = params.get("type");
    const collectionName = typeParam === "gym" ? "gyms" : "professionals";
    const ownerId        = sessionStorage.getItem("userId");

    let scheduleData       = { days: "", from: "08:00", to: "20:00" };
    let galleryImages      = [];
    let profilePhotoBase64 = null;
    let currentLocation    = null; // { lat, lng } o null

    // ── Helpers de geolocalización ────────────────────────
    function getLocationPromise() {
    return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    ()  => resolve(null),
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

    // ── Botón actualizar ubicación ────────────────────────
    document.getElementById("updateLocationBtn").addEventListener("click", async () => {
    const btn = document.getElementById("updateLocationBtn");
    btn.disabled = true;
    btn.textContent = "Obteniendo ubicación...";
    const loc = await getLocationPromise();
    if (loc) {
    currentLocation = loc;
    setLocationStatus(loc);
    // Guardar inmediatamente en Firestore
    try {
    await updateDoc(doc(db, collectionName, ownerId), { location: loc });
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

    // ── Cargar datos actuales ─────────────────────────────
    async function init() {
    const snap = await getDoc(doc(db, collectionName, ownerId));
    if (snap.exists()) {
    const d = snap.data();
    document.getElementById("inputName").value    = d.name        || "";
    document.getElementById("inputDesc").value    = d.description || "";
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
}

    // ── Foto de perfil ────────────────────────────────────
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

    // ── Guardar perfil ────────────────────────────────────
    document.getElementById("saveProfileBtn").onclick = async () => {
    const btn = document.getElementById("saveProfileBtn");
    btn.disabled = true; btn.textContent = "Guardando...";

    const upd = {
    name:        document.getElementById("inputName").value,
    description: document.getElementById("inputDesc").value,
    contactInfo: document.getElementById("inputContact").value,
    schedule:    scheduleData
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
    await updateDoc(doc(db, collectionName, ownerId), upd);
    document.getElementById("saveMsg").style.display = "block";
    setTimeout(() => { document.getElementById("saveMsg").style.display = "none"; }, 2500);
} catch (e) {
    console.error(e);
    alert("Error al guardar.");
}

    btn.disabled = false; btn.textContent = "Guardar Perfil y Horario";
};

    // ── Modal horario ─────────────────────────────────────
    document.getElementById("scheduleBtn").onclick = () =>
    document.getElementById("scheduleModal").classList.add("active");

    document.getElementById("closeScheduleModal").onclick = () => {
    const days = Array.from(document.querySelectorAll("#dayChecks input:checked"))
    .map(i => i.value).join("/");
    scheduleData = {
    days,
    from: document.getElementById("timeFrom").value,
    to:   document.getElementById("timeTo").value
};
    document.getElementById("scheduleBtn").textContent =
    `${days} (${scheduleData.from}-${scheduleData.to})`;
    document.getElementById("scheduleModal").classList.remove("active");
};

    // ── Galería ───────────────────────────────────────────
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
    await updateDoc(doc(db, collectionName, ownerId), { gallery: galleryImages });
    alert("Galería guardada en Firebase");
};

    // ── Actividades ───────────────────────────────────────
    async function loadActivities() {
    const list = document.getElementById("activitiesList");
    const snap = await getDocs(query(
    collection(db, "activities"), where("ownerId", "==", ownerId)));
    list.innerHTML = snap.docs.map(d => `
            <div style="border-bottom:1px solid #eee; padding:5px; display:flex; justify-content:space-between;">
                <span>${d.data().name} (${d.data().date})</span>
                <button onclick="window.delAct('${d.id}')">Eliminar</button>
            </div>`).join("");
}

    window.delAct = async (id) => {
    if (confirm("¿Borrar?")) {
    await deleteDoc(doc(db, "activities", id));
    loadActivities();
}
};

    document.getElementById("createActBtn").onclick = async () => {
    await addDoc(collection(db, "activities"), {
        name:           document.getElementById("actName").value,
        date:           document.getElementById("actDate").value,
        maxCancelDate:  document.getElementById("actMaxCancelDate").value,
        schedule:       document.getElementById("actTime").value,
        price:          document.getElementById("actPrice").value,
        slots:          document.getElementById("actSlots").value,
        availableSlots: document.getElementById("actSlots").value,
        ownerId,
        ownerType:      typeParam,
        createdAt:      serverTimestamp()
    });
    loadActivities();
};

    init();
