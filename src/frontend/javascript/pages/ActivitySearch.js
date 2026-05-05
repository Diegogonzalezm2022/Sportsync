import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import api from "../services/api.js";

const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const response = await fetch("../../assets/firebaseConfig.json");
const firebaseConfig = await response.json();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let userLat = null;
let userLng = null;
let allResults = [];
let activeFilter = "todos";
let map = null;
let mapBig = null;
let mapBigInitialized = false;
let userMarker = null;
const resultMarkers = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        api.setToken(token);

        try {
            const userData = await api.getUser(userId);
            const userNameEl = document.getElementById("userName");
            if (userNameEl) {
                userNameEl.textContent =
                    userData.username || `${userData.name || ""} ${userData.surname || ""}`.trim() ||
                    sessionStorage.getItem("userEmail") || "Usuario";
            }
            if (userData.photoURL) {
                const avatarDiv = document.querySelector(".user-avatar");
                if (avatarDiv) {
                    avatarDiv.innerHTML = `<img src="${userData.photoURL}" alt="Foto de perfil"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }
            }
        } catch (e) {
            const userNameEl = document.getElementById("userName");
            if (userNameEl) {
                userNameEl.textContent =
                    sessionStorage.getItem("userEmail") || "Usuario";
            }
        }

        const userRole = sessionStorage.getItem("userRole") || "";
        const userRoleEl = document.getElementById("userRole");
        if (userRoleEl) {
            userRoleEl.textContent =
                userRole === "gym" ? "Gimnasio"
                    : userRole === "professional" ? "Profesional"
                        : "Usuario";
        }
    }
});

function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;
    map = L.map("map").setView([28.1235, -15.4362], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);
}

function initMapBig() {
    if (mapBigInitialized) return;
    const mapBigEl = document.getElementById("mapBig");
    if (!mapBigEl) return;
    mapBig = L.map("mapBig").setView([28.1235, -15.4362], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(mapBig);
    mapBigInitialized = true;
}

function syncMapBig() {
    if (!mapBig) return;
    mapBig.setView(map.getCenter(), map.getZoom());
    mapBig.eachLayer(layer => {
        if (layer instanceof L.Marker) mapBig.removeLayer(layer);
    });
    if (userLat !== null) {
        L.marker([userLat, userLng], {
            icon: L.divIcon({
                className: "",
                html: `<div style="width:16px;height:16px;border-radius:50%;
                       background:#2d6a4f;border:3px solid white;
                       box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
                iconSize: [16, 16], iconAnchor: [8, 8]
            })
        }).addTo(mapBig).bindPopup("Tu ubicación");
    }
    allResults.forEach(item => {
        const isGym = item.type === "gym";
        const color = isGym ? "#1d3557" : "#c08000";
        const emoji = isGym ? "🏋️" : "👤";
        const page  = isGym ? "GymPage" : "ProfessionalPage";
        const marker = L.marker([item.location.lat, item.location.lng], {
            icon: L.divIcon({
                className: "",
                html: `<div style="background:${color};color:white;border-radius:8px;
                       padding:4px 7px;font-size:11px;font-weight:700;
                       white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);
                       border:2px solid white;cursor:pointer;">
                       ${emoji} ${item.name}</div>`,
                iconAnchor: [0, 0]
            })
        }).addTo(mapBig);
        marker.bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;">
                <strong style="font-size:0.95rem;">${item.name}</strong><br>
                <span style="font-size:0.78rem;color:#666;">${item.description || ""}</span><br>
                <span style="font-size:0.75rem;color:#999;">${item.distanceKm.toFixed(1)} km</span><br>
                <a href="${page}.html?id=${item.id}"
                   style="display:inline-block;margin-top:8px;padding:5px 12px;
                          background:#1a1a1a;color:white;border-radius:6px;
                          font-size:0.78rem;font-weight:600;text-decoration:none;">
                    Ver perfil →
                </a>
            </div>`);
    });
    if (userLat !== null && allResults.length > 0) {
        mapBig.fitBounds(
            [[userLat, userLng], ...allResults.map(r => [r.location.lat, r.location.lng])],
            { padding: [40, 40] }
        );
    }
    setTimeout(() => mapBig.invalidateSize(), 100);
}

function getLocation() {
    if (!navigator.geolocation) {
        showStatus("Tu navegador no soporta geolocalización.", true); return;
    }
    showStatus("Obteniendo tu ubicación...");
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            if (userMarker && map) map.removeLayer(userMarker);
            userMarker = L.marker([userLat, userLng], {
                icon: L.divIcon({
                    className: "",
                    html: `<div style="width:16px;height:16px;border-radius:50%;
                           background:#2d6a4f;border:3px solid white;
                           box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
                    iconSize: [16, 16], iconAnchor: [8, 8]
                })
            }).addTo(map).bindPopup("Tu ubicación");
            map.setView([userLat, userLng], 14);
            hideStatus();
            await searchNearby();
        },
        (err) => {
            showStatus(err.code === 1
                ? "Permiso de ubicación denegado." : "No se pudo obtener tu ubicación.", true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function searchNearby() {
    showStatus("Buscando cerca de ti...");
    const radiusKm = 50;

    try {
        const [gymsRes, professionalsRes] = await Promise.all([
            api.getGyms(userLat, userLng, radiusKm),
            api.getProfessionals(userLat, userLng, radiusKm)
        ]);

        allResults = [];

        const gyms = Array.isArray(gymsRes) ? gymsRes : [];
        const professionals = Array.isArray(professionalsRes) ? professionalsRes : [];

        for (const gym of gyms) {
            allResults.push({
                id: gym.id,
                type: "gym",
                name: gym.name || "Gimnasio",
                description: gym.description || "",
                location: gym.location,
                rating: gym.rating || 0,
                photoURL: gym.photoURL || null,
                distanceKm: calcDistance(userLat, userLng, gym.location.lat, gym.location.lng),
                _prices: gym.activityPrices || []
            });
        }

        for (const pro of professionals) {
            allResults.push({
                id: pro.id,
                type: "professional",
                name: pro.name || "Profesional",
                description: pro.description || "",
                location: pro.location,
                rating: pro.rating || 0,
                photoURL: pro.photoURL || null,
                distanceKm: calcDistance(userLat, userLng, pro.location.lat, pro.location.lng),
                _prices: pro.activityPrices || []
            });
        }

        allResults.sort((a, b) => a.distanceKm - b.distanceKm);

        resultMarkers.forEach(m => { if (map) map.removeLayer(m); });
        resultMarkers.length = 0;

        allResults.forEach(item => {
            const isGym = item.type === "gym";
            const color = isGym ? "#1d3557" : "#c08000";
            const emoji = isGym ? "🏋️" : "👤";
            const marker = L.marker([item.location.lat, item.location.lng], {
                icon: L.divIcon({
                    className: "",
                    html: `<div style="background:${color};color:white;border-radius:8px;
                           padding:4px 7px;font-size:11px;font-weight:700;
                           white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);
                           border:2px solid white;cursor:pointer;">
                           ${emoji} ${item.name}</div>`,
                    iconAnchor: [0, 0]
                })
            }).addTo(map);
            marker.bindPopup(`
                <div style="font-family:sans-serif;min-width:160px;">
                    <strong style="font-size:0.95rem;">${item.name}</strong><br>
                    <span style="font-size:0.78rem;color:#666;">${item.description || ""}</span><br>
                    <span style="font-size:0.75rem;color:#999;">${item.distanceKm.toFixed(1)} km</span><br>
                    <a href="${isGym ? "GymPage" : "ProfessionalPage"}.html?id=${item.id}"
                       style="display:inline-block;margin-top:8px;padding:5px 12px;
                              background:#1a1a1a;color:white;border-radius:6px;
                              font-size:0.78rem;font-weight:600;text-decoration:none;">
                        Ver perfil →
                    </a>
                </div>`);
            resultMarkers.push(marker);
        });

        if (allResults.length > 0) {
            map.fitBounds(
                [[userLat, userLng], ...allResults.map(r => [r.location.lat, r.location.lng])],
                { padding: [40, 40] }
            );
        }

        hideStatus();
        renderResults(filterResults(allResults));

        if (allResults.length === 0) {
            showStatus("No se encontraron gyms ni profesionales cerca de ti.", true);
        }

    } catch (e) {
        console.error(e);
        showStatus("Error al buscar. Comprueba que el backend está funcionando.", true);
    }
}

function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFilterValues() {
    const sportEl = document.getElementById("filterSport");
    const materialEl = document.getElementById("filterMaterial");
    const priceMinEl = document.getElementById("filterPriceMin");
    const priceMaxEl = document.getElementById("filterPriceMax");
    return {
        sport:    sportEl ? sportEl.value.trim().toLowerCase() : "",
        material: materialEl ? materialEl.value.trim().toLowerCase() : "",
        priceMin: priceMinEl ? (parseFloat(priceMinEl.value) || null) : null,
        priceMax: priceMaxEl ? (parseFloat(priceMaxEl.value) || null) : null,
    };
}

function filterResults(results) {
    const searchEl = document.getElementById("searchInput");
    const searchText = searchEl ? searchEl.value.toLowerCase() : "";
    const { sport, material, priceMin, priceMax } = getFilterValues();

    const hasFilters = sport || material || priceMin !== null || priceMax !== null;
    const dotEl = document.getElementById("filterActiveDot");
    if (dotEl) dotEl.style.display = hasFilters ? "inline-block" : "none";

    return results.filter(item => {
        const desc = (item.description || "").toLowerCase();
        if (activeFilter !== "todos" && item.type !== activeFilter) return false;
        if (searchText && !item.name?.toLowerCase().includes(searchText) &&
            !desc.includes(searchText)) return false;
        if (sport && !desc.includes(sport)) return false;
        if (material && !desc.includes(material)) return false;
        if (priceMin !== null || priceMax !== null) {
            const prices = item._prices || [];
            if (prices.length === 0) return false;
            const hasMatch = prices.some(p => {
                if (priceMin !== null && p < priceMin) return false;
                if (priceMax !== null && p > priceMax) return false;
                return true;
            });
            if (!hasMatch) return false;
        }
        return true;
    });
}

function renderResults(results) {
    const list = document.getElementById("resultsList");
    if (!list) return;
    if (results.length === 0) {
        list.innerHTML = `<p class="no-results">No se encontraron resultados con esos filtros.</p>`;
        return;
    }
    list.innerHTML = results.map(item => {
        const isGym      = item.type === "gym";
        const badgeClass = isGym ? "result-badge--gym" : "result-badge--trainer";
        const badgeText  = isGym ? "Gimnasio" : "Entrenador";
        const distance   = item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : "";
        const rating     = item.rating ? `★ ${Number(item.rating).toFixed(1)}` : "★ —";
        const page       = isGym ? "GymPage" : "ProfessionalPage";

        const photoHTML = item.photoURL
            ? `<img src="${item.photoURL}" alt="${item.name}"
                style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="4"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
               </svg>`;

        let priceTag = "";
        if (item._prices && item._prices.length > 0) {
            const min = Math.min(...item._prices);
            const max = Math.max(...item._prices);
            priceTag = min === max
                ? `<span class="result-price">desde ${min}€</span>`
                : `<span class="result-price">${min}€ – ${max}€</span>`;
        }

        return `
        <div class="result-card">
            <div class="result-photo">
                <span class="result-photo-placeholder">
                    ${photoHTML}
                </span>
            </div>
            <div class="result-info">
                <div class="result-header">
                    <span class="result-name">${item.name}</span>
                    <span class="result-badge ${badgeClass}">${badgeText}</span>
                </div>
                <p class="result-desc">${item.description || ""}</p>
                <div class="result-meta">
                    ${distance ? `<span class="result-distance">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                            <circle cx="12" cy="9" r="2.5"/>
                        </svg>
                        ${distance}
                    </span>` : ""}
                    <span class="result-rating">${rating}</span>
                    ${priceTag}
                </div>
            </div>
            <button class="result-book-btn" data-page="${page}" data-id="${item.id}">
                Ver perfil
            </button>
        </div>`;
    }).join("");

    list.querySelectorAll(".result-book-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = `${btn.dataset.page}.html?id=${btn.dataset.id}`;
        });
    });
}

function showStatus(msg, isError = false) {
    const el = document.getElementById("statusMsg");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = isError ? "var(--danger,#c0392b)" : "var(--text-muted,#999)";
}
function hideStatus() {
    const el = document.getElementById("statusMsg");
    if (el) el.style.display = "none";
}

function setupEventListeners() {
    const mapExpandBtn = document.getElementById("mapExpandBtn");
    if (mapExpandBtn) mapExpandBtn.addEventListener("click", () => {
        initMapBig(); syncMapBig();
        const overlay = document.getElementById("mapModalOverlay");
        if (overlay) overlay.classList.add("active");
    });

    const mapModalClose = document.getElementById("mapModalClose");
    if (mapModalClose) mapModalClose.addEventListener("click", () => {
        const overlay = document.getElementById("mapModalOverlay");
        if (overlay) overlay.classList.remove("active");
    });

    const mapModalOverlay = document.getElementById("mapModalOverlay");
    if (mapModalOverlay) mapModalOverlay.addEventListener("click", (e) => {
        if (e.target === mapModalOverlay) mapModalOverlay.classList.remove("active");
    });

    ["filterSport", "filterMaterial", "filterPriceMin", "filterPriceMax"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () =>
            renderResults(filterResults(allResults)));
    });

    const filterResetBtn = document.getElementById("filterResetBtn");
    if (filterResetBtn) filterResetBtn.addEventListener("click", () => {
        const fs = document.getElementById("filterSport"); if (fs) fs.value = "";
        const fm = document.getElementById("filterMaterial"); if (fm) fm.value = "";
        const fpm = document.getElementById("filterPriceMin"); if (fpm) fpm.value = "";
        const fpx = document.getElementById("filterPriceMax"); if (fpx) fpx.value = "";
        const dot = document.getElementById("filterActiveDot"); if (dot) dot.style.display = "none";
        renderResults(filterResults(allResults));
    });

    const useLocationBtn = document.getElementById("useLocationBtn");
    if (useLocationBtn) useLocationBtn.addEventListener("click", getLocation);

    const searchLocationBtn = document.getElementById("searchLocationBtn");
    if (searchLocationBtn) searchLocationBtn.addEventListener("click", getLocation);

    const searchSubmitBtn = document.getElementById("searchSubmitBtn");
    if (searchSubmitBtn) searchSubmitBtn.addEventListener("click", () =>
        renderResults(filterResults(allResults)));

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keydown", e => {
            if (e.key === "Enter") renderResults(filterResults(allResults));
        });
        searchInput.addEventListener("input", e => {
            const clearBtn = document.getElementById("searchClearBtn");
            if (clearBtn) clearBtn.classList.toggle("hidden", e.target.value.length === 0);
        });
    }

    const searchClearBtn = document.getElementById("searchClearBtn");
    if (searchClearBtn) searchClearBtn.addEventListener("click", () => {
        const si = document.getElementById("searchInput");
        if (si) si.value = "";
        searchClearBtn.classList.add("hidden");
        renderResults(filterResults(allResults));
    });

    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
            chip.classList.add("chip--active");
            activeFilter = chip.dataset.filter;
            renderResults(filterResults(allResults));
        });
    });
}

function initApp() {
    initMap();
    setupEventListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
