
// Ambil data GTFS dari folder gtfs/ untuk bus stop dan shapes
Promise.all([
    fetch('gtfs/stops.txt').then(r => r.text()),
    fetch('gtfs/routes.txt').then(r => r.text()),
    fetch('gtfs/trips.txt').then(r => r.text()),
    fetch('gtfs/stop_times.txt').then(r => r.text()),
    fetch('gtfs/shapes.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/frequencies.txt').then(r => r.ok ? r.text() : ''),
]).then(([stopsTxt, routesTxt, tripsTxt, stopTimesTxt, shapesTxt, frequenciesTxt]) => {
    stops = parseCSV(stopsTxt);
    routes = parseCSV(routesTxt);
    trips = parseCSV(tripsTxt);
    stop_times = parseCSV(stopTimesTxt);
    filteredRoutes = routes;
    // Build stopToRoutes mapping
    stopToRoutes = {};
    stop_times.forEach(st => {
        const trip = trips.find(t => t.trip_id === st.trip_id);
        if (trip) {
            if (!stopToRoutes[st.stop_id]) stopToRoutes[st.stop_id] = new Set();
            stopToRoutes[st.stop_id].add(trip.route_id);
        }
    });
    // Parse shapes
    shapes = [];
    if (shapesTxt) {
        shapes = parseCSV(shapesTxt);
    }
    // Parse frequencies
    frequencies = [];
    if (frequenciesTxt) {
        frequencies = parseCSV(frequenciesTxt);
    }
    initMap();
    renderRoutes();
    setupSearch();
    // setupRouteSearch(); // dikomentari agar tidak error
});

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

// Tambahkan fungsi kosong agar error hilang
function saveUserProgress() {}

// Deklarasi variabel global agar dropdown dan map bisa berjalan
let polylineLayers = [];
let markersLayer = null;
let polylineLayer = null;
let map = null;
let routes = [];
let stops = [];
let trips = [];
let stop_times = [];
let shapes = [];
let filteredRoutes = [];
let selectedRouteId = null;
let stopToRoutes = {};
let frequencies = [];

function initMap() {
    if (!map) {
        map = L.map('map').setView([-6.2, 106.8], 11); // Jakarta default
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
    }
    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    if (polylineLayer) {
        map.removeLayer(polylineLayer);
    }
}

// 1. Restore marker halte (showHalteOnMap) ke versi sederhana tanpa badge layanan lain
function showHalteOnMap(stopsArr, shape_id) {
    initMap();
    if (polylineLayers && polylineLayers.length) {
        polylineLayers.forEach(pl => map.removeLayer(pl));
    }
    polylineLayers = [];
    let latlngs = [];
    let activeRoute = routes.find(r => r.route_id === selectedRouteId);
    let polyColor = (activeRoute && activeRoute.route_color) ? ('#' + activeRoute.route_color) : 'blue';
    let tripsForRoute = trips.filter(t => t.route_id === selectedRouteId);
    let shapeIds = new Set();
    tripsForRoute.forEach(trip => { if (trip.shape_id) shapeIds.add(trip.shape_id); });
    let allLatlngs = [];
    shapeIds.forEach(shape_id => {
        const shapePoints = shapes.filter(s => s.shape_id === shape_id)
            .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
        if (shapePoints.length > 0) {
            const latlngs = shapePoints.map(s => [parseFloat(s.shape_pt_lat), parseFloat(s.shape_pt_lon)]);
            allLatlngs.push(latlngs);
        }
    });
    allLatlngs.forEach(latlngs => {
        const pl = L.polyline(latlngs, {color: polyColor}).addTo(map);
        polylineLayers.push(pl);
    });
    if (allLatlngs.length > 0) {
        let allPoints = allLatlngs.flat();
        map.fitBounds(allPoints, {padding: [30, 30]});
    }
    markersLayer = L.layerGroup();
    stopsArr.forEach(stop => {
        if (stop.stop_lat && stop.stop_lon) {
            const lat = parseFloat(stop.stop_lat);
            const lon = parseFloat(stop.stop_lon);
            let koridorBadges = '';
            if (stopToRoutes[stop.stop_id]) {
                koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                    const route = routes.find(r => r.route_id === rid);
                    if (route) {
                        let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                        let badgeFontSize = '1em';
                        if (route.route_short_name && route.route_short_name.length > 3) badgeFontSize = '0.7em';
                        else if (route.route_short_name && route.route_short_name.length > 2) badgeFontSize = '0.8em';
                        else if (route.route_short_name && route.route_short_name.length > 4) badgeFontSize = '0.7em';
                        return `<span class='badge badge-koridor-interaktif me-1' style='background:${badgeColor};color:#fff;cursor:pointer;font-size:${badgeFontSize}!important;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                    }
                    return '';
                }).join('');
            }
            let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
            let popupContent = `<b class='plus-jakarta-sans'>${stop.stop_name}</b>${layananInfo}`;
            const marker = L.marker([lat, lon]).bindPopup(popupContent);
            markersLayer.addLayer(marker);
            marker.on('popupopen', function() {
                setTimeout(() => {
                    const popupEl = marker.getPopup().getElement();
                    if (!popupEl) return;
                    popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                        badge.onclick = function(e) {
                            e.stopPropagation();
                            const routeId = this.getAttribute('data-routeid');
                            selectedRouteId = routeId;
                            renderRoutes();
                            showStopsByRoute(routeId, routes.find(r => r.route_id === routeId));
                        };
                    });
                }, 50);
            });
        }
    });
    markersLayer.addTo(map);
}

function renderRoutes() {
    const select = document.getElementById('routesDropdown');
    select.innerHTML = '';
    filteredRoutes.forEach(route => {
        const opt = document.createElement('option');
        opt.value = route.route_id;
        opt.textContent = route.route_short_name + ' - ' + route.route_long_name;
        if (route.route_id === selectedRouteId) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = function() {
        const route = routes.find(r => r.route_id === select.value);
        selectedRouteId = select.value;
        const btn = document.getElementById('liveLocationBtn');
        const isLiveActive = btn && btn.getAttribute('data-active') === 'on';
        if (isLiveActive && window.userMarker) {
            const latlng = window.userMarker.getLatLng();
            const tripsForRoute = trips.filter(t => t.route_id === select.value);
            let nearestStop = null;
            let minDist = Infinity;
            tripsForRoute.forEach(trip => {
                const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id);
                stopsForTrip.forEach(st => {
                    const stop = stops.find(s => s.stop_id === st.stop_id);
                    if (stop && stop.stop_lat && stop.stop_lon) {
                        const d = haversine(latlng.lat, latlng.lng, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                        if (d < minDist) {
                            minDist = d;
                            nearestStop = stop;
                        }
                    }
                });
            });
            if (nearestStop) {
                window.selectedRouteIdForUser = select.value;
                window.selectedCurrentStopForUser = nearestStop;
                showUserRouteInfo(latlng.lat, latlng.lng, nearestStop, select.value);
            }
        } else {
            window.selectedRouteIdForUser = null;
            window.selectedCurrentStopForUser = null;
        }
        saveUserProgress();
        renderRoutes();
        showStopsByRoute(select.value, route);
    };
    if (selectedRouteId) {
        const route = routes.find(r => r.route_id === selectedRouteId);
        if (route) showStopsByRoute(selectedRouteId, route);
    } else {
        const ul = document.getElementById('stopsByRoute');
        const title = document.getElementById('stopsTitle');
        const directionTabs = document.getElementById('directionTabs');
        if (ul) ul.innerHTML = '';
        if (title) title.textContent = 'Jalur Trayek';
        if (directionTabs) directionTabs.innerHTML = '';
        if (markersLayer) { map.removeLayer(markersLayer); markersLayer = null; }
        if (polylineLayer) { map.removeLayer(polylineLayer); polylineLayer = null; }
    }
}

function showStopsByRoute(route_id, routeObj, highlightStopId) {
    const ul = document.getElementById('stopsByRoute');
    const title = document.getElementById('stopsTitle');
    const directionTabs = document.getElementById('directionTabs');
    ul.innerHTML = '';
    directionTabs.innerHTML = '';
    if (routeObj) {
        let badgeText = routeObj.route_short_name || routeObj.route_id || '';
        let badgeColor = routeObj.route_color ? ('#' + routeObj.route_color) : '#264697';
        let badgeFontSize = '1em';
        if (badgeText.length > 3) badgeFontSize = '0.5em';
        else if (badgeText.length > 2) badgeFontSize = '0.8em';
        let badge = `<span class='badge me-2' style='font-size:${badgeFontSize};width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:${badgeColor};color:#fff;'>${badgeText}</span>`;
        let subjudul = routeObj.route_long_name ? `<span class='fw-bold' style='font-size:1.2em;'>${routeObj.route_long_name}</span>` : '';
        title.innerHTML = `${badge}${subjudul}`;
        title.className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
        title.style.color = '#264697';
    } else {
        title.textContent = 'Jalur Trayek';
        title.className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
        title.style.color = '#264697';
    }
    const tripsForRoute = trips.filter(t => t.route_id === route_id);
    if (tripsForRoute.length === 0) {
        ul.innerHTML = '<li class="list-group-item">Data trip tidak ditemukan</li>';
        return;
    }
    let halteMap = new Map();
    tripsForRoute.forEach(trip => {
        const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id)
            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        stopsForTrip.forEach(st => {
            const stop = stops.find(s => s.stop_id === st.stop_id);
            if (stop) {
                const normName = stop.stop_name.trim().toLowerCase();
                const lat = parseFloat(stop.stop_lat).toFixed(5);
                const lon = parseFloat(stop.stop_lon).toFixed(5);
                const key = `${normName}|${lat}|${lon}`;
                if (!halteMap.has(key)) {
                    halteMap.set(key, {...stop, koridors: new Set()});
                }
                halteMap.get(key).koridors.add(trip.route_id);
            }
        });
    });
    let allStops = Array.from(halteMap.values());
    ul.innerHTML = '';
    allStops.forEach((stop, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex flex-column align-items-start gap-1 py-3';
        const halteName = document.createElement('span');
        halteName.className = 'fw-bold';
        halteName.textContent = stop.stop_name;
        li.appendChild(halteName);
        if (stopToRoutes[stop.stop_id]) {
            const badgesDiv = document.createElement('div');
            Array.from(stopToRoutes[stop.stop_id]).forEach(rid => {
                if (rid !== selectedRouteId) {
                    const route = routes.find(r => r.route_id === rid);
                    if (route) {
                        let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                        const badge = document.createElement('span');
                        badge.className = 'badge badge-koridor-interaktif me-1';
                        badge.style.background = badgeColor;
                        badge.style.color = '#fff';
                        badge.style.cursor = 'pointer';
                        badge.style.fontSize = route.route_short_name && route.route_short_name.length > 3 ? '0.5em' : '1em';
                        badge.style.width = '32px';
                        badge.style.height = '32px';
                        badge.style.display = 'inline-flex';
                        badge.style.alignItems = 'center';
                        badge.style.justifyContent = 'center';
                        badge.style.borderRadius = '50%';
                        badge.style.marginRight = '10px';
                        badge.style.marginBottom = '4px';
                        badge.textContent = route.route_short_name;
                        badge.title = route.route_long_name;
                        badge.onclick = (e) => {
                            e.stopPropagation();
                            selectedRouteId = route.route_id;
                            saveUserProgress();
                            renderRoutes();
                            showStopsByRoute(route.route_id, route);
                        };
                        badgesDiv.appendChild(badge);
                    }
                }
            });
            li.appendChild(badgesDiv);
        }
        li.onclick = function() {
            window.lastStopId = stop.stop_id;
            saveUserProgress();
        };
        if (highlightStopId && stop.stop_id === highlightStopId) {
            li.classList.add('bg-warning');
            setTimeout(() => { li.scrollIntoView({behavior:'smooth', block:'center'}); }, 200);
        }
        ul.appendChild(li);
    });
    if (allStops.some(s => s.stop_lat && s.stop_lon)) {
        showHalteOnMap(allStops, tripsForRoute[0] && tripsForRoute[0].shape_id);
    }
}

function setupSearch() {
    const input = document.getElementById('searchStop');
    const resultsDiv = document.getElementById('searchResults');
    input.addEventListener('input', function() {
        const q = input.value.trim().toLowerCase();
        resultsDiv.innerHTML = '';
        if (q.length < 1) return;
        if (q.length === 1 && !isNaN(q)) {
            const foundKoridor = routes.filter(r =>
                r.route_short_name && r.route_short_name.toLowerCase() === q
            );
            const ul = document.createElement('ul');
            ul.className = 'list-group mt-3 mb-3';
            ul.style.maxHeight = '250px';
            ul.style.overflowY = 'auto';
            if (foundKoridor.length > 0) {
                const layananHeader = document.createElement('li');
                layananHeader.className = 'list-group-item fw-bold bg-light';
                layananHeader.textContent = 'Layanan';
                ul.appendChild(layananHeader);
                foundKoridor.forEach(route => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex align-items-center';
                    let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                    let badgeFontSize = '1em';
                    if (badgeColor.length > 3) badgeFontSize = '0.5em';
                    else if (badgeColor.length > 2) badgeFontSize = '0.8em';
                    li.innerHTML = `<span class='badge me-2' style='background:${badgeColor};color:#fff;font-size:${badgeFontSize};'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
                    li.style.cursor = 'pointer';
                    li.onclick = function() {
                        selectedRouteId = route.route_id;
                        renderRoutes();
                        showStopsByRoute(route.route_id, route);
                        resultsDiv.innerHTML = '';
                        input.value = '';
                    };
                    ul.appendChild(li);
                });
            }
            resultsDiv.appendChild(ul);
            return;
        }
        if (q.length < 2) return;
        const foundHalte = stops.filter(s => s.stop_name.toLowerCase().includes(q));
        const foundKoridor = routes.filter(r =>
            (r.route_short_name && r.route_short_name.toLowerCase().includes(q)) ||
            (r.route_long_name && r.route_long_name.toLowerCase().includes(q))
        );
        const ul = document.createElement('ul');
        ul.className = 'list-group mt-3 mb-3';
        ul.style.maxHeight = '250px';
        ul.style.overflowY = 'auto';
        if (foundKoridor.length > 0) {
            const layananHeader = document.createElement('li');
            layananHeader.className = 'list-group-item fw-bold bg-light';
            layananHeader.textContent = 'Layanan';
            ul.appendChild(layananHeader);
            foundKoridor.forEach(route => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex align-items-center';
                let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                let badgeFontSize = '1em';
                if (badgeColor.length > 3) badgeFontSize = '0.5em';
                else if (badgeColor.length > 2) badgeFontSize = '0.8em';
                li.innerHTML = `<span class='badge me-2' style='background:${badgeColor};color:#fff;font-size:${badgeFontSize};'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
                li.style.cursor = 'pointer';
                li.onclick = function() {
                    selectedRouteId = route.route_id;
                    renderRoutes();
                    showStopsByRoute(route.route_id, route);
                    resultsDiv.innerHTML = '';
                    input.value = '';
                };
                ul.appendChild(li);
            });
        }
        if (foundHalte.length > 0) {
            const halteHeader = document.createElement('li');
            halteHeader.className = 'list-group-item fw-bold bg-light text-primary';
            halteHeader.textContent = 'Halte';
            ul.appendChild(halteHeader);
            let halteMapSearch = new Map();
            foundHalte.forEach(stop => {
                const normName = stop.stop_name.trim().toLowerCase();
                const lat = parseFloat(stop.stop_lat).toFixed(5);
                const lon = parseFloat(stop.stop_lon).toFixed(5);
                const key = `${normName}|${lat}|${lon}`;
                if (!halteMapSearch.has(key)) {
                    halteMapSearch.set(key, {...stop, koridors: new Set()});
                }
                if (stopToRoutes[stop.stop_id]) {
                    Array.from(stopToRoutes[stop.stop_id]).forEach(rid => halteMapSearch.get(key).koridors.add(rid));
                }
            });
            let uniqueHalte = Array.from(halteMapSearch.values());
            uniqueHalte.forEach(stop => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `<div>${stop.stop_name} (${stop.stop_id})</div>`;
                if (stopToRoutes[stop.stop_id]) {
                    const badges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            let badgeFontSize = '1em';
                            if (badgeColor.length > 3) badgeFontSize = '0.5em';
                            else if (badgeColor.length > 2) badgeFontSize = '0.8em';
                            return `<span class='badge me-1' style='background:${badgeColor};color:#fff;font-size:${badgeFontSize};'>${route.route_short_name}</span>`;
                        }
                        return '';
                    }).join('');
                    li.innerHTML += `<div class='mt-1'>${badges}</div>`;
                }
                li.onclick = function() {
                    if (stop.stop_lat && stop.stop_lon) {
                        map.setView([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], 17);
                    }
                    resultsDiv.innerHTML = '';
                };
                ul.appendChild(li);
            });
        }
        resultsDiv.appendChild(ul);
    });
}

// Hapus semua log debug dari showHalteOnMap dan showStopsByRoute
// Tambahkan fitur deteksi lokasi user

// Helper: hitung jarak dua koordinat (Haversine)
function haversine(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371e3; // meter
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

let nearestStopMarker = null;
let userToStopLine = null;

function findNearestStop(userLat, userLon) {
    let minDist = Infinity;
    let nearest = null;
    stops.forEach(stop => {
        if (stop.stop_lat && stop.stop_lon) {
            const dist = haversine(userLat, userLon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
            if (dist < minDist) {
                minDist = dist;
                nearest = stop;
            }
        }
    });
    return { stop: nearest, distance: minDist };
}

// Simpan pilihan layanan user (routeId) jika sudah memilih
window.selectedRouteIdForUser = null;
window.selectedCurrentStopForUser = null;

function showNearestStopFromUser(userLat, userLon) {
    if (!map) return;
    if (nearestStopMarker) { map.removeLayer(nearestStopMarker); nearestStopMarker = null; }
    if (userToStopLine) { map.removeLayer(userToStopLine); userToStopLine = null; }
    const { stop, distance } = findNearestStop(userLat, userLon);
    if (!stop) {
        return;
    }
    const stopLat = parseFloat(stop.stop_lat);
    const stopLon = parseFloat(stop.stop_lon);
    // Ambil layanan (koridor) yang lewat di halte ini
    let koridorBadges = '';
    if (stopToRoutes[stop.stop_id]) {
        koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
            const route = routes.find(r => r.route_id === rid);
            if (route) {
                let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                return `<span class='badge badge-koridor-interaktif me-1' style='background:${badgeColor};color:#fff;cursor:pointer;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
            }
            return '';
        }).join('');
    }
    let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
    let popupContent = `<b class='plus-jakarta-sans'>${stop.stop_name}</b><br><span class='plus-jakarta-sans'>Jarak: ${distance < 1000 ? Math.round(distance) + ' m' : (distance/1000).toFixed(2) + ' km'}</span>${layananInfo}`;
    nearestStopMarker = L.marker([stopLat, stopLon], {
        icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png', // biru
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(map).bindPopup(popupContent).openPopup();
    // Pada showNearestStopFromUser, simpan stopData di marker
    nearestStopMarker.stopData = stop;
    // Coba fetch rute jalan kaki dari OSRM
    fetch(`https://router.project-osrm.org/route/v1/foot/${userLon},${userLat};${stopLon},${stopLat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (userToStopLine) { map.removeLayer(userToStopLine); userToStopLine = null; }
            if (data.routes && data.routes[0] && data.routes[0].geometry) {
                const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                userToStopLine = L.polyline(coords, {color: '#0074D9', weight: 4, dashArray: '6, 8'}).addTo(map);
            } else {
                userToStopLine = L.polyline(
                    [[userLat, userLon], [stopLat, stopLon]],
                    {color: '#0074D9', weight: 4, dashArray: '6, 8'}
                ).addTo(map);
            }
        })
        .catch(() => {
            userToStopLine = L.polyline(
                [[userLat, userLon], [stopLat, stopLon]],
                {color: '#0074D9', weight: 4, dashArray: '6, 8'}
            ).addTo(map);
        });
    // Event listener untuk badge layanan
    setTimeout(() => {
        document.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
            badge.onclick = function(e) {
                e.stopPropagation();
                const routeId = this.getAttribute('data-routeid');
                window.selectedRouteIdForUser = routeId;
                window.selectedCurrentStopForUser = stop;
                showUserRouteInfo(userLat, userLon, stop, routeId);
                // Tampilkan jalur trayek dan halte untuk layanan ini
                const route = routes.find(r => r.route_id === routeId);
                if (route) {
                    selectedRouteId = routeId;
                    renderRoutes();
                    showStopsByRoute(routeId, route);
                }
            };
        });
    }, 100);
}

// Fungsi untuk menampilkan info di marker user setelah memilih layanan
function showUserRouteInfo(userLat, userLon, currentStop, routeId) {
    // Cari trip yang sesuai dengan routeId dan halte ini
    const tripsForRoute = trips.filter(t => t.route_id === routeId);
    let nextStop = null;
    let minSeq = Infinity;
    let tripUsed = null;
    let stopTimes = [];
    // Cari trip yang lewat halte ini dan halte berikutnya
    for (const trip of tripsForRoute) {
        const stTimes = stop_times.filter(st => st.trip_id === trip.trip_id)
            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        const idx = stTimes.findIndex(st => st.stop_id === currentStop.stop_id);
        if (idx !== -1 && idx < stTimes.length - 1) {
            const nextSt = stTimes[idx + 1];
            if (parseInt(nextSt.stop_sequence) < minSeq) {
                minSeq = parseInt(nextSt.stop_sequence);
                nextStop = stops.find(s => s.stop_id === nextSt.stop_id);
                tripUsed = trip;
                stopTimes = stTimes;
            }
        }
    }
    // Deteksi halte-halte berikutnya berdasarkan posisi user di shape
    let upcomingHaltes = [];
    let userOnShape = false;
    let userShapeIdx = 0;
    let shapePoints = [];
    if (tripUsed && tripUsed.shape_id) {
        shapePoints = shapes.filter(s => s.shape_id === tripUsed.shape_id)
            .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
        let minShapeDist = Infinity;
        userShapeIdx = 0;
        shapePoints.forEach((pt, idx) => {
            const d = haversine(userLat, userLon, parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon));
            if (d < minShapeDist) {
                minShapeDist = d;
                userShapeIdx = idx;
            }
        });
        userOnShape = minShapeDist < 50;
        const halteIdxs = stopTimes.map(st => {
            let halteShapeIdx = 0;
            let halteMinDist = Infinity;
            shapePoints.forEach((pt, idx) => {
                const d = haversine(parseFloat(st.stop_lat), parseFloat(st.stop_lon), parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon));
                if (d < halteMinDist) {
                    halteMinDist = d;
                    halteShapeIdx = idx;
                }
            });
            return {st, halteShapeIdx};
        });
        upcomingHaltes = halteIdxs.filter(h => h.halteShapeIdx > userShapeIdx).map(h => stops.find(s => s.stop_id === h.st.stop_id));
    }
    let nextStopInfo = nextStop ? `<b>Halte Selanjutnya:</b> ${nextStop.stop_name}` : 'Tidak ada halte berikutnya.';
    let jarakNext = nextStop ? haversine(userLat, userLon, parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon)) : null;
    let jarakInfo = nextStop ? `<br><b>Jarak ke Halte Selanjutnya:</b> ${jarakNext < 1000 ? Math.round(jarakNext) + ' m' : (jarakNext/1000).toFixed(2) + ' km'}` : '';
    // Notifikasi tiba di halte berikutnya (hanya sekali per halte)
    let arrivalMsg = '';
    if (nextStop && jarakNext !== null && jarakNext < 30) {
        if (window.lastArrivedStopId !== nextStop.stop_id) {
            arrivalMsg = `<div style='color:green;font-weight:bold;'>Anda sudah tiba di <u>${nextStop.stop_name}</u>!</div>`;
            window.lastArrivedStopId = nextStop.stop_id;
        }
    } else if (nextStop && jarakNext !== null && jarakNext >= 30) {
        // Reset agar bisa notifikasi lagi untuk halte berikutnya
        if (window.lastArrivedStopId === nextStop.stop_id) {
            window.lastArrivedStopId = null;
        }
    }
    // Kecepatan real time di sepanjang shape
    let speed = null;
    if (userOnShape && window.lastShapeIdx !== undefined && window.lastShapeTime !== undefined && window.lastShapeIdx !== null) {
        const dt = (Date.now() - window.lastShapeTime) / 1000; // detik
        let d = 0;
        if (userShapeIdx > window.lastShapeIdx) {
            for (let i = window.lastShapeIdx; i < userShapeIdx; i++) {
                const pt1 = shapePoints[i];
                const pt2 = shapePoints[i+1];
                d += haversine(parseFloat(pt1.shape_pt_lat), parseFloat(pt1.shape_pt_lon), parseFloat(pt2.shape_pt_lat), parseFloat(pt2.shape_pt_lon));
            }
        } else if (userShapeIdx < window.lastShapeIdx) {
            for (let i = window.lastShapeIdx; i > userShapeIdx; i--) {
                const pt1 = shapePoints[i];
                const pt2 = shapePoints[i-1];
                d += haversine(parseFloat(pt1.shape_pt_lat), parseFloat(pt1.shape_pt_lon), parseFloat(pt2.shape_pt_lat), parseFloat(pt2.shape_pt_lon));
            }
        }
        if (dt > 0 && d > 0) speed = d / dt;
    }
    if (userOnShape) {
        window.lastShapeIdx = userShapeIdx;
        window.lastShapeTime = Date.now();
    } else {
        window.lastShapeIdx = null;
        window.lastShapeTime = null;
    }
    let speedInfo = (userOnShape && speed) ? `<br><b>Kecepatan di Jalur:</b> ${(speed * 3.6).toFixed(2)} km/jam` : '';
    let upcomingInfo = '';
    if (upcomingHaltes.length > 0) {
        upcomingInfo = `<br><b>Halte Berikutnya:</b><ul style='margin-bottom:0'>` + upcomingHaltes.map(h => `<li>${h.stop_name}</li>`).join('') + '</ul>';
    }
    if (window.userMarker) {
        window.userMarker.bindPopup(`${arrivalMsg}<b>Info Layanan ${routeId}</b><br>${nextStopInfo}${jarakInfo}${speedInfo}${upcomingInfo}`).openPopup();
    }
}

// Patch: update info marker user setiap update posisi jika sudah pilih layanan
// Ganti patching: deklarasikan enableLiveLocation sebagai function agar hoisted
function enableLiveLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung di browser ini.');
        return;
    }
    if (window.geoWatchId) navigator.geolocation.clearWatch(window.geoWatchId);
    window.geoWatchId = navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            if (!map) return;
            if (window.userMarker) {
                window.userMarker.setLatLng([lat, lon]);
            } else {
                window.userMarker = L.marker([lat, lon], {
                    icon: L.icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                        popupAnchor: [1, -34]
                    })
                }).addTo(map);
            }
            if (!window.userCentered) {
                map.setView([lat, lon], 16);
                window.userCentered = true;
            }
            // Update popup halte terdekat jika ada
            if (window.nearestStopMarker && window.nearestStopMarker._popup && window.nearestStopMarker.stopData) {
                const stop = window.nearestStopMarker.stopData;
                const distance = haversine(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                let koridorBadges = '';
                if (stopToRoutes[stop.stop_id]) {
                    koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            let badgeFontSize = '1em';
                            if (route.route_short_name && route.route_short_name.length > 3) badgeFontSize = '0.5em';
                            else if (route.route_short_name && route.route_short_name.length > 2) badgeFontSize = '0.6em';
                            return `<span class='badge badge-koridor-interaktif me-1' style='background:${badgeColor};color:#fff;cursor:pointer;font-size:${badgeFontSize}!important;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                        }
                        return '';
                    }).join('');
                }
                let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
                let popupContent = `<b class='plus-jakarta-sans'>${stop.stop_name}</b><br><span class='plus-jakarta-sans'>Jarak: ${distance < 1000 ? Math.round(distance) + ' m' : (distance/1000).toFixed(2) + ' km'}</span>${layananInfo}`;
                window.nearestStopMarker.setPopupContent(popupContent);
            }
            if (window.userMarker) {
                window.userMarker.bindPopup('Posisi Anda');
            }
            if (window.selectedRouteIdForUser && window.selectedCurrentStopForUser) {
                // Deteksi jika user sudah berada di halte (jarak < 30m), update ke halte berikutnya
                const tripsForRoute = trips.filter(t => t.route_id === window.selectedRouteIdForUser);
                let stopTimes = [];
                let tripUsed = null;
                for (const trip of tripsForRoute) {
                    const stTimes = stop_times.filter(st => st.trip_id === trip.trip_id)
                        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
                    const idx = stTimes.findIndex(st => st.stop_id === window.selectedCurrentStopForUser.stop_id);
                    if (idx !== -1 && idx < stTimes.length - 1) {
                        stopTimes = stTimes;
                        tripUsed = trip;
                        break;
                    }
                }
                if (tripUsed && stopTimes.length > 0) {
                    const idx = stopTimes.findIndex(st => st.stop_id === window.selectedCurrentStopForUser.stop_id);
                    const nextSt = stopTimes[idx + 1];
                    const nextStop = stops.find(s => s.stop_id === nextSt.stop_id);
                    if (nextStop) {
                        const distToNext = haversine(lat, lon, parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon));
                        if (distToNext < 30) {
                            window.selectedCurrentStopForUser = nextStop;
                        }
                    }
                }
                showUserRouteInfo(lat, lon, window.selectedCurrentStopForUser, window.selectedRouteIdForUser);
            }
        },
        err => {
            alert('Gagal mendapatkan lokasi: ' + err.message);
            setLiveBtnState(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
}

function disableLiveLocation() {
    if (window.geoWatchId) {
        navigator.geolocation.clearWatch(window.geoWatchId);
        window.geoWatchId = null;
    }
    if (window.userMarker) {
        map.removeLayer(window.userMarker);
        window.userMarker = null;
    }
    window.userCentered = false;
}

// 2. Tambahkan tombol 'Halte Terdekat' hanya saat live location aktif
function setLiveBtnState(active) {
    const btn = document.getElementById('liveLocationBtn');
    let nearestBtn = document.getElementById('nearestStopsBtn');
    if (active) {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary');
        btn.setAttribute('data-active', 'on');
        btn.innerHTML = '<span id="liveLocationIcon" class="bi bi-geo-alt-fill"></span> Live Location: ON';
        // Tampilkan tombol halte terdekat
        if (!nearestBtn) {
            nearestBtn = document.createElement('button');
            nearestBtn.id = 'nearestStopsBtn';
            nearestBtn.className = 'btn btn-outline-success rounded-5 ms-2';
            nearestBtn.innerHTML = 'Halte Terdekat';
            btn.parentNode.insertBefore(nearestBtn, btn.nextSibling);
        }
        nearestBtn.style.display = '';
    } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
        btn.setAttribute('data-active', 'off');
        btn.innerHTML = '<span id="liveLocationIcon" class="bi bi-geo-alt"></span> Live Location: OFF';
        // Sembunyikan tombol halte terdekat
        if (nearestBtn) nearestBtn.style.display = 'none';
    }
}

// 3. Logika tombol halte terdekat: tampilkan max 2 halte terdekat dari posisi user
let nearestStopsMarkers = [];
function showMultipleNearestStops(userLat, userLon, maxStops = 2) {
    // Hapus marker halte terdekat sebelumnya
    nearestStopsMarkers.forEach(m => map.removeLayer(m));
    nearestStopsMarkers = [];
    // Urutkan halte terdekat
    const sortedStops = stops
        .filter(s => s.stop_lat && s.stop_lon)
        .map(s => ({...s, dist: haversine(userLat, userLon, parseFloat(s.stop_lat), parseFloat(s.stop_lon))}))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, maxStops);
    sortedStops.forEach(stop => {
        const lat = parseFloat(stop.stop_lat);
        const lon = parseFloat(stop.stop_lon);
        // Badge layanan lain di popup marker halte terdekat
        let koridorBadges = '';
        if (stopToRoutes[stop.stop_id]) {
            koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                const route = routes.find(r => r.route_id === rid);
                if (route) {
                    let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                    return `<span class='badge badge-koridor-interaktif me-1' style='background:${badgeColor};color:#fff;cursor:pointer;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                }
                return '';
            }).join('');
        }
        let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
        let popupContent = `<b class='plus-jakarta-sans'>${stop.stop_name}</b><br><span class='plus-jakarta-sans'>Jarak: ${stop.dist < 1000 ? Math.round(stop.dist) + ' m' : (stop.dist/1000).toFixed(2) + ' km'}</span>${layananInfo}`;
        const marker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        }).addTo(map).bindPopup(popupContent);
        marker.on('popupopen', function() {
            setTimeout(() => {
                const popupEl = marker.getPopup().getElement();
                if (!popupEl) return;
                popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                    badge.onclick = function(e) {
                        e.stopPropagation();
                        const routeId = this.getAttribute('data-routeid');
                        window.selectedRouteIdForUser = routeId;
                        window.selectedCurrentStopForUser = stop;
                        showUserRouteInfo(userLat, userLon, stop, routeId);
                        selectedRouteId = routeId;
                        renderRoutes();
                        showStopsByRoute(routeId, routes.find(r => r.route_id === routeId));
                    };
                });
            }, 50);
        });
        nearestStopsMarkers.push(marker);
    });
}

// 4. Event tombol halte terdekat
window.addEventListener('DOMContentLoaded', function() {
    setLiveBtnState(false);
    const btn = document.getElementById('liveLocationBtn');
    btn.addEventListener('click', function() {
        const isActive = btn.getAttribute('data-active') === 'on';
        if (!isActive) {
            setLiveBtnState(true);
            enableLiveLocation();
        } else {
            setLiveBtnState(false);
            disableLiveLocation();
            nearestStopsMarkers.forEach(m => map.removeLayer(m));
            nearestStopsMarkers = [];
        }
    });
    // Event tombol halte terdekat
    document.body.addEventListener('click', function(e) {
        const nearestBtn = document.getElementById('nearestStopsBtn');
        if (nearestBtn && e.target === nearestBtn) {
            if (window.userMarker) {
                const latlng = window.userMarker.getLatLng();
                showMultipleNearestStops(latlng.lat, latlng.lng, 2);
            } else {
                alert('Aktifkan live location terlebih dahulu!');
            }
        }
    });
    // Event tombol reset koridor
    const resetBtn = document.getElementById('resetRouteBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            selectedRouteId = null;
            window.selectedRouteIdForUser = null;
            window.selectedCurrentStopForUser = null;
            // Hapus marker halte terdekat, marker simulasi, dan polylineLayers (jalur trayek)
            if (window.nearestStopMarker) { map.removeLayer(window.nearestStopMarker); window.nearestStopMarker = null; }
            if (window.userToStopLine) { map.removeLayer(window.userToStopLine); window.userToStopLine = null; }
            nearestStopsMarkers.forEach(m => map.removeLayer(m));
            nearestStopsMarkers = [];
            if (polylineLayers && polylineLayers.length) {
                polylineLayers.forEach(pl => map.removeLayer(pl));
                polylineLayers = [];
            }
            renderRoutes();
            // Jika live location tidak aktif, reset view ke Jakarta dan hapus userMarker
            const btn = document.getElementById('liveLocationBtn');
            const isLiveActive = btn && btn.getAttribute('data-active') === 'on';
            if (!isLiveActive) {
                if (window.userMarker) { map.removeLayer(window.userMarker); window.userMarker = null; }
                map.setView([-6.2, 106.8], 11);
            } else {
                // Jika live location aktif, info marker user kembali ke 'Posisi Anda'
                if (window.userMarker) window.userMarker.bindPopup('Posisi Anda');
            }
        });
    }
});
