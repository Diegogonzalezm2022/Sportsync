    import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getFirestore, doc, getDoc, collection, getDocs, addDoc, deleteDoc, query, where, updateDoc, serverTimestamp}
    from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

    emailjs.init("bOhMQRr1h4BzhaNUT");

    const resp = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await resp.json();
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    const userId  = sessionStorage.getItem("userId");
    const params  = new URLSearchParams(window.location.search);
    const ownerId = params.get("id") || sessionStorage.getItem("userId");
    const isOwner = (userId === ownerId);

    if (!userId) window.location.href = "Login.html";

    // ── Cargar datos del gym ──────────────────────────────
    async function loadData() {
    const gymSnap = await getDoc(doc(db, "gyms", ownerId));
    if (!gymSnap.exists()) {
    document.getElementById("profileName").textContent = "Perfil no encontrado";
    return;
}
    const d = gymSnap.data();

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
    const stars = document.querySelectorAll(".star");

    if (d.ratings && d.ratings[userId]) {
    const myPrev = d.ratings[userId];
    stars.forEach(s => s.classList.toggle("star--active", +s.dataset.value <= myPrev));
    document.getElementById("ratingHint").textContent = `Tu valoración: ${myPrev}/5`;
}

    stars.forEach(star => {
    star.addEventListener("mouseover", () =>
    stars.forEach(s => s.classList.toggle("star--active", +s.dataset.value <= +star.dataset.value)));
    star.addEventListener("mouseout", () => {
    const text = document.getElementById("ratingHint").textContent;
    const match = text.match(/[\d.]+/);
    const cur = match ? Math.round(parseFloat(match[0])) : 0;
    stars.forEach(s => s.classList.toggle("star--active", +s.dataset.value <= cur));
});
    star.onclick = async () => {
    const val = +star.dataset.value;
    const ref = doc(db, "gyms", ownerId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
    const data = snap.data();
    const ratings    = data.ratings    || {};
    const prevRating = ratings[userId] || null;
    let { rating = 0, ratingCount = 0 } = data;
    if (prevRating !== null) {
    const totalSinAnterior = (rating * ratingCount) - prevRating;
    rating = ratingCount > 1 ? (totalSinAnterior + val) / ratingCount : val;
} else {
    rating = ((rating * ratingCount) + val) / (ratingCount + 1);
    ratingCount = ratingCount + 1;
}
    await updateDoc(ref, { rating, ratingCount, [`ratings.${userId}`]: val });
    location.reload();
}
};
});

    // Mostrar formulario de comentario solo a usuarios no dueños
    document.getElementById("commentForm").style.display = "flex";
}

    loadActivities();
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
    const snap = await getDocs(query(
    collection(db, "comments"),
    where("targetId", "==", ownerId),
    where("targetType", "==", "gym")
    ));
    if (snap.empty) {
    list.innerHTML = `<p class="no-comments">Aún no hay comentarios. ¡Sé el primero!</p>`;
    return;
}
    const comments = [];
    snap.forEach(d => comments.push({ id: d.id, ...d.data() }));
    comments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    list.innerHTML = "";
    comments.forEach(c => {
    const date = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("es-ES") : "";
    const canDelete = (c.userId === userId) || isOwner;
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
                ${canDelete ? `<button class="comment-delete-btn" data-id="${c.id}" title="Eliminar">✕</button>` : ""}
                <div class="comment-author">${c.username || "Usuario"}</div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-date">${date}</div>`;
    list.appendChild(div);
});

    list.querySelectorAll(".comment-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar este comentario?")) return;
    await deleteDoc(doc(db, "comments", btn.dataset.id));
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
    btn.disabled = true; btn.textContent = "Publicando...";

    try {
    // Obtener nombre del usuario
    const userSnap = await getDoc(doc(db, "users", userId));
    const username = userSnap.exists()
    ? (userSnap.data().username || userSnap.data().name || "Usuario")
    : "Usuario";

    await addDoc(collection(db, "comments"), {
    targetId:   ownerId,
    targetType: "gym",
    userId,
    username,
    text,
    createdAt: serverTimestamp()
});

    input.value = "";
    commentsLoaded = false;
    await loadComments();
    commentsLoaded = true;
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
    const snap = await getDocs(query(
    collection(db, "activities"), where("ownerId", "==", ownerId)));
    allActivities = [];
    snap.forEach(d => allActivities.push({ id: d.id, ...d.data() }));

    const mySnap = await getDocs(query(
    collection(db, "reservations"),
    where("userId", "==", userId),
    where("status", "==", "active")));
    myActivityIds = new Set();
    mySnap.forEach(d => myActivityIds.add(d.data().activityId));

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
    const noSlots = (a.availableSlots ?? a.slots ?? 0) <= 0;
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
                ${isOwner
    ? `<span class="activity-owner-badge">Tu actividad</span>`
    : `<button class="signup-btn ${alreadySignedUp ? 'signup-btn--done' : ''} ${noSlots && !alreadySignedUp ? 'signup-btn--full' : ''}"
                            data-id="${a.id}" data-name="${a.name}" data-date="${a.date || ''}"
                            data-schedule="${a.schedule || ''}" data-price="${a.price || 0}"
                            ${alreadySignedUp || noSlots ? 'disabled' : ''}>
                            ${alreadySignedUp ? '✓ Apuntado' : noSlots ? 'Completo' : 'Apuntarme'}
                           </button>`
}
            </div>`;
}).join("");

    if (!isOwner) {
    container.querySelectorAll(".signup-btn:not([disabled])").forEach(btn => {
    btn.onclick = async () => {
    const actId = btn.dataset.id;
    btn.disabled = true;
    btn.textContent = "Comprobando...";
    try {
    const actRef  = doc(db, "activities", actId);
    const actSnap = await getDoc(actRef);
    if (!actSnap.exists()) { alert("Actividad no encontrada."); btn.disabled = false; return; }
    const cur = actSnap.data().availableSlots ?? actSnap.data().slots ?? 0;
    if (cur <= 0) { btn.textContent = "Completo"; btn.classList.add("signup-btn--full"); return; }

    const existSnap = await getDocs(query(
    collection(db, "reservations"),
    where("userId", "==", userId),
    where("activityId", "==", actId),
    where("status", "==", "active")
    ));
    if (!existSnap.empty) { btn.textContent = "✓ Apuntado"; btn.classList.add("signup-btn--done"); return; }

    await addDoc(collection(db, "reservations"), {
    userId, activityId: actId, gymOrProId: ownerId,
    ownerType: "gym", status: "active",
    paid: false, createdAt: serverTimestamp()
});
    await updateDoc(actRef, { availableSlots: cur - 1 });

    const gymSnap2 = await getDoc(doc(db, "gyms", ownerId));
    const gymName  = gymSnap2.exists() ? gymSnap2.data().name : "Gimnasio";
    const userEmail = sessionStorage.getItem("userEmail") || "";
    try {
    await emailjs.send("service_ak2mcnm", "template_czzg7qg", {
    type: "confirmada ✅",
    user_name: userEmail.split("@")[0] || "Cliente",
    user_email: userEmail,
    activity_name: btn.dataset.name,
    activity_date: btn.dataset.date,
    activity_schedule: btn.dataset.schedule,
    activity_price: btn.dataset.price,
    owner_name: gymName,
    comment: "¡Te esperamos!"
});
} catch (emailErr) { console.warn("Email no enviado:", emailErr); }

    alert("Reserva confirmada. Échale un vistazo a tu correo.");
    btn.textContent = "✓ Apuntado";
    btn.classList.add("signup-btn--done");
    myActivityIds.add(actId);
} catch (e) {
    console.error(e);
    alert("Error al realizar la reserva.");
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

    loadData();
