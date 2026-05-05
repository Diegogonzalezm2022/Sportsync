import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

// Check authentication and redirect if not logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Save the current page URL to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = "Login.html";
    }
});
