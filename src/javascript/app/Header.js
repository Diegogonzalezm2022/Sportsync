import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

let app;
try {
    app = getApp();
} catch {
    app = initializeApp({
        apiKey: "AIzaSyBe7Muffm1j7b8apziWK13B_54q6DCaUT0",
        authDomain: "proyecto2026ps.firebaseapp.com",
        projectId: "proyecto2026ps",
        storageBucket: "proyecto2026ps.firebasestorage.app",
        messagingSenderId: "124816158835",
        appId: "1:124816158835:web:39a68c1772fa3427a33a06"
    });
}

const auth = getAuth(app);

function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        callback(el);
    } else {
        setTimeout(() => waitForElement(selector, callback), 50);
    }
}

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