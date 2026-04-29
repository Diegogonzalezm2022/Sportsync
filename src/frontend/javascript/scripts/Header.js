import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

let app;

async function initFirebase() {
    try {
        app = getApp();
    } catch {
        const response = await fetch("../assets/firebaseConfig.json");
        const firebaseConfig = await response.json();
        app = initializeApp(firebaseConfig);
    }
    return app;
}

await initFirebase();
const auth = getAuth(app);

function updateAuthButton() {
    const authActionBtn = document.getElementById('auth-action-btn');
    if (!authActionBtn) return;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            authActionBtn.textContent = 'Logout';
            authActionBtn.onclick = async () => {
                await signOut(auth);
                window.location.href = "Index.html";
            };
        } else {
            authActionBtn.textContent = 'Login';
            authActionBtn.onclick = () => {
                window.location.href = "Login.html";
            };
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAuthButton);
} else {
    updateAuthButton();
}