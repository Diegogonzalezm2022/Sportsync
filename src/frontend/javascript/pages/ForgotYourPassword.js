    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

    const response = await fetch("../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    document.getElementById("continueBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const errorEl = document.getElementById("errorMsg");
    const successEl = document.getElementById("successMsg");

    if (!email) {
    errorEl.textContent = "Please enter your email.";
    errorEl.style.display = "block";
    return;
}

    try {
    await sendPasswordResetEmail(auth, email);
    successEl.textContent = "We have sent you an email to reset your password.";
    successEl.style.display = "block";
    errorEl.style.display = "none";

    // Espera 3 segundos y redirige al login
    setTimeout(() => {
    window.location.href = "Login.html";
}, 10000);

} catch (e) {
    errorEl.textContent = e.code === "auth/user-not-found"
    ? "No account found with that email."
    : "Error sending email. Please try again.";
    errorEl.style.display = "block";
}
});