// Helper: Parse CSV
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

let stops = [], routes = [], trips = [], stop_times = [];
let filteredRoutes = [];
let selectedRouteId = null;

// Tambahan: mapping stop_id ke set of route_id
let stopToRoutes = {};

let shapes = [];

let map, markersLayer, polylineLayer;

let nearestStopCircle = null;
let nearestStopPopup = null;
let userCentered = false;
let userMarker = null;
let geoWatchId = null;
let frequencies = [];
let liveBusMarkers = [];
let liveBusInterval = null;

// Tambahkan variabel global untuk marker bus simulasi
let simulatedBusMarkers = [];
let simulatedBusInterval = null;

// Tambahkan variabel global untuk tracking popup bus yang terbuka dan marker bus
let currentOpenPopupBusKey = null;
let busMarkerMap = {};

// Tambahkan variabel global untuk status user
let prevUserLat = null, prevUserLon = null, prevUserTime = null, userSpeed = 0;
// Hapus seluruh kode terkait userStatusPanel (panel status user mengambang)
// 1. Hapus pembuatan dan update elemen userStatusPanel
// 2. Hapus seluruh pemanggilan userStatusPanel.style.display, document.getElementById('userNextStop'), dst, yang terkait panel
// 3. Pastikan info status user hanya diambil dan ditampilkan pada popup marker user (userMarker)
// 4. Hapus panel dari DOM jika ada

// Deklarasi global di atas:
let polylineLayers = [];

// Tambahkan variabel global untuk polyline highlight bus
let busHighlightPolyline = null;

let userToNextStopLine = null;
let userNextStopCircle = null;
let minAngleDiff = null;

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

function showHalteOnMap(stopsArr, shape_id) {
    initMap();
    // Hapus semua polyline lama
    if (polylineLayers && polylineLayers.length) {
        polylineLayers.forEach(pl => map.removeLayer(pl));
    }
    polylineLayers = [];
    let latlngs = [];
    let useShape = false;
    // Ambil warna rute aktif
    let activeRoute = routes.find(r => r.route_id === selectedRouteId);
    let polyColor = (activeRoute && activeRoute.route_color) ? ('#' + activeRoute.route_color) : 'blue';
    // Render semua polyline dari semua shape_id unik di tripsForRoute
    let tripsForRoute = trips.filter(t => t.route_id === selectedRouteId);
    let shapeIds = new Set();
    tripsForRoute.forEach(trip => {
        if (trip.shape_id) shapeIds.add(trip.shape_id);
    });
    let allLatlngs = [];
    shapeIds.forEach(shape_id => {
        const shapePoints = shapes.filter(s => s.shape_id === shape_id)
            .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
        if (shapePoints.length > 0) {
            const latlngs = shapePoints.map(s => [parseFloat(s.shape_pt_lat), parseFloat(s.shape_pt_lon)]);
            allLatlngs.push(latlngs);
        }
    });
    // Render semua polyline
    allLatlngs.forEach(latlngs => {
        const pl = L.polyline(latlngs, {color: polyColor}).addTo(map);
        polylineLayers.push(pl);
    });
    // Setelah render polyline, auto-fit map ke koridor
    if (allLatlngs.length > 0) {
        let allPoints = allLatlngs.flat();
        map.fitBounds(allPoints, {padding: [30, 30]});
    }
    markersLayer = L.layerGroup();
    // Hitung jumlah kemunculan nama halte
    const halteNameCount = {};
    stopsArr.forEach(stop => {
        halteNameCount[stop.stop_name] = (halteNameCount[stop.stop_name] || 0) + 1;
    });
    let halteNameIndex = {};
    stopsArr.forEach(stop => {
        if (stop.stop_lat && stop.stop_lon) {
            halteNameIndex[stop.stop_name] = (halteNameIndex[stop.stop_name] || 0) + 1;
            let displayName = stop.stop_name;
            if (halteNameCount[stop.stop_name] > 1) {
                displayName += ` (${halteNameIndex[stop.stop_name]})`;
            }
            const lat = parseFloat(stop.stop_lat);
            const lon = parseFloat(stop.stop_lon);
            // Info layanan di popup
            let layanan = '';
            if (stopToRoutes[stop.stop_id]) {
                layanan = Array.from(stopToRoutes[stop.stop_id])
                    .map(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        let badgeColor = (route && route.route_color) ? ('#' + route.route_color) : '#6c757d';
                        // Badge koridor lain di popup, bisa diklik
                        if (route && route.route_id !== selectedRouteId) {
                            return `<span class='badge koridor-badge-popup' data-routeid='${route.route_id}' style='background:${badgeColor};color:#fff;cursor:pointer;margin-right:2px;'>${route.route_short_name}</span>`;
                        } else if (route) {
                            return `<span class='badge' style='background:${badgeColor};color:#fff;margin-right:2px;'>${route.route_short_name}</span>`;
                        }
                        return '';
                    })
                    .join('');
            }
            const arahBadgePopup = extractArahFromStopName(stop.stop_name);
            let popupContent = `<b>${displayName.replace(/ Arah (Selatan|Utara)/i, '')}</b>${arahBadgePopup ? " <span style=\"background:#0dcaf0;color:#000;padding:2px 6px;border-radius:4px;font-size:12px;\">" + arahBadgePopup + "</span>" : ''}`;
            // Info bus yang akan tiba di halte ini
            if (typeof halteToArrivingBuses !== 'undefined' && halteToArrivingBuses[stop.stop_id] && halteToArrivingBuses[stop.stop_id].length > 0) {
                popupContent += `<br><span class='text-muted small'>Bus menuju halte ini: ${halteToArrivingBuses[stop.stop_id]
                    .map(obj => {
                        let etaStr = obj.eta > 60 ? `${Math.floor(obj.eta/60)}m ${obj.eta%60}s` : `${obj.eta}s`;
                        return `<span class='badge bg-primary ms-1 badge-bus-link' data-buskey='${obj.busKey || ''}' style='cursor:pointer;'>${obj.busNumber} (${etaStr})</span>`;
                    })
                    .join(' ')}</span>`;
            }
            if (layanan) popupContent += `<hr>Layanan:<br>${layanan}`;
            const marker = L.marker([lat, lon]).bindPopup(popupContent);
            markersLayer.addLayer(marker);
            // Event: badge koridor lain di popup bisa diklik
            marker.on('popupopen', function(e) {
                const popupEl = marker.getPopup().getElement();
                if (popupEl) {
                    popupEl.querySelectorAll('.koridor-badge-popup').forEach(badge => {
                        badge.onclick = function(ev) {
                            ev.stopPropagation();
                            const rid = badge.getAttribute('data-routeid');
                            if (rid) {
                                selectedRouteId = rid;
                                renderRoutes();
                                showStopsByRoute(rid, routes.find(r => r.route_id === rid));
                                marker.closePopup();
                            }
                        };
                    });
                }
            });
        }
    });
    markersLayer.addTo(map); // <-- PENTING: pastikan ini selalu dipanggil!
    if (latlngs.length > 0) {
        polylineLayer = L.polyline(latlngs, {color: polyColor});
        markersLayer.addTo(map);
        polylineLayer.addTo(map);
        map.fitBounds(polylineLayer.getBounds(), {padding: [30, 30]});
    }
}

function enableLiveLocation(stopsArr) {
    if (!navigator.geolocation) return;
    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
    userCentered = false;
    geoWatchId = navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            if (!map) return;
            if (userMarker) {
                userMarker.setLatLng([lat, lon]);
            } else {
                userMarker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        className: 'user-location-icon',
                        html: '<iconify-icon inline icon="mdi:location" width="32" height="32" style="color:#1976d2"></iconify-icon>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    })
                }).addTo(map).bindPopup('Posisi Anda');
            }
            // Zoom ke user hanya sekali
            if (!userCentered) {
                map.setView([lat, lon], 16);
                userCentered = true;
            }
            // Cari halte terdekat
            let minDist = Infinity;
            let nearestStop = null;
            stopsArr.forEach(stop => {
                if (stop.stop_lat && stop.stop_lon) {
                    const d = getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                    if (d < minDist) {
                        minDist = d;
                        nearestStop = stop;
                    }
                }
            });
            
            // Highlight halte terdekat
            if (nearestStop) {
                if (nearestStopCircle) map.removeLayer(nearestStopCircle);
                nearestStopCircle = L.circle([parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)], {
                    color: 'red', fillColor: '#f03', fillOpacity: 0.3, radius: 60
                }).addTo(map);
                // Popup info halte terdekat
                if (nearestStopPopup) map.closePopup(nearestStopPopup);
                let layanan = '';
                if (stopToRoutes[nearestStop.stop_id]) {
                    layanan = Array.from(stopToRoutes[nearestStop.stop_id])
                        .map(rid => {
                            const route = routes.find(r => r.route_id === rid);
                            return route ? `<div><b>${route.route_short_name}</b> - ${route.route_long_name}</div>` : '';
                        })
                        .join('');
                }
                const arahBadgePopup = extractArahFromStopName(nearestStop.stop_name);
                const popupContent = `<b>Halte Terdekat:</b><br>${nearestStop.stop_name.replace(/ Arah (Selatan|Utara)/i, '')}<br>Jarak: ${minDist.toFixed(0)} m${layanan ? '<hr>Layanan:<br>' + layanan : ''}`;
                nearestStopPopup = L.popup({autoClose: false, closeOnClick: false})
                    .setLatLng([parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)])
                    .setContent(popupContent)
                    .openOn(map);
            }
        },
        err => {},
        {enableHighAccuracy: true, maximumAge: 10000, timeout: 20000}
    );
}

function getDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula (meter)
    const R = 6371000;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
}

// Helper untuk ekstrak arah dari nama halte
function extractArahFromStopName(stopName) {
    if (!stopName) return null;
    const arah = stopName.match(/Arah (Selatan|Utara)/i);
    return arah ? arah[0] : null;
}

function getShapeIndicesForStops(shapePoints, halteCoords) {
    // Untuk setiap halte, cari index titik shapes terdekat
    return halteCoords.map(([lat, lon]) => {
        let minDist = Infinity, idx = 0;
        shapePoints.forEach((pt, i) => {
            const d = getDistance(lat, lon, parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon));
            if (d < minDist) { minDist = d; idx = i; }
        });
        return idx;
    });
}

function interpolateOnPolyline(polyline, progress) {
    // progress: 0..1, polyline: array of [lat,lon]
    if (polyline.length < 2) return polyline[0];
    // Hitung total length
    let total = 0, segLens = [];
    for (let i = 0; i < polyline.length-1; i++) {
        const d = getDistance(polyline[i][0], polyline[i][1], polyline[i+1][0], polyline[i+1][1]);
        segLens.push(d); total += d;
    }
    let target = progress * total, acc = 0;
    for (let i = 0; i < segLens.length; i++) {
        if (acc + segLens[i] >= target) {
            const p = (target - acc) / segLens[i];
            return [
                lerp(polyline[i][0], polyline[i+1][0], p),
                lerp(polyline[i][1], polyline[i+1][1], p)
            ];
        }
        acc += segLens[i];
    }
    return polyline[polyline.length-1];
}

// ... existing code ...
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
    initMap(); // Tambahkan baris ini agar map selalu muncul
    renderRoutes();
    setupSearch();
    setupRouteSearch();
    // enableLiveLocation(stops); // Removed as per new logic
});
// ... existing code ...

function toSec(hms) {
    const [h, m, s] = hms.split(':').map(Number);
    return h*3600 + m*60 + (s||0);
}
function lerp(a, b, t) {
    a = parseFloat(a); b = parseFloat(b);
    return a + (b-a)*t;
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
    // Event: saat dropdown berubah
    select.onchange = function() {
        const route = routes.find(r => r.route_id === select.value);
        selectedRouteId = select.value;
        saveUserProgress();
        renderRoutes(); // update selected
        showStopsByRoute(select.value, route);
    };
    // Jangan render halte default, tunggu user memilih
    if (selectedRouteId) {
        const route = routes.find(r => r.route_id === selectedRouteId);
        if (route) showStopsByRoute(selectedRouteId, route);
        if (simulatedBusInterval) clearInterval(simulatedBusInterval);
        simulatedBusMarkers.forEach(m => map && map.removeLayer(m));
        simulatedBusMarkers = [];
        Object.values(busMarkerMap).forEach(m => map && m.remove());
        busMarkerMap = {};
        // Hapus semua marker live bus jika ada
        if (liveBusInterval) clearInterval(liveBusInterval);
        liveBusMarkers.forEach(m => map && map.removeLayer(m));
        liveBusMarkers = [];
        // Update info user jika live location aktif
        if (geoWatchId && userMarker) {
            const latlng = userMarker.getLatLng();
            updateUserStatusPanel(latlng.lat, latlng.lng);
        }
    } else {
        // Bersihkan daftar halte dan marker peta
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
    // Hapus semua marker bus lama dan interval simulasi
    if (simulatedBusInterval) clearInterval(simulatedBusInterval);
    simulatedBusMarkers.forEach(m => map && map.removeLayer(m));
    simulatedBusMarkers = [];
    Object.values(busMarkerMap).forEach(m => map && m.remove());
    busMarkerMap = {};
    const ul = document.getElementById('stopsByRoute');
    const title = document.getElementById('stopsTitle');
    const directionTabs = document.getElementById('directionTabs');
    ul.innerHTML = '';
    directionTabs.innerHTML = '';
    // Judul dinamis
    if (routeObj) {
        // Badge: nomor layanan/koridor
        let badgeText = routeObj.route_short_name || routeObj.route_id || '';
        let badgeColor = routeObj.route_color ? ('#' + routeObj.route_color) : '#264697';
        let badgeFontSize = '1.4em';
        if (badgeText.length > 3) badgeFontSize = '0.5em';
        else if (badgeText.length > 2) badgeFontSize = '0.8em';
        // Judul utama: badge koridor + jurusan (route_long_name) dengan fw-bold
        let badge = `<span class='badge me-2' style='font-size:${badgeFontSize};width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:${badgeColor};color:#fff;'>${badgeText}</span>`;
        let subjudul = routeObj.route_long_name ? `<span class='fw-bold' style='font-size:1.2em;'>${routeObj.route_long_name}</span>` : '';
        title.innerHTML = `${badge}${subjudul}`;
    } else {
        title.textContent = 'Jalur Trayek';
    }
    // Ambil semua trip untuk rute ini, kelompokkan per direction_id
    const tripsForRoute = trips.filter(t => t.route_id === route_id);
    if (tripsForRoute.length === 0) {
        ul.innerHTML = '<li class="list-group-item">Data trip tidak ditemukan</li>';
        return;
    }
    // Gabungkan semua stops dari semua trips (tanpa duplikat, gabung koridor, kunci: nama lower+lat/lon bulat)
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
    // Render daftar halte satu kolom, badge koridor lain di bawah nama halte
    ul.innerHTML = '';
    allStops.forEach((stop, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex flex-column align-items-start gap-1 py-3';
        // Nama halte
        const halteName = document.createElement('span');
        halteName.className = 'fw-bold';
        halteName.textContent = stop.stop_name;
        li.appendChild(halteName);
        // Badge koridor lain di bawah nama halte
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
        // Simpan halte terakhir saat diklik
        li.onclick = function() {
            window.lastStopId = stop.stop_id;
            saveUserProgress();
        };
        // Highlight/scroll jika ini halte terakhir
        if (highlightStopId && stop.stop_id === highlightStopId) {
            li.classList.add('bg-warning');
            setTimeout(() => { li.scrollIntoView({behavior:'smooth', block:'center'}); }, 200);
        }
        ul.appendChild(li);
    });
    // Setelah selesai render list, baru render peta
    if (allStops.some(s => s.stop_lat && s.stop_lon)) {
        showHalteOnMap(allStops, tripsForRoute[0] && tripsForRoute[0].shape_id);
    }
    // Simulasi bus untuk semua trips dari semua arah
    if (!geoWatchId) {
    showSimulatedBusesOnMap(tripsForRoute);
    }
}

function setupSearch() {
    const input = document.getElementById('searchStop');
    const resultsDiv = document.getElementById('searchResults');
    input.addEventListener('input', function() {
        const q = input.value.trim().toLowerCase();
        resultsDiv.innerHTML = '';
        if (q.length < 1) return;

        // Jika hanya satu angka, hanya tampilkan koridor dengan short_name sama
        if (q.length === 1 && !isNaN(q)) {
            const foundKoridor = routes.filter(r =>
                r.route_short_name && r.route_short_name.toLowerCase() === q
            );
            const ul = document.createElement('ul');
            ul.className = 'list-group';
            ul.style.maxHeight = '250px';
            ul.style.overflowY = 'auto';
            if (foundKoridor.length > 0) {
                const layananHeader = document.createElement('li');
                layananHeader.className = 'list-group-item fw-bold bg-light text-primary';
                layananHeader.textContent = 'Layanan';
                ul.appendChild(layananHeader);
                foundKoridor.forEach(route => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex align-items-center';
                    let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                    li.innerHTML = `<span class='badge me-2' style='background:${badgeColor};color:#fff;'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
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
        // Cari halte
        const foundHalte = stops.filter(s => s.stop_name.toLowerCase().includes(q));
        // Cari koridor
        const foundKoridor = routes.filter(r =>
            (r.route_short_name && r.route_short_name.toLowerCase().includes(q)) ||
            (r.route_long_name && r.route_long_name.toLowerCase().includes(q))
        );
        const ul = document.createElement('ul');
        ul.className = 'list-group';
        ul.style.maxHeight = '250px';
        ul.style.overflowY = 'auto';
        // Render hasil koridor (layanan) di atas
        if (foundKoridor.length > 0) {
            const layananHeader = document.createElement('li');
            layananHeader.className = 'list-group-item fw-bold bg-light text-primary';
            layananHeader.textContent = 'Layanan';
            ul.appendChild(layananHeader);
            foundKoridor.forEach(route => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex align-items-center';
                let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                li.innerHTML = `<span class='badge me-2' style='background:${badgeColor};color:#fff;'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
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
        // Render hasil halte di bawah
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
                // badge koridor
                if (stopToRoutes[stop.stop_id]) {
                    const badges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            return `<span class='badge me-1' style='background:${badgeColor};color:#fff;'>${route.route_short_name}</span>`;
                        }
                        return '';
                    }).join('');
                    li.innerHTML += `<div class='mt-1'>${badges}</div>`;
                }
                li.onclick = function() {
                    // Zoom ke halte di map
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

function setupRouteSearch() {
    const input = document.getElementById('searchRoute');
    const select = document.getElementById('routesDropdown');
    let resultsDiv = document.getElementById('searchRouteResults');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'searchRouteResults';
        resultsDiv.style.position = 'absolute';
        resultsDiv.style.zIndex = '1002';
        resultsDiv.style.width = '100%';
        resultsDiv.style.background = '#fff';
        resultsDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        resultsDiv.style.borderRadius = '0 0 8px 8px';
        resultsDiv.style.maxHeight = '250px';
        resultsDiv.style.overflowY = 'auto';
        input.parentNode.appendChild(resultsDiv);
    }
    let lastFound = [];
    function setDropdownWidth() {
        resultsDiv.style.width = input.offsetWidth + 'px';
        resultsDiv.style.minWidth = input.offsetWidth + 'px';
        resultsDiv.style.maxWidth = input.offsetWidth + 'px';
    }
    input.addEventListener('focus', setDropdownWidth);
    input.addEventListener('input', setDropdownWidth);
    window.addEventListener('resize', setDropdownWidth);
    input.addEventListener('input', function(e) {
        const q = input.value.trim().toLowerCase();
        resultsDiv.innerHTML = '';
        if (q.length < 2) return;
        const found = routes.filter(r =>
            (r.route_short_name && r.route_short_name.toLowerCase().includes(q)) ||
            (r.route_long_name && r.route_long_name.toLowerCase().includes(q))
        );
        lastFound = found;
        if (found.length === 0) {
            resultsDiv.innerHTML = '<div class="alert alert-warning">Koridor tidak ditemukan</div>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'list-group';
        found.forEach((route, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center';
            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
            li.innerHTML = `<span class='badge me-2' style='background:${badgeColor};color:#fff;'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
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
        resultsDiv.appendChild(ul);
    });
    // Pilih hasil pertama jika tekan Enter
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && lastFound && lastFound.length > 0) {
            const route = lastFound[0];
            selectedRouteId = route.route_id;
            renderRoutes();
            showStopsByRoute(route.route_id, route);
            resultsDiv.innerHTML = '';
            input.value = '';
        }
    });
    // Tutup dropdown jika klik di luar
    document.addEventListener('click', function(e) {
        if (!resultsDiv.contains(e.target) && e.target !== input) {
            resultsDiv.innerHTML = '';
        }
    });
}

// Toggle Live Location Baru
// let userMarker = null;
// let geoWatchId = null;

function setLiveBtnState(active) {
    const btn = document.getElementById('liveLocationBtn');
    if (active) {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary');
        btn.setAttribute('data-active', 'on');
        btn.innerHTML = '<span id="liveLocationIcon" class="bi bi-geo-alt-fill"></span> Live Location: ON';
    } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
        btn.setAttribute('data-active', 'off');
        btn.innerHTML = '<span id="liveLocationIcon" class="bi bi-geo-alt"></span> Live Location: OFF';
    }
}

// Fungsi simpan dan restore progress user
function saveUserProgress() {
    localStorage.setItem('tj_selectedRouteId', selectedRouteId || '');
    localStorage.setItem('tj_lastStopId', window.lastStopId || '');
}
function clearUserProgress() {
    localStorage.removeItem('tj_selectedRouteId');
    localStorage.removeItem('tj_lastStopId');
}
// Restore progress saat halaman dimuat
window.addEventListener('DOMContentLoaded', function() {
    setLiveBtnState(false);
    const btn = document.getElementById('liveLocationBtn');
    let userToHalteLine = null;
    btn.addEventListener('click', function() {
        const isActive = btn.getAttribute('data-active') === 'on';
        if (!isActive) {
            // Aktifkan live location
            setLiveBtnState(true);
            if (navigator.geolocation) {
                geoWatchId = navigator.geolocation.watchPosition(function(pos) {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    console.log('Lokasi user:', lat, lon);
                    // Marker user (pakai icon standar Leaflet)
                    if (!userMarker) {
                        userMarker = L.marker([lat, lon], {
                            icon: L.icon({
                                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34]
                            })
                        }).addTo(map).bindPopup('Posisi Anda');
                    } else {
                        userMarker.setLatLng([lat, lon]);
                    }
                    map.setView([lat, lon], 16);

                    // Update panel status user dan highlight halte berikutnya
                    updateUserStatusPanel(lat, lon);

                    // Cari halte terdekat dari stops (GTFS)
                    let minDist = Infinity;
                    let nearestStop = null;
                    stops.forEach(stop => {
                        if (stop.stop_lat && stop.stop_lon) {
                            const d = getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                            if (d < minDist) {
                                minDist = d;
                                nearestStop = stop;
                            }
                        }
                    });
                    // --- Tambahan: Deteksi perubahan halte terdekat ---
                    if (!window.lastNearestStopId || window.lastNearestStopId !== (nearestStop && nearestStop.stop_id)) {
                        window.nearestStopPopupClosedManually = false;
                        window.lastNearestStopId = nearestStop && nearestStop.stop_id;
                    }
                    // Tampilkan popup halte terdekat dan garis (tanpa lingkaran merah)
                    if (window.nearestStopCircle) { map.removeLayer(window.nearestStopCircle); window.nearestStopCircle = null; }
                    if (window.nearestStopPopup) { map.closePopup(window.nearestStopPopup); window.nearestStopPopup = null; }
                    if (!selectedRouteId) {
                        // Jika belum memilih layanan, tampilkan circle merah halte terdekat dan popup
                        window.nearestStopCircle = L.circle([parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)], {
                            color: 'red', fillColor: '#f03', fillOpacity: 0.3, radius: 60
                        }).addTo(map);
                        // ... lanjutkan logic popup halte terdekat di sini ...
                        // (pindahkan seluruh logic popup halte terdekat ke dalam blok ini jika perlu)
                    }
                    let layanan = '';
                    if (nearestStop && stopToRoutes[nearestStop.stop_id]) {
                        layanan = Array.from(stopToRoutes[nearestStop.stop_id])
                            .map(rid => {
                                const route = routes.find(r => r.route_id === rid);
                                return route ? `<div><b>${route.route_short_name}</b> - ${route.route_long_name}</div>` : '';
                            })
                            .join('');
                    }
                    if (nearestStop) {
                        // Tambahkan marker khusus di halte terdekat
                        if (window.nearestStopMarker) map.removeLayer(window.nearestStopMarker);
                        window.nearestStopMarker = L.marker([parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)], {
                            icon: L.icon({
                                iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                                iconSize: [36, 36],
                                iconAnchor: [18, 36],
                                popupAnchor: [0, -36]
                            })
                        }).addTo(map);
                        // Event klik marker halte terdekat agar popup bisa dibuka ulang
                        window.nearestStopMarker.on('click', function() {
                            if (window.nearestStopPopup) map.openPopup(window.nearestStopPopup);
                        });
                        // Badge layanan bisa diklik
                        let layananBadges = '';
                        if (stopToRoutes[nearestStop.stop_id]) {
                            layananBadges = Array.from(stopToRoutes[nearestStop.stop_id])
                                .map(rid => {
                                    const route = routes.find(r => r.route_id === rid);
                                    if (route) {
                                        let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                                        return `<span class='badge me-1 layanan-badge-popup' data-routeid='${route.route_id}' style='background:${badgeColor};color:#fff;cursor:pointer;'>${route.route_short_name}</span>`;
                                    }
                                    return '';
                                })
                                .join('');
                        }
                        // Info bus yang akan datang ke halte tsb
                        let busInfo = '';
                        if (typeof halteToArrivingBuses !== 'undefined' && halteToArrivingBuses[nearestStop.stop_id] && halteToArrivingBuses[nearestStop.stop_id].length > 0) {
                            const busObj = [...halteToArrivingBuses[nearestStop.stop_id]].sort((a, b) => a.eta - b.eta)[0];
                            if (busObj) {
                                let etaStr = busObj.eta > 60 ? `${Math.floor(busObj.eta/60)}m ${busObj.eta%60}s` : `${busObj.eta}s`;
                                busInfo = `<br><span class='text-muted small'>Bus menuju halte ini: <span class='badge bg-primary ms-1 badge-bus-link' data-buskey='${busObj.busKey}' style='cursor:pointer;'>${busObj.busNumber} (${etaStr})</span></span>`;
                            }
                        }
                        // Tambahkan info halte berikutnya jika sudah memilih layanan
                        let nextStopInfo = '';
                        if (selectedRouteId) {
                            // Ambil daftar halte di koridor terpilih
                            const tripsForRoute = trips.filter(t => t.route_id === selectedRouteId);
                            let halteMap = new Map();
                            tripsForRoute.forEach(trip => {
                                const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id)
                                    .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
                                stopsForTrip.forEach(st => {
                                    const stop = stops.find(s => s.stop_id === st.stop_id);
                                    if (stop) {
                                        const key = stop.stop_id;
                                        if (!halteMap.has(key)) halteMap.set(key, stop);
                                    }
                                });
                            });
                            const stopsArr = Array.from(halteMap.values());
                            // Cari halte berikutnya di depan user
                            function getBearing(lat1, lon1, lat2, lon2) {
                                const toRad = deg => deg * Math.PI / 180;
                                const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
                                const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
                                          Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
                                return Math.atan2(y, x) * 180 / Math.PI;
                            }
                            let userBearing = null;
                            if (prevUserLat !== null && prevUserLon !== null && (lat !== prevUserLat || lon !== prevUserLon)) {
                                userBearing = getBearing(prevUserLat, prevUserLon, lat, lon);
                            }
                            let minAngleDiff = 180, nextStop = null, minDistNext = Infinity;
                            stopsArr.forEach(stop => {
                                if (stop.stop_lat && stop.stop_lon) {
                                    const dist = getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                                    const bearingToStop = getBearing(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                                    let angleDiff = userBearing !== null ? Math.abs(((bearingToStop - userBearing + 540) % 360) - 180) : 0;
                                    // Pilih halte di depan user (angleDiff < 90 derajat) dan bukan halte terdekat
                                    if (angleDiff < 90 && dist < minDistNext && stop.stop_id !== nearestStop.stop_id) {
                                        minDistNext = dist;
                                        minAngleDiff = angleDiff;
                                        nextStop = stop;
                                    }
                                }
                            });
                            if (nextStop) {
                                nextStopInfo = `<br><span class='text-muted small'>Halte berikutnya: <b>${nextStop.stop_name}</b> (${minDistNext.toFixed(0)} m)</span>`;
                            }
                        }
                        const popupContent = `<b>Halte Terdekat:</b><br>${nearestStop.stop_name}<br>Jarak: ${minDist.toFixed(0)} m${nextStopInfo}${layananBadges ? '<hr>Layanan:<br>' + layananBadges : ''}${busInfo}`;
                        window.nearestStopPopup = L.popup({autoClose: false, closeOnClick: false})
                            .setLatLng([parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)])
                            .setContent(popupContent);
                        // Event: badge layanan di popup bisa diklik (pakai event popupopen agar pasti sudah render)
                        map.once('popupopen', function(e) {
                            const popupEl = e.popup.getElement();
                            if (popupEl) {
                                popupEl.querySelectorAll('.layanan-badge-popup').forEach(badge => {
                                    badge.onclick = function(ev) {
                                        console.log('Badge layanan diklik', badge.getAttribute('data-routeid'));
                                        ev.stopPropagation();
                                        const rid = badge.getAttribute('data-routeid');
                                        if (rid) {
                                            selectedRouteId = rid;
                                            renderRoutes();
                                            showStopsByRoute(rid, routes.find(r => r.route_id === rid));
                                            window.nearestStopPopup && map.closePopup(window.nearestStopPopup);
                                        }
                                    };
                                });
                                // Badge bus menuju halte ini
                                popupEl.querySelectorAll('.badge-bus-link').forEach(badge => {
                                    badge.onclick = function(ev) {
                                        ev.stopPropagation();
                                        const busKey = badge.getAttribute('data-buskey');
                                        if (busKey && busMarkerMap[busKey]) {
                                            map.panTo(busMarkerMap[busKey].getLatLng());
                                            busMarkerMap[busKey].openPopup();
                                        }
                                    };
                                });
                            }
                        });
                        // Tambahkan event popupclose untuk deteksi manual close
                        window.nearestStopPopup.on('remove', function() {
                            window.nearestStopPopupClosedManually = true;
                        });
                        // Hanya buka popup jika belum pernah ditutup manual
                        if (!window.nearestStopPopupClosedManually) {
                            window.nearestStopPopup.openOn(map);
                        }
                        // Garis dari user ke halte terdekat (pakai OSRM)
                        if (userToHalteLine) { map.removeLayer(userToHalteLine); userToHalteLine = null; }
                        fetch(`https://router.project-osrm.org/route/v1/foot/${lon},${lat};${nearestStop.stop_lon},${nearestStop.stop_lat}?overview=full&geometries=geojson`)
                            .then(res => res.json())
                            .then(data => {
                                if (userToHalteLine) { map.removeLayer(userToHalteLine); userToHalteLine = null; }
                                if (data.routes && data.routes[0] && data.routes[0].geometry) {
                                    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                                    userToHalteLine = L.polyline(coords, {color: '#0074D9', weight: 4, dashArray: '6, 8'}).addTo(map);
                                } else {
                                    userToHalteLine = L.polyline(
                                        [[lat, lon], [parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)]],
                                        {color: '#0074D9', weight: 4, dashArray: '6, 8'}
                                    ).addTo(map);
                                }
                            })
                            .catch(() => {
                                if (userToHalteLine) { map.removeLayer(userToHalteLine); userToHalteLine = null; }
                                userToHalteLine = L.polyline(
                                    [[lat, lon], [parseFloat(nearestStop.stop_lat), parseFloat(nearestStop.stop_lon)]],
                                    {color: '#0074D9', weight: 4, dashArray: '6, 8'}
                                ).addTo(map);
                            });
                    }
                }, function(err) {
                    alert('Gagal mendapatkan lokasi: ' + err.message);
                    setLiveBtnState(false);
                }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
            } else {
                alert('Geolocation tidak didukung browser Anda.');
                setLiveBtnState(false);
            }
        } else {
            // Matikan live location
            setLiveBtnState(false);
            if (geoWatchId) {
                navigator.geolocation.clearWatch(geoWatchId);
                geoWatchId = null;
            }
            if (userMarker) {
                map.removeLayer(userMarker);
                userMarker = null;
            }
            // Hapus panel status user yang mengambang
            const userStatusPanel = document.getElementById('userStatusPanel');
            if (userStatusPanel) {
                userStatusPanel.remove();
            }
            if (userToHalteLine) {
                map.removeLayer(userToHalteLine);
                userToHalteLine = null;
            }
            // Saat live location OFF, hapus marker halte terdekat
            if (window.nearestStopMarker) {
                map.removeLayer(window.nearestStopMarker);
                window.nearestStopMarker = null;
            }
        }
    });
    const savedRouteId = localStorage.getItem('tj_selectedRouteId');
    const savedStopId = localStorage.getItem('tj_lastStopId');
    if (savedRouteId) {
        selectedRouteId = savedRouteId;
        const route = routes.find(r => r.route_id === selectedRouteId);
        renderRoutes();
        if (route) showStopsByRoute(selectedRouteId, route, savedStopId);
        // Jangan panggil renderRoutes() lagi di tempat lain!
    }
});

// Tambahkan tombol reset koridor jika belum ada
window.addEventListener('DOMContentLoaded', function() {
    const select = document.getElementById('routesDropdown');
    if (select && !document.getElementById('resetRouteBtn')) {
        // Bungkus select dan tombol dalam div flex agar tombol rata kanan
        let wrapper = select.parentNode;
        if (!wrapper.classList.contains('d-flex')) {
            const flexDiv = document.createElement('div');
            flexDiv.className = 'd-flex justify-content-end align-items-center mb-2';
            select.parentNode.insertBefore(flexDiv, select);
            flexDiv.appendChild(select);
            wrapper = flexDiv;
        }
        const btn = document.createElement('button');
        btn.id = 'resetRouteBtn';
        btn.className = 'btn btn-outline-danger ms-2 px-4 py-2 fs-5 align-middle';
        btn.title = 'Hapus Pilihan Koridor';
        btn.textContent = 'Hapus Terbaru';
        // Tempatkan tombol di samping tombol live location
        if (btn.parentNode) { // Ensure parentNode exists
            const liveBtn = document.getElementById('liveLocationBtn');
            if (liveBtn && liveBtn.parentNode) {
                liveBtn.parentNode.insertBefore(btn, liveBtn.nextSibling);
            } else {
                // fallback: letakkan setelah dropdown
                select.parentNode.insertBefore(btn, select.nextSibling);
            }
        }
    }
    const btn = document.getElementById('resetRouteBtn');
    if (btn) {
        btn.onclick = function() {
            selectedRouteId = null;
            const select = document.getElementById('routesDropdown');
            if (select) select.value = '';
            // Hapus semua marker live bus dan interval
            if (liveBusInterval) clearInterval(liveBusInterval);
            liveBusMarkers.forEach(m => map && map.removeLayer(m));
            liveBusMarkers = [];
            // Hapus semua marker bus simulasi
            if (simulatedBusInterval) clearInterval(simulatedBusInterval);
            simulatedBusMarkers.forEach(m => map && map.removeLayer(m));
            simulatedBusMarkers = [];
            Object.values(busMarkerMap).forEach(m => map && m.remove());
            busMarkerMap = {};
            // Hapus polyline dan garis user
            if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
            if (userNextStopCircle) { map.removeLayer(userNextStopCircle); userNextStopCircle = null; }
            if (nearestStopCircle) { map.removeLayer(nearestStopCircle); nearestStopCircle = null; }
            if (polylineLayer) { map.removeLayer(polylineLayer); polylineLayer = null; }
            if (polylineLayers && polylineLayers.length) {
                polylineLayers.forEach(pl => map.removeLayer(pl));
            }
            polylineLayers = [];
            clearUserProgress();
            renderRoutes();
        };
    }
});

// Fungsi untuk membuat badge bus HTML
function getBusBadgeHTML(routeShortName, routeColor) {
    let fontSize = '15px';
    if (routeShortName.length > 4) fontSize = '8px';
    else if (routeShortName.length > 2) fontSize = '11px';
    // Hanya tampilkan short name di badge, nomor bus di popup saja
    return `<div class="bus-badge" style="background:${routeColor};color:#fff;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:50%;font-size:${fontSize};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);line-height:1.1;">${routeShortName}</div>`;
}

// Fungsi utama simulasi bus
function showSimulatedBusesOnMap(directionTrips) {
    if (simulatedBusInterval) clearInterval(simulatedBusInterval);
    simulatedBusMarkers.forEach(m => map && map.removeLayer(m));
    simulatedBusMarkers = [];
    // busMarkerMap tetap global, jangan di-reset setiap update
    const tripsWithFreq = directionTrips.filter(trip => frequencies.some(f => f.trip_id === trip.trip_id));
    if (tripsWithFreq.length === 0) return;
    const STOP_DURATION = 15; // detik berhenti di setiap halte
    // Tambahkan mapping halte -> bus yang akan tiba
    let halteToArrivingBuses = {};
    window.halteToArrivingBuses = halteToArrivingBuses;
    function getRandomBusNumber(tripId, t) {
        const trip = trips.find(tr => tr.trip_id === tripId);
        if (trip && trip.bus_number) return trip.bus_number;
        if (trip && trip.vehicle_id) return trip.vehicle_id;
        let hash = 0;
        for (let i = 0; i < tripId.length; i++) hash = ((hash << 5) - hash) + tripId.charCodeAt(i);
        hash = Math.abs(hash + t) % 900 + 100;
        return hash;
    }
    function updateSimulatedBuses() {
        // Tandai marker yang masih aktif di update ini
        let activeBusKeys = new Set();
        simulatedBusMarkers = [];
        // Reset halteToArrivingBuses setiap update
        for (let k in halteToArrivingBuses) delete halteToArrivingBuses[k];
        const now = new Date();
        const nowSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds() + now.getMilliseconds()/1000;
        tripsWithFreq.forEach(trip => {
            const freqs = frequencies.filter(f => f.trip_id === trip.trip_id);
            const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id)
                .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
            if (stopsForTrip.length < 2) return;
            const halteCoords = stopsForTrip.map(st => {
                const stop = stops.find(s => s.stop_id === st.stop_id);
                return stop && stop.stop_lat && stop.stop_lon ? [parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)] : null;
            });
            const halteTimesAbs = stopsForTrip.map(st => toSec(st.arrival_time || st.departure_time));
            let halteTimes = [0];
            for (let i = 1; i < halteTimesAbs.length; i++) {
                let prev = halteTimes[halteTimes.length-1];
                let travel = halteTimesAbs[i] - halteTimesAbs[i-1];
                halteTimes.push(prev + travel + STOP_DURATION);
            }
            const tripDuration = halteTimes[halteTimes.length-1];
            const route = routes.find(r => r.route_id === trip.route_id);
            const badgeText = route && route.route_short_name ? route.route_short_name : (route ? route.route_id : '?');
            const badgeColor = route && route.route_color ? ('#' + route.route_color) : '#1976d2';
            const shape_id = trip.shape_id;
            const shapePoints = shapes.filter(s => s.shape_id === shape_id)
                .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
            const shapePolyline = shapePoints.map(pt => [parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon)]);
            let stopShapeIdx = [];
            if (shapePolyline.length > 1) {
                stopShapeIdx = halteCoords.map(([lat, lon]) => {
                    let minDist = Infinity, idx = 0;
                    shapePolyline.forEach((pt, i) => {
                        const d = getDistance(lat, lon, pt[0], pt[1]);
                        if (d < minDist) { minDist = d; idx = i; }
                    });
                    return idx;
                });
            }
            freqs.forEach(freq => {
                const startSec = toSec(freq.start_time);
                const endSec = toSec(freq.end_time);
                const headway = parseInt(freq.headway_secs);
                for (let t = startSec; t + tripDuration <= endSec; t += headway) {
                    if (nowSec < t || nowSec > t + tripDuration) continue;
                    const busTime = nowSec - t;
                    let segIdx = 0;
                    for (let i = 0; i < halteTimes.length-1; i++) {
                        if (busTime >= halteTimes[i] && busTime < halteTimes[i+1]) {
                            segIdx = i;
                            break;
                        }
                    }
                    let lat, lon, speedKmh = 0;
                    const stopTimeStart = halteTimes[segIdx+1] - STOP_DURATION;
                    const stopTimeEnd = halteTimes[segIdx+1];
                    let statusText = '', etaText = '';
                    const busNumber = getRandomBusNumber(trip.trip_id, t);
                    // Info bus menuju halte berikutnya atau sedang berhenti
                    if (busTime >= stopTimeStart && busTime < stopTimeEnd) {
                        // Sedang berhenti di halte
                        let currStopId = stopsForTrip[segIdx+1].stop_id;
                        if (!halteToArrivingBuses[currStopId]) halteToArrivingBuses[currStopId] = [];
                        halteToArrivingBuses[currStopId].push({busNumber: busNumber, eta: Math.round((halteTimes[segIdx+1] - busTime))});
                    } else {
                        // Menuju halte berikutnya
                        let nextStopId = stopsForTrip[segIdx+1].stop_id;
                        if (!halteToArrivingBuses[nextStopId]) halteToArrivingBuses[nextStopId] = [];
                        halteToArrivingBuses[nextStopId].push({busNumber: busNumber, eta: Math.round((halteTimes[segIdx+1] - busTime))});
                    }
                    if (busTime >= stopTimeStart && busTime < stopTimeEnd) {
                        lat = halteCoords[segIdx+1][0];
                        lon = halteCoords[segIdx+1][1];
                        let sisa = Math.max(0, stopTimeEnd - busTime);
                        if (sisa < 2) speedKmh = 12 * (sisa/2);
                        else speedKmh = 0;
                        const stopName = stops.find(s => s.stop_id === stopsForTrip[segIdx+1].stop_id)?.stop_name || '-';
                        statusText = `Tiba di Halte: <b>${stopName}</b>`;
                        etaText = `Berhenti ${Math.round(stopTimeEnd - busTime)} detik lagi`;
                    } else {
                        const t0 = halteTimes[segIdx], t1 = halteTimes[segIdx+1] - STOP_DURATION;
                        let p = t1 > t0 ? (busTime - t0) / (t1 - t0) : 0;
                        if (!isFinite(p) || isNaN(p)) p = 0;
                        p = Math.max(0, Math.min(1, p));
                        if (shapePolyline.length > 1 && stopShapeIdx.length === halteCoords.length) {
                            let shapeStart = stopShapeIdx[segIdx], shapeEnd = stopShapeIdx[segIdx+1];
                            let segPolyline = [];
                            if (shapeStart < shapeEnd) {
                                segPolyline = shapePolyline.slice(shapeStart, shapeEnd+1);
                            } else if (shapeStart > shapeEnd) {
                                segPolyline = shapePolyline.slice(shapeEnd, shapeStart+1).reverse();
                            }
                            if (segPolyline.length < 2) {
                                segPolyline = [halteCoords[segIdx], halteCoords[segIdx+1]];
                            }
                            let totalDist = 0, segLens = [];
                            for (let i = 0; i < segPolyline.length-1; i++) {
                                const d = getDistance(segPolyline[i][0], segPolyline[i][1], segPolyline[i+1][0], segPolyline[i+1][1]);
                                segLens.push(d); totalDist += d;
                            }
                            // Profile trapezoidal: akselerasi, cruising, deselerasi
                            const waktuSegmen = t1 - t0;
                            const vmax = waktuSegmen > 0 ? 2 * totalDist / waktuSegmen : 0; // m/s
                            let v = 0, s = 0;
                            if (p < 0.5) {
                                v = vmax * (p/0.5);
                                s = 0.5 * vmax * (p * waktuSegmen);
                            } else {
                                v = vmax * ((1-p)/0.5);
                                s = (totalDist/2) + 0.5 * vmax * ((p-0.5) * waktuSegmen);
                            }
                            speedKmh = v * 3.6;
                            // Konversi s (meter) ke posisi di polyline
                            let target = s, acc = 0;
                            for (let i = 0; i < segLens.length; i++) {
                                if (acc + segLens[i] >= target) {
                                    const pp = (target - acc) / segLens[i];
                                    lat = segPolyline[i][0] + (segPolyline[i+1][0] - segPolyline[i][0]) * pp;
                                    lon = segPolyline[i][1] + (segPolyline[i+1][1] - segPolyline[i][1]) * pp;
                                    break;
                                }
                                acc += segLens[i];
                            }
                            if (lat === undefined || lon === undefined) {
                                lat = segPolyline[segPolyline.length-1][0];
                                lon = segPolyline[segPolyline.length-1][1];
                            }
                        } else {
                            const coord0 = halteCoords[segIdx], coord1 = halteCoords[segIdx+1];
                            if (!coord0 || !coord1) continue;
                            const waktuSegmen = t1 - t0;
                            const dist = getDistance(coord0[0], coord0[1], coord1[0], coord1[1]);
                            const vmax = waktuSegmen > 0 ? 2 * dist / waktuSegmen : 0;
                            let v = 0, s = 0;
                            if (p < 0.5) {
                                v = vmax * (p/0.5);
                                s = 0.5 * vmax * (p * waktuSegmen);
                            } else {
                                v = vmax * ((1-p)/0.5);
                                s = (dist/2) + 0.5 * vmax * ((p-0.5) * waktuSegmen);
                            }
                            speedKmh = v * 3.6;
                            // Konversi s ke posisi linear
                            lat = coord0[0] + (coord1[0] - coord0[0]) * (s/dist);
                            lon = coord0[1] + (coord1[1] - coord0[1]) * (s/dist);
                        }
                        // Status: Menuju Halte berikutnya
                        const stopName = stops.find(s => s.stop_id === stopsForTrip[segIdx+1].stop_id)?.stop_name || '-';
                        const eta = Math.max(0, Math.round((halteTimes[segIdx+1] - busTime)));
                        statusText = `Menuju Halte: <b>${stopName}</b>`;
                        if (eta > 60) etaText = `Estimasi tiba: ${Math.floor(eta/60)} menit ${eta%60} detik`;
                        else etaText = `Estimasi tiba: ${eta} detik`;
                    }
                    const busKey = trip.trip_id + '_' + t;
                    activeBusKeys.add(busKey);
                    let marker = busMarkerMap[busKey];
                    if (!marker) {
                        const busIcon = L.divIcon({
                            className: 'sim-bus-icon',
                            html: getBusBadgeHTML(badgeText, badgeColor),
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        });
                        marker = L.marker([lat, lon], {icon: busIcon}).addTo(map);
                        busMarkerMap[busKey] = marker;
                        marker.bindPopup(
                            'Simulasi Bus #' + busNumber +
                            '<br>Trip: ' + trip.trip_id +
                            '<br>Rute: ' + badgeText +
                            `<br>Kecepatan: ${speedKmh.toFixed(1)} km/jam` +
                            `<br>${statusText}` +
                            `<br>${etaText}`
                        );
                        marker.on('popupopen', function() {
                            marker._popupOpen = true;
                            currentOpenPopupBusKey = busKey;
                        });
                        marker.on('popupclose', function() {
                            marker._popupOpen = false;
                            if (currentOpenPopupBusKey === busKey) currentOpenPopupBusKey = null;
                        });
                    } else {
                        marker.setLatLng([lat, lon]);
                        // Selalu pasang ulang event handler highlight polyline bus
                        marker.off('popupopen');
                        marker.off('popupclose');
                        marker.on('popupopen', function() {
                            if (busHighlightPolyline) { map.removeLayer(busHighlightPolyline); busHighlightPolyline = null; }
                            const shapePoints = shapes.filter(s => s.shape_id === trip.shape_id)
                                .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
                            const polyline = shapePoints.map(pt => [parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon)]);
                            let minDist = Infinity, idx = 0;
                            polyline.forEach((pt, i) => {
                                const d = getDistance(lat, lon, pt[0], pt[1]);
                                if (d < minDist) { minDist = d; idx = i; }
                            });
                            const highlightLine = polyline.slice(idx);
                            if (highlightLine.length > 1) {
                                busHighlightPolyline = L.polyline(highlightLine, {color: 'orange', weight: 6, opacity: 0.7, dashArray: '8,8'}).addTo(map);
                            }
                        });
                        marker.on('popupclose', function() {
                            if (busHighlightPolyline) { map.removeLayer(busHighlightPolyline); busHighlightPolyline = null; }
                        });
                    }
                    simulatedBusMarkers.push(marker);
                }
            });
        });
        // Hapus marker yang tidak aktif
        Object.keys(busMarkerMap).forEach(key => {
            if (!activeBusKeys.has(key)) {
                map && busMarkerMap[key].remove();
                delete busMarkerMap[key];
            }
        });
    }
    updateSimulatedBuses();
    simulatedBusInterval = setInterval(updateSimulatedBuses, 100);
} 

// Fungsi untuk update panel status user
function updateUserStatusPanel(lat, lon) {
    // Hanya aktif jika ada selectedRouteId
    if (!selectedRouteId) {
        return;
    }
    const now = Date.now();
    if (prevUserLat !== null && prevUserLon !== null && prevUserTime !== null) {
        const dt = (now - prevUserTime) / 1000; // detik
        const dist = getDistance(lat, lon, prevUserLat, prevUserLon); // meter
        userSpeed = dt > 0 ? dist / dt : 0; // m/s
    }
    prevUserLat = lat;
    prevUserLon = lon;
    prevUserTime = now;

    // Hitung arah pergerakan user (bearing)
    function getBearing(lat1, lon1, lat2, lon2) {
        const toRad = deg => deg * Math.PI / 180;
        const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
        const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
                  Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
        return Math.atan2(y, x) * 180 / Math.PI;
    }
    let userBearing = null;
    if (prevUserLat !== null && prevUserLon !== null && (lat !== prevUserLat || lon !== prevUserLon)) {
        userBearing = getBearing(prevUserLat, prevUserLon, lat, lon);
    }

    // Ambil daftar halte di koridor terpilih
    const tripsForRoute = trips.filter(t => t.route_id === selectedRouteId);
    let halteMap = new Map();
    tripsForRoute.forEach(trip => {
        const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id)
            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        stopsForTrip.forEach(st => {
            const stop = stops.find(s => s.stop_id === st.stop_id);
            if (stop) {
                const key = stop.stop_id;
                if (!halteMap.has(key)) halteMap.set(key, stop);
            }
        });
    });
    const stopsArr = Array.from(halteMap.values());

    // --- Tambahan: Deteksi jika user sedang di halte ---
    const HALTE_RADIUS = 50; // meter
    let currStop = null, currDist = Infinity;
    stopsArr.forEach(stop => {
        if (stop.stop_lat && stop.stop_lon) {
            const dist = getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
            if (dist < currDist) {
                currDist = dist;
                currStop = stop;
            }
        }
    });
    let layananText = selectedRouteId ? (routes.find(r => r.route_id === selectedRouteId)?.route_short_name || selectedRouteId) : '-';
    let halteText = '';
    let etaText = '';
    let distText = '';
    let speedText = userSpeed ? `${(userSpeed*3.6).toFixed(1)} km/jam` : '-';
    if (currDist <= HALTE_RADIUS) {
        // User sedang di halte
        // Highlight halte tempat user berada (hijau)
        if (userNextStopCircle) map.removeLayer(userNextStopCircle);
        if (currStop) {
            userNextStopCircle = L.circle([parseFloat(currStop.stop_lat), parseFloat(currStop.stop_lon)], {
                color: 'green', fillColor: '#0df08a', fillOpacity: 0.3, radius: 60
            }).addTo(map);
        }
        // Hapus path jika ada
        if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
        halteText = currStop ? currStop.stop_name : '-';
        etaText = 'Sedang di halte';
        distText = `${currDist.toFixed(0)} m`;
    } else {
        // Cari halte berikutnya di arah pergerakan user dari stopsArr
        let minAngleDiff = 180, nextStop = null, minDist = Infinity;
        stopsArr.forEach(stop => {
            if (stop.stop_lat && stop.stop_lon) {
                const dist = getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                const bearingToStop = getBearing(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                let angleDiff = userBearing !== null ? Math.abs(((bearingToStop - userBearing + 540) % 360) - 180) : 0;
                // Pilih halte di depan user (angleDiff < 90 derajat)
                if (angleDiff < 90 && dist < minDist) {
                    minDist = dist;
                    minAngleDiff = angleDiff;
                    nextStop = stop;
                }
            }
        });
        // Estimasi tiba
        let eta = userSpeed > 0 ? minDist / userSpeed : null;
        halteText = nextStop ? nextStop.stop_name : '-';
        etaText = eta ? (eta > 60 ? `${Math.floor(eta/60)}m ${Math.round(eta%60)}s` : `${Math.round(eta)}s`) : '-';
        distText = minDist ? `${minDist.toFixed(0)} m` : '-';
        // Highlight halte berikutnya di peta (biru)
        if (userNextStopCircle) map.removeLayer(userNextStopCircle);
        if (nextStop) {
            userNextStopCircle = L.circle([parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon)], {
                color: 'blue', fillColor: '#0dcaf0', fillOpacity: 0.3, radius: 60
            }).addTo(map);
            // --- Tambahan: gambar path jalan kaki ke halte berikutnya ---
            if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
            fetch(`https://router.project-osrm.org/route/v1/foot/${lon},${lat};${nextStop.stop_lon},${nextStop.stop_lat}?overview=full&geometries=geojson`)
                .then(res => res.json())
                .then(data => {
                    if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
                    if (data.routes && data.routes[0] && data.routes[0].geometry) {
                        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                        userToNextStopLine = L.polyline(coords, {color: '#a020f0', weight: 5, dashArray: '8,8'}).addTo(map);
                    } else {
                        userToNextStopLine = L.polyline(
                            [[lat, lon], [parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon)]],
                            {color: '#a020f0', weight: 5, dashArray: '8,8'}
                        ).addTo(map);
                    }
                })
                .catch(() => {
                    if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
                    userToNextStopLine = L.polyline(
                        [[lat, lon], [parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon)]],
                        {color: '#a020f0', weight: 5, dashArray: '8,8'}
                    ).addTo(map);
                });
        } else {
            if (userToNextStopLine) { map.removeLayer(userToNextStopLine); userToNextStopLine = null; }
        }
    }
    // Update popup pada marker user
    const userPopupContent = `
        <b>Posisi Anda</b><br>
        <b>Layanan:</b> ${layananText}<br>
        <b>Halte:</b> ${halteText}<br>
        <b>Estimasi Tiba:</b> ${etaText}<br>
        <b>Jarak:</b> ${distText}<br>
        <b>Kecepatan:</b> ${speedText}
    `;
    if (userMarker) {
        userMarker.bindPopup(userPopupContent);
        userMarker.on('click', function() {
            userMarker.openPopup();
        });
    }
} 