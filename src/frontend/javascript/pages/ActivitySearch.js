import FirebaseDb from "../services/FirebaseDb.js";

const userId = sessionStorage.getItem("userId");
if (!userId) window.location.href = "Login.html";

const db = await FirebaseDb.create();

try {
    const data = await db.getUser(userId);
    if (data && data.username) {
        document.getElementById("userName").textContent =
            data.username || `${data.name || ""} ${data.surname || ""}`.trim() ||
            sessionStorage.getItem("userEmail") || "Usuario";
        if (data.photoURL) {
            const avatarDiv = document.querySelector(".user-avatar");
            avatarDiv.innerHTML = `<img src="${data.photoURL}" alt="Foto de perfil"
                style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
    } else {
        document.getElementById("userName").textContent =
            sessionStorage.getItem("userEmail") || "Usuario";
    }
} catch (error) {
    console.error("Error loading user data:", error);
    document.getElementById("userName").textContent =
        sessionStorage.getItem("userEmail") || "Usuario";
}

const userRole = sessionStorage.getItem("userRole") || "";
document.getElementById("userRole").textContent =
    userRole === "gym" ? "Gimnasio"
        : userRole === "professional" ? "Profesional"
            : "Usuario";

let userLat = null;
let userLng = null;
let allResults = [];
let activeFilter = "todos";

const map = L.map("map").setView([28.1235, -15.4362], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

let mapBig = null;
let mapBigInitialized = false;

function initMapBig() {
    if (mapBigInitialized) return;
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

document.getElementById("mapExpandBtn").addEventListener("click", () => {
    initMapBig(); syncMapBig();
    document.getElementById("mapModalOverlay").classList.add("active");
});
document.getElementById("mapModalClose").addEventListener("click", () =>
    document.getElementById("mapModalOverlay").classList.remove("active"));
document.getElementById("mapModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("mapModalOverlay"))
        document.getElementById("mapModalOverlay").classList.remove("active");
});

let userMarker = null;
const resultMarkers = [];

function getLocation() {
    if (!navigator.geolocation) {
        showStatus("Tu navegador no soporta geolocalización.", true); return;
    }
    showStatus("Obteniendo tu ubicación...");
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            if (userMarker) map.removeLayer(userMarker);
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
        const entities = await db.findNearbyEntities(userLat, userLng, radiusKm);
        
        allResults = entities.map(item => {
            item.distanceKm = calcDistance(userLat, userLng, item.location.lat, item.location.lng);
            return item;
        }).sort((a, b) => a.distanceKm - b.distanceKm);

        await Promise.all(allResults.map(async item => {
            try {
                const activities = await db.getActivitiesByOwner(item.id);
                const prices = activities.map(d => {
                    const p = d.price;
                    return (p !== undefined && p !== null) ? parseFloat(p) : null;
                }).filter(p => p !== null);
                item._prices = prices;
            } catch { item._prices = []; }
        }));

        resultMarkers.forEach(m => map.removeLayer(m));
        resultMarkers.length = 0;
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
                           border:2px solid white;">${emoji} ${item.name}</div>`,
                    iconAnchor: [0, 0]
                })
            }).addTo(map);
            marker.bindPopup(`
                <div style="font-family:sans-serif;min-width:140px;">
                    <strong style="font-size:0.9rem;">${item.name}</strong><br>
                    <span style="font-size:0.75rem;color:#999;">${item.distanceKm.toFixed(1)} km</span><br>
                    <a href="${page}.html?id=${item.id}"
                       style="display:inline-block;margin-top:6px;padding:4px 10px;
                              background:#1a1a1a;color:white;border-radius:6px;
                              font-size:0.75rem;font-weight:600;text-decoration:none;">
                        Ver perfil →
                    </a>
                </div>`);
            resultMarkers.push(marker);
        });

        if (allResults.length > 0) {
            map.fitBounds(
                [[userLat, userLng], ...allResults.map(r => [r.location.lat, r.location.lng])],
                { padding: [30, 30] }
            );
        }

        hideStatus();
        renderResults(filterResults(allResults));

    } catch (e) {
        console.error(e);
        showStatus("Error al buscar. Comprueba que Firestore tiene datos.", true);
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
    return {
        sport:    document.getElementById("filterSport").value.trim().toLowerCase(),
        material: document.getElementById("filterMaterial").value.trim().toLowerCase(),
        priceMin: parseFloat(document.getElementById("filterPriceMin").value) || null,
        priceMax: parseFloat(document.getElementById("filterPriceMax").value) || null,
    };
}

function filterResults(results) {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const { sport, material, priceMin, priceMax } = getFilterValues();

    const hasFilters = sport || material || priceMin !== null || priceMax !== null;
    document.getElementById("filterActiveDot").style.display = hasFilters ? "inline-block" : "none";

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
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = isError ? "var(--danger,#c0392b)" : "var(--text-muted,#999)";
}
function hideStatus() {
    document.getElementById("statusMsg").style.display = "none";
}

["filterSport", "filterMaterial", "filterPriceMin", "filterPriceMax"].forEach(id => {
    document.getElementById(id).addEventListener("input", () =>
        renderResults(filterResults(allResults)));
});

document.getElementById("filterResetBtn").addEventListener("click", () => {
    document.getElementById("filterSport").value = "";
    document.getElementById("filterMaterial").value = "";
    document.getElementById("filterPriceMin").value = "";
    document.getElementById("filterPriceMax").value = "";
    document.getElementById("filterActiveDot").style.display = "none";
    renderResults(filterResults(allResults));
});

document.getElementById("useLocationBtn").addEventListener("click", getLocation);
document.getElementById("searchLocationBtn").addEventListener("click", getLocation);
document.getElementById("searchSubmitBtn").addEventListener("click", () =>
    renderResults(filterResults(allResults)));
document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") renderResults(filterResults(allResults));
});
document.getElementById("searchInput").addEventListener("input", e => {
    document.getElementById("searchClearBtn").classList.toggle("hidden", e.target.value.length === 0);
});
document.getElementById("searchClearBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("searchClearBtn").classList.add("hidden");
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