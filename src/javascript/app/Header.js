// Importamos la conexión real a Firebase de tu proyecto (Asegúrate de que la ruta sea correcta)
import { auth } from '../../javascript/app/FirebaseDb.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Buscamos los elementos que hemos marcado arriba
    const authOnlyItems = document.querySelectorAll('.auth-only');
    const authActionBtn = document.getElementById('auth-action-btn');

    if(authActionBtn) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // ✅ USUARIO LOGUEADO
                // Mostramos el avatar y los botones de historial, perfil, etc.
                authOnlyItems.forEach(item => {
                    item.style.display = ''; // Vacío para que respete tu CSS original (flex/block)
                });

                // Configuramos el botón para Cerrar Sesión
                authActionBtn.textContent = 'Logout';
                authActionBtn.onclick = async () => {
                    try {
                        await signOut(auth);
                        window.location.href = "Index.html"; // Redirige a Index al salir
                    } catch (error) {
                        console.error("Error al cerrar sesión:", error);
                    }
                };
            } else {
                // ❌ USUARIO NO LOGUEADO (Visitante)
                // Ocultamos el avatar y los botones privados
                authOnlyItems.forEach(item => {
                    item.style.display = 'none';
                });

                // Configuramos el botón para Iniciar Sesión
                authActionBtn.textContent = 'Login';
                authActionBtn.onclick = () => {
                    window.location.href = "Login.html"; // Redirige a Login al pulsar
                };
            }
        });
    }
});