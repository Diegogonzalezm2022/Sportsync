import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const response = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await response.json();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configurar token cuando el usuario esté autenticado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        loadProfile();
    }
});

let newPhotoBase64 = null;

// ── Cargar datos actuales del usuario ────────────────
async function loadProfile() {
    try {
        const data = await api.getUser(userId);

        if (data && data.id) {
            document.getElementById("username").value = data.username || "";
            document.getElementById("bio").value = data.bio || "";
            document.getElementById("email").textContent = data.email || "";
            document.getElementById("phone").value = data.phone || "";
            document.getElementById("payment-method").value = data.paymentMethod || "";
            document.getElementById("payment-details").value = data.paymentDetails || "";

            if (data.photoURL) {
                const preview = document.getElementById("avatarPreview");
                preview.src = data.photoURL;
                preview.style.display = "block";
                document.getElementById("avatarSvg").style.display = "none";
            }
        }
    } catch (error) {
        console.error("Error cargando perfil:", error);
    }
}

// ── Foto de perfil — preview local ───────────────────
document.getElementById("avatarCircle").addEventListener("click", () => {
    document.getElementById("photoInput").click();
});

document.getElementById("photoInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        newPhotoBase64 = e.target.result; // base64
        const preview = document.getElementById("avatarPreview");
        preview.src = newPhotoBase64;
        preview.style.display = "block";
        document.getElementById("avatarSvg").style.display = "none";
    };
    reader.readAsDataURL(file);
});

// ── Guardar cambios ───────────────────────────────────
document.getElementById("saveBtn").addEventListener("click", async () => {
    const saveMsg = document.getElementById("saveMsg");
    const errorMsg = document.getElementById("errorMsg");
    saveMsg.style.display = "none";
    errorMsg.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const bio = document.getElementById("bio").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const paymentMethod = document.getElementById("payment-method").value;
    const paymentDetails = document.getElementById("payment-details").value.trim();

    if (!username) {
        errorMsg.textContent = "El nombre de usuario no puede estar vacío.";
        errorMsg.style.display = "block";
        return;
    }

    try {
        const updateData = {
            username,
            bio,
            phone,
            paymentMethod,
            paymentDetails
        };

        // Guardar foto en base64 si se cambió
        if (newPhotoBase64) {
            updateData.photoURL = newPhotoBase64;
        }

        await api.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        saveMsg.style.display = "block";
        setTimeout(() => {
            window.location.href = "ProfileUser.html";
        }, 1500);

    } catch (e) {
        console.error(e);
        errorMsg.textContent = "Error al guardar los cambios. Inténtalo de nuevo.";
        errorMsg.style.display = "block";
    }
});
