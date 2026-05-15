import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const response = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await response.json();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let loggedUid = null;

function redirectByRole(role, ownId) {
    if (role === "admin")
        window.location.href = "AdminPage.html";
    else if (role === "gym")
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

        // Configurar token para el API
        const token = await userCredential.user.getIdToken();
        api.setToken(token);

        const userData = await api.getUser(loggedUid);

        if (userData && userData.role) {
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
            await api.setUserRole(loggedUid, role);
            sessionStorage.setItem("userRole", role);

            if (role === "gym" || role === "professional") {
                const userData = await api.getUser(loggedUid);

                // Intentar obtener ubicación antes de crear el documento
                const location = await getLocationPromise();

                const gymOrProData = {
                    name: `${userData.name || ""} ${userData.surname || ""}`.trim(),
                    description: "",
                    contactInfo: "",
                    schedule: "",
                    ownerId: loggedUid,
                };

                if (role === "gym") {
                    await api.createGym(gymOrProData, loggedUid);
                } else if (role === "professional") {
                    await api.createProfessional(gymOrProData, loggedUid);
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
