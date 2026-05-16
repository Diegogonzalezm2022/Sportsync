import { getApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

let app;
try {
    app = getApp();
} catch {
    const res = await fetch("../../assets/firebaseConfig.json");
    const cfg = await res.json();
    app = initializeApp(cfg);
}

const auth = getAuth(app);

function addBtn(nav, label, action, className = "") {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = action;
    if (className) btn.className = className;
    nav.appendChild(btn);
}

function buildMenu() {
    const nav = document.getElementById("header-nav");
    if (!nav) return;

    nav.innerHTML = "";

    const role           = sessionStorage.getItem("userRole");
    const userId         = sessionStorage.getItem("userId");
    const page           = window.location.pathname.split("/").pop();
    const isLoginPage    = page === "Login.html";
    const isRegisterPage = page === "CreateAnAccount.html";
    const isIndexPage    = page === "Index.html" || page === "";
    const isAuthPage     = isLoginPage || isRegisterPage;

    if (isAuthPage) {
        // ── Login / Registro: solo las opciones que no sean la página actual ──
        if (!isIndexPage)    addBtn(nav, "Inicio",       () => window.location.href = "Index.html");
        if (!isLoginPage)    addBtn(nav, "Login",        () => window.location.href = "Login.html", "logout-btn");
        if (!isRegisterPage) addBtn(nav, "Crear cuenta", () => window.location.href = "CreateAnAccount.html", "logout-btn");

    } else if (role === "admin") {
        // ── Administrador logueado ───────────────────────────────────────────
        if (!isIndexPage) addBtn(nav, "Inicio",         () => window.location.href = "Index.html");
        addBtn(nav, "Panel Admin",    () => window.location.href = "AdminPage.html");
        addBtn(nav, "Sobre Nosotros", () => window.location.href = "AboutUs.html");
        addBtn(nav, "Nuestro Equipo", () => window.location.href = "OurTeam.html");

        const authBtn = document.createElement("button");
        authBtn.className = "logout-btn";
        authBtn.textContent = "Cerrar sesión";
        authBtn.onclick = async () => {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = "Login.html";
        };
        nav.appendChild(authBtn);

    } else if (role === "gym" || role === "professional") {
        // ── Gimnasio o profesional logueado ──────────────────────────────────
        if (!isIndexPage) addBtn(nav, "Inicio",         () => window.location.href = "Index.html");
        addBtn(nav, "Editar Perfil",  () => window.location.href = `EditProfessionalPage.html?id=${userId}&type=${role}`);
        addBtn(nav, "Vetar Usuarios", () => window.location.href = `ViewReservation.html?id=${userId}&type=${role}`);
        addBtn(nav, "Sobre Nosotros", () => window.location.href = "AboutUs.html");
        addBtn(nav, "Nuestro Equipo", () => window.location.href = "OurTeam.html");

        const authBtn = document.createElement("button");
        authBtn.className = "logout-btn";
        authBtn.textContent = "Cerrar sesión";
        authBtn.onclick = async () => {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = "Login.html";
        };
        nav.appendChild(authBtn);

    } else if (userId) {
        // ── Usuario normal logueado ───────────────────────────────────────────
        if (!isIndexPage) addBtn(nav, "Inicio",             () => window.location.href = "Index.html");
        addBtn(nav, "Buscar Actividades", () => window.location.href = "ActivitySearch.html");
        addBtn(nav, "Editar Perfil",      () => window.location.href = "EditProfile.html");
        addBtn(nav, "Ver Reservas",          () => window.location.href = "History.html");
        addBtn(nav, "Sobre Nosotros",     () => window.location.href = "AboutUs.html");
        addBtn(nav, "Nuestro Equipo",     () => window.location.href = "OurTeam.html");

        const authBtn = document.createElement("button");
        authBtn.className = "logout-btn";
        authBtn.textContent = "Cerrar sesión";
        authBtn.onclick = async () => {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = "Login.html";
        };
        nav.appendChild(authBtn);

    } else {
        // ── No logueado ───────────────────────────────────────────────────────
        if (!isIndexPage) addBtn(nav, "Inicio",         () => window.location.href = "Index.html");
        addBtn(nav, "Sobre Nosotros", () => window.location.href = "AboutUs.html");
        addBtn(nav, "Nuestro Equipo", () => window.location.href = "OurTeam.html");

        const authBtn = document.createElement("button");
        authBtn.className = "logout-btn";
        authBtn.textContent = "Iniciar sesión";
        authBtn.onclick = () => window.location.href = "Login.html";
        nav.appendChild(authBtn);
    }
}

window.addEventListener("xlu-includes-complete", buildMenu);

// Intentar construir el menú inmediatamente por si el header ya se cargó
buildMenu();

// Reconstruir cuando cambie el estado de autenticación
onAuthStateChanged(auth, () => {
    buildMenu();
});