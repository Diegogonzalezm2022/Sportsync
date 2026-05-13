import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const response = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await response.json();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Si viene ?id=XXX en la URL carga ese perfil, si no carga el propio
const params = new URLSearchParams(window.location.search);
const queryId = params.get("id");
const profileId = queryId || userId;
// Solo es perfil propio si NO hay queryId o si el queryId es exactamente igual al userId del usuario logueado
const isOwnProfile = !queryId || (queryId === userId);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        loadProfile();
    }
});

async function loadProfile() {
    try {
        const data = await api.getUser(profileId);

        if (data && data.id) {
            document.getElementById("profile-name").textContent  = `${data.name || ""} ${data.surname || ""}`.trim() || "—";
            document.getElementById("profile-user").textContent  = data.username || "—";
            document.getElementById("profile-email").textContent = data.email    || "—";
            document.getElementById("profile-bio").textContent   = data.bio      || "—";

            if (data.phone) {
                document.getElementById("profile-phone").textContent = data.phone;
                document.getElementById("phone-group").style.display = "block";
            }

            if (data.paymentMethod) {
                const labels = { card: "Tarjeta de crédito", paypal: "PayPal", bizum: "Bizum" };
                const detail = data.paymentDetails ? ` · ${data.paymentDetails}` : "";
                document.getElementById("profile-payment").textContent = (labels[data.paymentMethod] || data.paymentMethod) + detail;
                document.getElementById("payment-group").style.display = "block";
            }

            if (data.photoURL) {
                const img = document.getElementById("profile-picture");
                img.src = data.photoURL;
                img.style.display = "block";
                document.getElementById("profile-avatar-svg").style.display = "none";
            }

            // Ocultar botones de edición si estamos viendo el perfil de otro usuario
            if (!isOwnProfile) {
                // Ocultar sección de edición
                const editDiv = document.querySelector(".btn-edit-profile");
                if (editDiv) editDiv.style.display = "none";
                
                // Ocultar sección de reservas
                const reservDiv = document.querySelector(".profile-reserv");
                if (reservDiv) reservDiv.style.display = "none";
                
                const sharedFiles = document.getElementById("shared-files");
                if (sharedFiles) sharedFiles.style.display = "none";
            } else {
                // Asegurar que se vean si es el perfil propio (por si acaso)
                const editDiv = document.querySelector(".btn-edit-profile");
                if (editDiv) editDiv.style.display = "block";
                
                const reservDiv = document.querySelector(".profile-reserv");
                if (reservDiv) reservDiv.style.display = "block";
                
                const sharedFiles = document.getElementById("shared-files");
                if (sharedFiles) sharedFiles.style.display = "block";
            }
        } else {
            console.warn("No se encontraron datos del usuario.");
            document.getElementById("profile-name").textContent = "Usuario no encontrado";
        }
    } catch (error) {
        console.error("Error cargando perfil:", error);
    }
}