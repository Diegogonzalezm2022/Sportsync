    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
    import FirebaseDb from "../services/FirebaseDb.js";

    const response = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = await FirebaseDb.create()

    let loggedUid = null;

    function redirectByRole(role, ownId) {
    if (role === "gym")
    window.location.href = `GymPage.html?id=${ownId}`;
    else if (role === "professional")
    window.location.href = `ProfessionalPage.html?id=${ownId}`;
    else
    window.location.href = "ActivitySearch.html";
}

    // ── Obtener ubicación como promesa ────────────────────
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

    // ── Login ─────────────────────────────────────────────
    document.getElementById("loginBtn").addEventListener("click", async () => {
    const email    = document.getElementById("user").value.trim();
    const password = document.getElementById("password").value;
    const errorEl  = document.getElementById("loginError");
    errorEl.style.display = "none";

    if (!email || !password) {
    errorEl.textContent = "Por favor rellena todos los campos.";
    errorEl.style.display = "block";
    return;
}

    try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    loggedUid = userCredential.user.uid;

    sessionStorage.setItem("userId", loggedUid);
    sessionStorage.setItem("userEmail", email);

    const userData = await db.getUser(loggedUid);

    if (userData.role) {
    sessionStorage.setItem("userRole", userData.role);
    const oId = (userData.role === "gym" || userData.role === "professional") ? loggedUid : null;
    if (oId) sessionStorage.setItem("ownerId", oId);
    redirectByRole(userData.role, oId);
} else {
    document.getElementById("roleOverlay").classList.add("active");
}
} catch (e) {
    console.error(e);
    document.getElementById("loginError").textContent = "Email o contraseña incorrectos.";
    document.getElementById("loginError").style.display = "block";
}
});

    document.getElementById("password").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
});

    // ── Selección de rol ──────────────────────────────────
    document.querySelectorAll(".role-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const role = btn.dataset.role;
        if (!loggedUid) return;

        // Deshabilitar botones mientras procesa
        document.querySelectorAll(".role-btn").forEach(b => b.disabled = true);

        try {
            await db.setUserRole(loggedUid, role);
            sessionStorage.setItem("userRole", role);

            if (role === "gym" || role === "professional") {
                /*
                const colName = role === "gym" ? "gyms" : "professionals";
                */
                const uData = db.getUser(loggedUid);
                /* ¿Es importante que dueño de gimnasio y gimnasio tengan el mismo Id?
                await setDoc(doc(db, colName, loggedUid), {
                const colName  = role === "gym" ? "gyms" : "professionals";
                const userSnap = await getDoc(doc(db, "users", loggedUid));
                const uData    = userSnap.exists() ? userSnap.data() : {};

                // Intentar obtener ubicación antes de crear el documento
                const location = await getLocationPromise();

                const docData = {
                    name: `${uData.name || ""} ${uData.surname || ""}`.trim(),
                    description: "",
                    contactInfo: "",
                    schedule: "",
                    type: role,
                    ownerId: loggedUid,
                    createdAt: serverTimestamp()
                };

                // Solo añadir location si se obtuvo correctamente
                if (location) docData.location = location;

                await setDoc(doc(db, colName, loggedUid), docData);
                });
                */
                if (role === "gym") {
                    await db.addGym({
                        name: `${uData.name || ""} ${uData.surname || ""}`.trim(),
                        description: "",
                        contactInfo: "",
                        schedule: "",
                        ownerId: loggedUid,
                    }, loggedUid)
                } else if (role === "professional") {
                    await db.addProfessional({
                        name: `${uData.name || ""} ${uData.surname || ""}`.trim(),
                        description: "",
                        contactInfo: "",
                        schedule: "",
                        ownerId: loggedUid,
                    }, loggedUid)
                }

                sessionStorage.setItem("ownerId", loggedUid);
            }

            document.getElementById("roleOverlay").classList.remove("active");
            redirectByRole(role, loggedUid);
        } catch (error) {
            console.error("Error al asignar rol:", error);
            document.querySelectorAll(".role-btn").forEach(b => b.disabled = false);
        }
    });
});