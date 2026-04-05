
import { auth } from '../../javascript/app/FirebaseDb.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const authOnlyItems = document.querySelectorAll('.auth-only');
    const authActionBtn = document.getElementById('auth-action-btn');

    if(authActionBtn) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
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