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

function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        callback(el);
    } else {
        setTimeout(() => waitForElement(selector, callback), 50);
    }
}

window.addEventListener('load', () => {
    waitForElement('#auth-action-btn', (authActionBtn) => {
        const authOnlyItems = document.querySelectorAll('.auth-only');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                authOnlyItems.forEach(item => item.style.display = '');
                authActionBtn.textContent = 'Logout';
                authActionBtn.onclick = async () => {
                    await signOut(auth);
                    window.location.href = "Index.html";
                };
            } else {
                authOnlyItems.forEach(item => item.style.display = 'none');
                authActionBtn.textContent = 'Login';
                authActionBtn.onclick = () => {
                    window.location.href = "Login.html";
                };
            }
        });
    });
});