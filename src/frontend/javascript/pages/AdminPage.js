import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const resp = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await resp.json();
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const userId = sessionStorage.getItem("userId");
const userRole = sessionStorage.getItem("userRole");

if (!userId || userRole !== 'admin') {
    window.location.href = "Login.html";
}

let allUsers = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);
        loadUsers();
    }
});

async function loadUsers() {
    try {
        const users = await api.adminGetAllUsers();
        allUsers = users.filter(u => u.role !== 'admin');
        renderUsers(allUsers);
    } catch (error) {
        console.error("Error cargando usuarios:", error);
        document.getElementById("usersList").innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar usuarios. Asegúrate de tener permisos de administrador.</td></tr>`;
    }
}

function renderUsers(users) {
    const container = document.getElementById("usersList");
    if (users.length === 0) {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">No se encontraron usuarios.</td></tr>`;
        return;
    }

    container.innerHTML = users.map(u => `
        <tr>
            <td>
                <div class="user-info">
                    ${u.photoURL 
                        ? `<img src="${u.photoURL}" class="user-avatar" onerror="this.src='../../assets/imagenes/default-avatar.png'">` 
                        : `<div class="user-avatar" style="display:flex; align-items:center; justify-content:center; background:#f0f0f0; font-size:1.2rem;">👤</div>`
                    }
                    <div>
                        <div style="font-weight:600;">${u.name || 'Sin nombre'} ${u.surname || ''}</div>
                        <div style="font-size:0.8rem; color:#666;">@${u.username || '—'}</div>
                    </div>
                </div>
            </td>
            <td>${u.email || '—'}</td>
            <td><span class="role-badge role-${u.role || 'user'}">${u.role || 'user'}</span></td>
            <td>
                <div class="actions-btns">
                    <button class="action-btn edit-btn" data-id="${u.id}">Editar</button>
                    <button class="action-btn delete-btn" data-id="${u.id}">Borrar</button>
                </div>
            </td>
        </tr>
    `).join("");

    container.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = () => openEditModal(btn.dataset.id);
    });

    container.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => deleteUser(btn.dataset.id);
    });
}

document.getElementById("userSearch").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.surname && u.surname.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
    renderUsers(filtered);
};

const modal = document.getElementById("editModal");
const closeBtn = document.getElementById("closeModal");

function openEditModal(id) {
    const u = allUsers.find(x => x.id === id);
    if (!u) return;

    document.getElementById("editUserId").value = u.id;
    document.getElementById("editName").value = u.name || "";
    document.getElementById("editSurname").value = u.surname || "";
    document.getElementById("editUsername").value = u.username || "";
    document.getElementById("editEmail").value = u.email || "";
    document.getElementById("editPhone").value = u.phone || "";
    document.getElementById("editRole").value = u.role || "user";
    document.getElementById("editBio").value = u.bio || "";

    modal.style.display = "flex";
}

closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

document.getElementById("editUserForm").onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById("editUserId").value;
    const role = document.getElementById("editRole").value;
    const data = {
        name: document.getElementById("editName").value,
        surname: document.getElementById("editSurname").value,
        username: document.getElementById("editUsername").value,
        phone: document.getElementById("editPhone").value,
        role: role,
        bio: document.getElementById("editBio").value
    };

    try {
        await api.adminUpdateUser(id, data);

        if (role === "gym" || role === "professional") {
            const col = role === "gym" ? "gyms" : "professionals";
            try {
                await api.getGym(id);
            } catch {
                const createFn = role === "gym" ? api.createGym : api.createProfessional;
                await createFn({
                    name: data.name,
                    description: data.bio || "",
                    contactInfo: data.phone || "",
                    photoURL: "",
                    schedule: "",
                    ownerId: id
                }, id);
            }
        }

        alert("Usuario actualizado con éxito.");
        modal.style.display = "none";
        loadUsers();
    } catch (error) {
        console.error(error);
        alert("Error al actualizar usuario: " + error.message);
    }
};

async function deleteUser(id) {
    if (id === userId) {
        alert("No puedes borrar tu propia cuenta desde aquí.");
        return;
    }

    if (!confirm("¿Estás seguro de que deseas borrar esta cuenta permanentemente? Esta acción no se puede deshacer.")) {
        return;
    }

    try {
        await api.adminDeleteUser(id);
        alert("Cuenta eliminada con éxito.");
        loadUsers();
    } catch (error) {
        console.error(error);
        alert("Error al eliminar usuario: " + error.message);
    }
}
