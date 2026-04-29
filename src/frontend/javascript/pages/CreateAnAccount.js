    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
    import FirebaseDb from "../../../backend/javascript/app/FirebaseDb.js";

    const response = await fetch("../../assets/firebaseConfig.json");
    const firebaseConfig = await response.json();
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    const db = await FirebaseDb.create()
    // Leer el rol elegido en RegisterAs.html (guardado en sessionStorage)
    const role = sessionStorage.getItem("registerRole") || "user";

    document.getElementById("registerBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const name = document.getElementById("name").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const passwordRepeat = document.getElementById("passwordRepeat").value;
    const errorEl = document.getElementById("registerError");

    errorEl.style.display = "none";

    if (!email || !name || !surname || !username || !password || !passwordRepeat) {
    errorEl.textContent = "Por favor rellena todos los campos.";
    errorEl.style.display = "block";
    return;
}
    if (password !== passwordRepeat) {
    errorEl.textContent = "Las contraseñas no coinciden.";
    errorEl.style.display = "block";
    return;
}
    if (password.length < 6) {
    errorEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errorEl.style.display = "block";
    return;
}

    try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    // Guardar datos sin rol todavía

    await db.addUser({
    name,
    surname,
    username,
    email
}, uid);

    sessionStorage.setItem("userId", uid);
    sessionStorage.setItem("userEmail", email);

    // Redirigir a Login para que aparezca el popup de rol
    // pero marcamos que viene del registro para forzar el popup
    sessionStorage.setItem("showRolePopup", "true");
    window.location.href = "Login.html";

} catch (e) {
    errorEl.style.display = "block";
    errorEl.textContent =
    e.code === "auth/email-already-in-use"
    ? "Este email ya está registrado."
    : "Error al registrarse. Inténtalo de nuevo.";
}
});
