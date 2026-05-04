import FirebaseDb from "../services/FirebaseDb.js";

const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const db = await FirebaseDb.create();
const data = await db.getUser(userId);

if (data && Object.keys(data).length > 0) {

    document.getElementById("profile-name").textContent  = `${data.name || ""} ${data.surname || ""}`.trim() || "—";
    document.getElementById("profile-user").textContent  = data.username || "—";
    document.getElementById("profile-email").textContent = data.email    || "—";
    document.getElementById("profile-bio").textContent   = data.bio      || "—";

    // Teléfono (solo si existe)
    if (data.phone) {
        document.getElementById("profile-phone").textContent = data.phone;
        document.getElementById("phone-group").style.display = "block";
    }

    // Método de pago (solo si existe)
    if (data.paymentMethod) {
        const labels = { card: "Tarjeta de crédito", paypal: "PayPal", bizum: "Bizum" };
        const detail = data.paymentDetails ? ` · ${data.paymentDetails}` : "";
        document.getElementById("profile-payment").textContent = (labels[data.paymentMethod] || data.paymentMethod) + detail;
        document.getElementById("payment-group").style.display = "block";
    }

    // Foto de perfil (solo si existe)
    if (data.photoURL) {
        const img = document.getElementById("profile-picture");
        img.src = data.photoURL;
        img.style.display = "block";
        document.getElementById("profile-avatar-svg").style.display = "none";
    }
} else {
    console.warn("No se encontraron datos del usuario en Firestore.");
}