// 1. Importamos la App y Auth directamente desde la versión web de Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. Pegamos directamente tu configuración de firebaseConfig.json
const firebaseConfig = {
    apiKey: "AIzaSyBkcOUR-l-2Wgzxbv1pAP4_gSUDofRIkjU",
    authDomain: "proyecto2026ps.firebaseapp.com",
    projectId: "proyecto2026ps",
    storageBucket: "proyecto2026ps.firebasestorage.app",
    messagingSenderId: "124816158835",
    appId: "1:124816158835:web:39a68c1772fa3427a33a06",
    measurementId: "G-0G1XLG4TN2"
};

// 3. Inicializamos Firebase y extraemos la variable 'auth'
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 4. Tu lógica original intacta
document.addEventListener("DOMContentLoaded", () => {
    const authOnlyItems = document.querySelectorAll('.auth-only');
    const authActionBtn = document.getElementById('auth-action-btn');

    if(authActionBtn) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuario logueado
                authOnlyItems.forEach(item => {
                    item.style.display = '';
                });

                authActionBtn.textContent = 'Logout';
                authActionBtn.onclick = async () => {
                    try {
                        await signOut(auth);
                        window.location.href = "Index.html";
                    } catch (error) {
                        console.error("Error al cerrar sesión:", error);
                    }
                };
            } else {
                // Visitante
                authOnlyItems.forEach(item => {
                    item.style.display = 'none';
                });

                authActionBtn.textContent = 'Login';
                authActionBtn.onclick = () => {
                    window.location.href = "Login.html";
                };
            }
        });
    }
});