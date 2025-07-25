// Ambil data GTFS dari folder gtfs/ untuk bus stop dan shapes
Promise.all([
    fetch('gtfs/stops.txt').then(r => r.text()),
    fetch('gtfs/routes.txt').then(r => r.text()),
    fetch('gtfs/trips.txt').then(r => r.text()),
    fetch('gtfs/stop_times.txt').then(r => r.text()),
    fetch('gtfs/shapes.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/frequencies.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/fare_rules.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/fare_attributes.txt').then(r => r.ok ? r.text() : ''),
]).then(([stopsTxt, routesTxt, tripsTxt, stopTimesTxt, shapesTxt, frequenciesTxt, fareRulesTxt, fareAttributesTxt]) => {
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
    // Parse fare_rules dan fare_attributes
    window.fare_rules = [];
    if (fareRulesTxt) window.fare_rules = parseCSV(fareRulesTxt);
    window.fare_attributes = [];
    if (fareAttributesTxt) window.fare_attributes = parseCSV(fareAttributesTxt);
    initMap();
    // Cek localStorage untuk koridor terakhir
    const savedRouteId = localStorage.getItem('activeRouteId');
    if (savedRouteId && routes && routes.length > 0) {
        selectedRouteId = savedRouteId;
        renderRoutes();
        showStopsByRoute(savedRouteId, routes.find(r => r.route_id === savedRouteId));
    } else {
        renderRoutes();
    }
    setupSearch();
    // setupRouteSearch(); // dikomentari agar tidak error
});

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
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
let radiusHalteMarkers = [];
let lastRadiusPopupMarker = null;
let lastRadiusPopupStopId = null;
window.radiusHalteActive = false;
window.searchResultMarker = null;
// Simpan ke localStorage setiap kali user memilih koridor
function saveActiveRouteId(routeId) {
    if (routeId) {
        localStorage.setItem('activeRouteId', routeId);
    } else {
        localStorage.removeItem('activeRouteId');
    }
}

// Helper function untuk font-size badge koridor
// Hapus fungsi getBadgeFontSize
// function getBadgeFontSize(text) {
//     if (!text) return '1em';
//     if (text.length > 3) return '0.5em';
//     if (text.length > 2) return '0.7em';
//     if (text.length > 1) return '0.9em';
//     return '1em';
// }

function initMap() {
    if (!map) {
        map = L.map('map', { fullscreenControl: true }).setView([-6.2, 106.8], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        // Daftarkan event handler radius hanya sekali setelah map dibuat
        if (!window._radiusZoomHandlerAdded) {
            map.on('zoomend moveend', function() {
                if (window.radiusHalteActive && map.getZoom() >= 14) {
                    const center = map.getCenter();
                    showHalteRadius(center.lat, center.lng, 300);
                } else {
                    removeHalteRadiusMarkers();
                }
            });
            window._radiusZoomHandlerAdded = true;
        }
    }
    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    if (polylineLayer) {
        map.removeLayer(polylineLayer);
    }
    // Tambahkan tombol custom
    ensureCustomMapButtons();
    // Tambahkan kembali kontrol geocoder (search box) di pojok kanan atas
    if (!map._geocoderControl && typeof L.Control.Geocoder !== 'undefined') {
        map._geocoderControl = L.Control.geocoder({
            defaultMarkGeocode: true,
            placeholder: 'Cari tempat...',
            errorMessage: 'Tidak ditemukan',
            geocoder: L.Control.Geocoder.nominatim(),
            position: 'topright'
        }).addTo(map);
    }
}

function ensureCustomMapButtons() {
    const mapDiv = document.getElementById('map');
    // --- Live Location ---
    if (!document.getElementById('liveLocationBtnMap')) {
        const btn = document.createElement('button');
        btn.id = 'liveLocationBtnMap';
        btn.className = 'btn btn-primary rounded-5 btn-sm position-absolute';
        btn.style.top = '70px';
        btn.style.right = '12px';
        btn.style.zIndex = 1000;
        btn.innerHTML = '<iconify-icon icon="typcn:location" inline></iconify-icon>';
        btn.onclick = function() {
            const isActive = btn.classList.toggle('active');
            const nearestBtn = document.getElementById('nearestStopsBtn');
            if (isActive) {
                setLiveBtnState(true);
                enableLiveLocation(
                    // onError callback
                    function onError() {
                        btn.classList.remove('btn-primary', 'btn-success');
                        btn.classList.add('btn-danger');
                    }
                );
                btn.classList.remove('btn-primary', 'btn-danger');
                btn.classList.add('btn-success');
                if (nearestBtn) nearestBtn.style.display = '';
            } else {
                setLiveBtnState(false);
                disableLiveLocation();
                btn.classList.remove('btn-success', 'btn-danger');
                btn.classList.add('btn-primary');
                if (nearestBtn) nearestBtn.style.display = 'none';
                // Hapus marker halte terdekat saat live location dimatikan
                if (window.nearestStopsMarkers && window.nearestStopsMarkers.length > 0) {
                    window.nearestStopsMarkers.forEach(m => map.removeLayer(m));
                    window.nearestStopsMarkers = [];
                }
            }
        };
        mapDiv.appendChild(btn);
    }
    // --- Reset ---
    if (!document.getElementById('resetMapBtn')) {
        const btn = document.createElement('button');
        btn.id = 'resetMapBtn';
        btn.className = 'btn btn-primary rounded-5 btn-sm position-absolute';
        btn.style.top = '118px';
        btn.style.right = '12px';
        btn.style.zIndex = 1000;
        btn.innerHTML = '<iconify-icon icon="mdi:refresh" inline></iconify-icon>';
        btn.onclick = function() {
            if (typeof selectedRouteId !== 'undefined') selectedRouteId = null;
            window.selectedRouteIdForUser = null;
            window.selectedCurrentStopForUser = null;
            saveActiveRouteId(null);
            if (window.nearestStopMarker) { map.removeLayer(window.nearestStopMarker); window.nearestStopMarker = null; }
            if (window.userToStopLine) { map.removeLayer(window.userToStopLine); window.userToStopLine = null; }
            if (window.nearestStopsMarkers) { window.nearestStopsMarkers.forEach(m => map.removeLayer(m)); window.nearestStopsMarkers = []; }
            // Hapus marker hasil pencarian jika ada
            if (window.searchResultMarker) { map.removeLayer(window.searchResultMarker); window.searchResultMarker = null; }
            if (polylineLayers && polylineLayers.length) {
                polylineLayers.forEach(pl => map.removeLayer(pl));
                polylineLayers = [];
            }
            // Hapus semua polyline multi shape jika ada
            if (window._multiPolylineLayers) {
                window._multiPolylineLayers.forEach(pl => map.removeLayer(pl));
                window._multiPolylineLayers = [];
            }
            // Hapus semua marker halte
            if (markersLayer) { map.removeLayer(markersLayer); markersLayer = null; }
            renderRoutes();
            showStopsByRoute(null, null);
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
        };
        mapDiv.appendChild(btn);
    }
    // --- Halte Terdekat ---
    if (!document.getElementById('nearestStopsBtn')) {
        const btn = document.createElement('button');
        btn.id = 'nearestStopsBtn';
        btn.className = 'btn btn-primary rounded-5 btn-sm position-absolute';
        btn.style.top = '214px';
        btn.style.right = '12px';
        btn.style.zIndex = 1000;
        btn.innerHTML = '<iconify-icon icon="mdi:map-marker-radius-outline" inline></iconify-icon>';
        btn.onclick = function() {
            if (window.nearestStopsMarkers && window.nearestStopsMarkers.length > 0) {
                window.nearestStopsMarkers.forEach(m => map.removeLayer(m));
                window.nearestStopsMarkers = [];
            } else {
                if (window.userMarker) {
                    const latlng = window.userMarker.getLatLng();
                    showMultipleNearestStops(latlng.lat, latlng.lng, 6);
                } else {
                    alert('Aktifkan live location terlebih dahulu!');
                }
            }
        };
        // Sembunyikan tombol ini secara default, hanya tampil saat live location aktif
        btn.style.display = 'none';
        mapDiv.appendChild(btn);
    }
    // --- Radius (di bawah reset, dalam map) ---
    if (!document.getElementById('radiusHalteBtnMap')) {
        const btn = document.createElement('button');
        btn.id = 'radiusHalteBtnMap';
        btn.className = 'btn btn-primary rounded-5 btn-sm position-absolute';
        btn.style.top = '166px';
        btn.style.right = '12px';
        btn.style.zIndex = 1000;
        btn.innerHTML = '<iconify-icon icon="mdi:map-marker-radius" inline></iconify-icon> <span class="d-none d-md-inline">Sembunyikan Halte Radius</span>';
        btn.onclick = function() {
            if (!window.radiusHalteActive) {
                const center = map.getCenter();
                showHalteRadius(center.lat, center.lng, 300);
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-warning');
                btn.innerHTML = '<iconify-icon icon="mdi:map-marker-radius" inline></iconify-icon> <span class="d-none d-md-inline">Sembunyikan Halte Radius</span>';
                window.radiusHalteActive = true;
            } else {
                removeHalteRadiusMarkers();
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-primary');
                btn.innerHTML = '<iconify-icon icon="mdi:map-marker-radius" inline></iconify-icon> <span class="d-none d-md-inline">Tampilkan Halte Radius</span>';
                window.radiusHalteActive = false;
            }
        };
        document.getElementById('map').appendChild(btn);
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
                        return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;cursor:pointer;font-weight:bold;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                    }
                    return '';
                }).join('');
            }
            let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
            // Label tipe halte
            let labelTipe = '';
            if (stop.stop_id && stop.stop_id.startsWith('B')) {
                labelTipe = `<div class="plus-jakarta-sans" style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
            } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
                labelTipe = `<div class='plus-jakarta-sans text-muted' style='font-size:0.97em;'>Platform: ${stop.platform_code}</div>`;
            } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
                labelTipe = `<div class="plus-jakarta-sans" style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
            }
            let layananInfoPlus = layananInfo ? layananInfo.replace('mt-2 plus-jakarta-sans', 'mt-2 plus-jakarta-sans') : '';
            let popupContent = `
                <b class='plus-jakarta-sans'>${stop.stop_name}</b><br>
                <span class='plus-jakarta-sans text-muted'>(${stop.stop_id})</span>
                ${labelTipe}
                ${layananInfoPlus}
            `;
            const marker = L.marker([lat, lon], {
                icon: L.icon({
                    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [18, 30],
                    iconAnchor: [9, 30],
                    popupAnchor: [1, -24]
                })
            }).bindPopup(popupContent);
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
                            saveActiveRouteId(selectedRouteId);
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
        saveActiveRouteId(selectedRouteId);
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
        if (title) title.textContent = 'Informasi layanan akan tampil di sini setelah anda memilihnya.';
        if (directionTabs) directionTabs.innerHTML = '';
        if (markersLayer) { map.removeLayer(markersLayer); markersLayer = null; }
        if (polylineLayer) { map.removeLayer(polylineLayer); polylineLayer = null; }
    }
}

function showStopsByRoute(route_id, routeObj, highlightStopId) {
    // Jika reset (route_id null), kosongkan UI tanpa pesan error
    if (!route_id) {
        const ul = document.getElementById('stopsByRoute');
        const title = document.getElementById('stopsTitle');
        const directionTabs = document.getElementById('directionTabs');
        if (ul) ul.innerHTML = '';
        if (title) title.textContent = '';
        if (directionTabs) directionTabs.innerHTML = '';
        // Hapus dropdown varian jika ada
        let old = document.getElementById('routeVariantDropdown');
        if (old) {
            old.previousSibling && old.previousSibling.remove();
            old.remove();
        }
        return;
    }
    // Reset dropdown varian ke Default jika ganti koridor
    if (window.lastRouteId !== route_id) {
        window.selectedRouteVariant = null;
        window.lastRouteId = route_id;
    }
    const ul = document.getElementById('stopsByRoute');
    const title = document.getElementById('stopsTitle');
    const directionTabs = document.getElementById('directionTabs');
    ul.innerHTML = '';
    directionTabs.innerHTML = '';
    // --- Tambahan: Dropdown varian trip jika ada ---
    // Ambil semua trip untuk rute ini
    const tripsForRoute = trips.filter(t => t.route_id === route_id);
    // Deteksi varian dari trip_id, misal 12-L01, 12-R01, dst
    const variantRegex = /^(.*?)-(\w+)$/;
    // Buat map varian -> trip utama (untuk label jurusan)
    let variantInfo = {};
    tripsForRoute.forEach(t => {
        const m = t.trip_id.match(variantRegex);
        if (m) {
            const varKey = m[2];
            // Pilih trip pertama untuk varian ini
            if (!variantInfo[varKey]) variantInfo[varKey] = t;
        }
    });
    let variants = Object.keys(variantInfo);
    // Dropdown hanya jika varian > 1
    let variantDropdown = null;
    if (variants.length > 1) {
        // Tambahkan label judul di atas dropdown
        let label = document.createElement('label');
        label.textContent = 'Pilih Varian Trayek:';
        label.setAttribute('for', 'routeVariantDropdown');
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '4px';
        label.style.display = 'block';
        // Ambil default varian dari localStorage jika ada
        let localVarKey = 'selectedRouteVariant_' + route_id;
        let localVar = localStorage.getItem(localVarKey);
        if (localVar && !window.selectedRouteVariant) {
            window.selectedRouteVariant = localVar;
        }
        // Dropdown dengan style lebih menarik
        variantDropdown = document.createElement('select');
        variantDropdown.className = 'form-select form-select-lg shadow-sm border-primary mb-3 plus-jakarta-sans';
        variantDropdown.style.maxWidth = '340px';
        variantDropdown.style.display = 'inline-block';
        variantDropdown.style.fontSize = '1.1em';
        variantDropdown.style.fontWeight = '500';
        variantDropdown.style.padding = '0.7em 1.2em';
        variantDropdown.style.marginBottom = '10px';
        // Opsi default
        let defaultLabel = 'Default (Semua Varian)';
        variantDropdown.innerHTML = `<option value="">${defaultLabel}</option>` +
            variants.map(v => {
                let trip = variantInfo[v];
                let jurusan = trip.trip_headsign || trip.trip_long_name || '';
                let label = v + (jurusan ? ' - ' + jurusan : '');
                return `<option value="${v}" ${window.selectedRouteVariant===v?'selected':''}>${label}</option>`;
            }).join('');
        variantDropdown.onchange = function() {
            window.selectedRouteVariant = this.value || null;
            // Simpan ke localStorage
            localStorage.setItem(localVarKey, window.selectedRouteVariant || '');
            showStopsByRoute(route_id, routeObj);
        };
        // Sisipkan label dan dropdown sebelum ul
        if (ul.parentNode && !document.getElementById('routeVariantDropdown')) {
            variantDropdown.id = 'routeVariantDropdown';
            ul.parentNode.insertBefore(label, ul);
            ul.parentNode.insertBefore(variantDropdown, ul);
        } else if (document.getElementById('routeVariantDropdown')) {
            // Update jika sudah ada
            let old = document.getElementById('routeVariantDropdown');
            old.previousSibling && old.previousSibling.remove(); // remove old label
            old.replaceWith(variantDropdown);
            variantDropdown.id = 'routeVariantDropdown';
            ul.parentNode.insertBefore(label, variantDropdown);
        }
    } else {
        // Hapus dropdown jika tidak ada varian atau hanya satu varian
        let old = document.getElementById('routeVariantDropdown');
        if (old) {
            old.previousSibling && old.previousSibling.remove(); // remove label
            old.remove();
        }
        window.selectedRouteVariant = null;
    }
    // --- END Tambahan dropdown varian ---
    if (routeObj) {
        let minHeadway = null;
        let badgeText = routeObj.route_short_name || routeObj.route_id || '';
        let badgeColor = routeObj.route_color ? ('#' + routeObj.route_color) : '#264697';
        // Gunakan class badge-koridor-interaktif agar konsisten
        let badge = `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;font-weight:bold;'>${badgeText}</span>`;
        let subjudul = routeObj.route_long_name ? `<span class='fw-bold' style='font-size:1.2em;'>${routeObj.route_long_name}</span>` : '';
        // Cari tarif dari fare_rules dan fare_attributes
        let fareRule = null;
        if (window.fare_rules && window.fare_attributes) {
            fareRule = window.fare_rules.find(fr => fr.route_id === routeObj.route_id);
        }
        let fareInfo = '';
        if (fareRule) {
            const fareAttr = window.fare_attributes.find(fa => fa.fare_id === fareRule.fare_id);
            if (fareAttr) {
                let price = parseInt(fareAttr.price).toLocaleString('id-ID');
                let currency = fareAttr.currency_type === 'IDR' ? 'Rp' : (fareAttr.currency_type + ' ');
                fareInfo = `<div class='mt-1 plus-jakarta-sans'><b>Tarif:</b> ${currency}${price}</div>`;
            }
        }
        // Info tipe layanan dari route_desc
        let tipeLayananInfo = '';
        if (routeObj.route_desc) {
            tipeLayananInfo = `<div class='mt-1 plus-jakarta-sans fw-bold text-success'>${routeObj.route_desc}</div>`;
        }
        // --- Tambahan: Jam Operasi ---
        let jamOperasiInfo = '';
        let tripIds, freqsForRoute, startTimes, endTimes;
        // Filter tripsForRoute sesuai varian jika ada
        let filteredTrips = tripsForRoute;
        if (window.selectedRouteVariant) {
            filteredTrips = tripsForRoute.filter(t => {
                const m = t.trip_id.match(variantRegex);
                return m && m[2] === window.selectedRouteVariant;
            });
        }
        tripIds = filteredTrips.map(t => t.trip_id);
        freqsForRoute = frequencies.filter(f => tripIds.includes(f.trip_id));
        startTimes = [], endTimes = [];
        if (freqsForRoute.length > 0) {
            freqsForRoute.forEach(f => {
                if (f.start_time && f.end_time) {
                    startTimes.push(f.start_time);
                    endTimes.push(f.end_time);
                }
            });
        }
        // Jika tidak ada di frequencies, fallback ke stop_times
        if (startTimes.length === 0 || endTimes.length === 0) {
            let stopTimesForRoute = stop_times.filter(st => tripIds.includes(st.trip_id));
            if (stopTimesForRoute.length > 0) {
                startTimes = stopTimesForRoute.map(st => st.arrival_time).filter(Boolean);
                endTimes = stopTimesForRoute.map(st => st.departure_time).filter(Boolean);
            }
        }
        // Ambil waktu paling awal dan paling akhir
        function toSec(t) {
            if (!t) return null;
            const [h, m, s] = t.split(':').map(Number);
            return h * 3600 + m * 60 + s;
        }
        let minStart = null, maxEnd = null;
        if (startTimes.length > 0) {
            minStart = startTimes.reduce((a, b) => (toSec(a) < toSec(b) ? a : b));
        }
        if (endTimes.length > 0) {
            maxEnd = endTimes.reduce((a, b) => (toSec(a) > toSec(b) ? a : b));
        }
        if (minStart && maxEnd) {
            function formatTime(t) {
                if (!t) return '';
                const [h, m] = t.split(':');
                return `${h}:${m}`;
            }
            function formatJamOperasi(start, end) {
                // Konversi ke detik
                const [sh, sm] = start.split(':').map(Number);
                const [eh, em] = end.split(':').map(Number);
                // Jika end >= 24:00
                if (eh >= 24) {
                    // Jika start 05:00 dan end 29:00, tampilkan 24 jam (05:00)
                    if (sh === 5 && sm === 0 && eh === 29 && em === 0) {
                        return '24 jam (05:00)';
                    }
                    // Jika start 00:00 dan end 24:00/23:59, tampilkan 24 jam
                    if (sh === 0 && sm === 0 && (eh === 24 || (eh === 23 && em === 59))) {
                        return '24 jam';
                    }
                    // Untuk kasus lain, tampilkan HH:MM - HH:MM (+1)
                    let endH = eh - 24;
                    let endStr = `${String(endH).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
                    return `${formatTime(start)} - ${endStr} (+1)`;
                }
                return `${formatTime(start)} - ${formatTime(end)}`;
            }
            // --- Tambahan: estimasi headway (frekuensi bus) ---
            let headwayInfo = '';
            if (freqsForRoute.length > 0) {
                // Ambil waktu saat ini (dalam detik sejak 00:00)
                const now = new Date();
                let nowH = now.getHours();
                let nowM = now.getMinutes();
                // Jika jam < 5 dan ada layanan malam, tambahkan 24 jam (GTFS style)
                let nowSec = nowH * 3600 + nowM * 60;
                // Cek apakah ada slot malam (misal 22:00-29:00)
                let freqNow = freqsForRoute.filter(f => {
                    let [sh, sm] = f.start_time.split(':').map(Number);
                    let [eh, em] = f.end_time.split(':').map(Number);
                    let startSec = sh * 3600 + sm * 60;
                    let endSec = eh * 3600 + em * 60;
                    // Jika end jam >= 24, dan now jam < 12, tambahkan 24 jam ke nowSec
                    let adjNowSec = nowSec;
                    if (eh >= 24 && nowH < 12) adjNowSec += 24 * 3600;
                    return adjNowSec >= startSec && adjNowSec <= endSec;
                });
                if (freqNow.length > 0) {
                    // Ambil headway terkecil (paling sering)
                    minHeadway = Math.min(...freqNow.map(f => parseInt(f.headway_secs)));
                    let minHeadwayMin = Math.round(minHeadway / 60);
                    headwayInfo = `<div class='mt-1 plus-jakarta-sans'><b>Frekuensi:</b> Setiap ${minHeadwayMin} menit</div>`;
                }
            }
            // --- END Tambahan headway ---
            jamOperasiInfo = `<div class='mt-1 plus-jakarta-sans'><b>Jam Operasi:</b> ${formatJamOperasi(minStart, maxEnd)}</div>${headwayInfo}`;
        }
        // --- END Tambahan jam operasi ---
        // --- Hari Operasi (penjelasan service_id) ---
        let serviceIds = Array.from(new Set(filteredTrips.map(t => t.service_id)));
        const serviceIdMap = {
            'SH': 'Setiap Hari',
            'HK': 'Hari Kerja',
            'HL': 'Hari Libur',
            'HM': 'Hanya Minggu',
            'X': 'Khusus',
        };
        let hariOperasiInfo = '';
        if (serviceIds.length > 0) {
            hariOperasiInfo = `<div class='mt-1 plus-jakarta-sans fw-normal' style='font-size:1em;'>${serviceIds.map(sid => serviceIdMap[sid] || sid).join(' / ')}</div>`;
        }
        // --- END Hari Operasi ---
        // --- Tarif dan Jam Operasi dalam satu baris ---
        let tarifJamOperasiInfo = '';
        if (fareInfo || jamOperasiInfo) {
            tarifJamOperasiInfo = `<div class='d-flex flex-wrap align-items-center gap-3 mt-2'>${fareInfo ? `<span>${fareInfo.replace('mt-1 ', '')}</span>` : ''}${jamOperasiInfo ? `<span>${jamOperasiInfo.replace('mt-1 ', '')}</span>` : ''}</div>`;
        }
        // --- END Tarif dan Jam Operasi ---
        // --- Gabungkan ke title sesuai urutan UI baru dengan font dan icon berbeda ---
        // Pastikan Iconify sudah ada di HTML utama: <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
        // Badge
        badgeLabel = `<div class='mb-2' style='font-size:1.5em;font-weight:bold;'>${badge}</div>`;
        // Jurusan
        if (subjudul) {
            jurusanLabel = `<div class='mb-1' style='font-size:1.2em;font-weight:bold;'>${subjudul}</div>`;
        } else {
            jurusanLabel = `<div class='mb-1' style='font-size:1.2em;font-weight:bold;'>-</div>`;
        }
        // Tipe layanan (dari route_desc)
        let tipeLayananLabel = '';
        if (routeObj.route_desc) {
            tipeLayananLabel = `<div class='mb-1' style='color:#16a34a;font-weight:bold;'><iconify-icon icon="mdi:bus" inline></iconify-icon> ${routeObj.route_desc}</div>`;
        }
        // Hari operasi
        let serviceIdList = serviceIds && serviceIds.length > 0 ? serviceIds.join(', ') : '-';
        let infoTooltipHari = `Lihat data mentah calendar.txt untuk service_id: ${serviceIdList}`;
        let infoIconLinkHari = `<a href='gtfs-raw-viewer.html?file=calendar&service_id=${encodeURIComponent(serviceIdList)}&route_id=${encodeURIComponent(routeObj.route_id)}' target='_blank' title='${infoTooltipHari}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        if (hariOperasiInfo) {
            hariOperasiLabel = `<div class='mb-1 text-secondary' style='font-size:1em;'><iconify-icon icon=\"mdi:calendar\" inline></iconify-icon> <b>Hari Operasi:</b> ${hariOperasiInfo.replace('mt-1 plus-jakarta-sans fw-normal','').replace('style=\'font-size:1em;\'','').replace(/<div.*?>|<\/div>/g,'').trim()} ${infoIconLinkHari}</div>`;
        } else {
            hariOperasiLabel = `<div class='mb-1 text-secondary' style='font-size:1em;'><iconify-icon icon=\"mdi:calendar\" inline></iconify-icon> <b>Hari Operasi:</b> - ${infoIconLinkHari}</div>`;
        }
        // Jam Operasi
        let infoTooltipJam = `Lihat data mentah stop_times.txt untuk trip_id: ${tripIds && tripIds.length ? tripIds.join(',') : '-'}`;
        let infoIconLinkJam = `<a href='gtfs-raw-viewer.html?file=stop_times&trip_id=${encodeURIComponent(tripIds && tripIds.length ? tripIds.join(',') : '-')}' target='_blank' title='${infoTooltipJam}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        if (minStart && maxEnd) {
            jamOperasiLabel = `<div class='mb-1'><iconify-icon icon="mdi:clock-outline" inline></iconify-icon> <b>Jam Operasi:</b> ${formatJamOperasi(minStart, maxEnd)} ${infoIconLinkJam}</div>`;
        } else {
            jamOperasiLabel = `<div class='mb-1'><iconify-icon icon="mdi:clock-outline" inline></iconify-icon> <b>Jam Operasi:</b> - ${infoIconLinkJam}</div>`;
        }
        // Headway/Frekuensi
        let infoTooltipFreq = `Lihat data mentah frequencies.txt untuk trip_id: ${tripIds && tripIds.length ? tripIds.join(',') : '-'}`;
        let infoIconLinkFreq = `<a href='gtfs-raw-viewer.html?file=frequencies&trip_id=${encodeURIComponent(tripIds && tripIds.length ? tripIds.join(',') : '-')}' target='_blank' title='${infoTooltipFreq}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        if (freqsForRoute.length > 0) {
            // Ambil semua nilai headway (min, max, headway_secs), konversi ke menit, urutkan, dan ambil unik
            let headwaySeconds = [];
            freqsForRoute.forEach(f => {
                if (f.min_headway_secs) headwaySeconds.push(parseInt(f.min_headway_secs));
                if (f.max_headway_secs) headwaySeconds.push(parseInt(f.max_headway_secs));
                if (f.headway_secs) headwaySeconds.push(parseInt(f.headway_secs));
            });
            let headwayMinutes = headwaySeconds
                .filter(v => !isNaN(v))
                .map(v => Math.round(v/60))
                .filter((v, i, arr) => arr.indexOf(v) === i) // unik
                .sort((a, b) => a - b);
            let headwayText = headwayMinutes.length > 0 ? headwayMinutes.map(v => `${v} menit`).join(', ') : '-';
            headwayLabel = `<div class='mb-1'><iconify-icon icon="mdi:repeat" inline></iconify-icon> <b>Frekuensi:</b> ${headwayText} ${infoIconLinkFreq}</div>`;
        } else {
            headwayLabel = `<div class='mb-1'><iconify-icon icon="mdi:repeat" inline></iconify-icon> <b>Frekuensi:</b> - ${infoIconLinkFreq}</div>`;
        }
        // Tarif
        let fareId = '';
        if (fareRule) fareId = fareRule.fare_id;
        let infoTooltipTarif = `Lihat data mentah fare_attributes.txt untuk fare_id: ${fareId}`;
        let infoIconLinkTarif = `<a href='gtfs-raw-viewer.html?file=fare_attributes&fare_id=${encodeURIComponent(fareId)}&route_id=${encodeURIComponent(routeObj.route_id)}&show_rules=1' target='_blank' title='${infoTooltipTarif}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        if (fareInfo) {
            tarifLabel = `<div class='mb-1'><iconify-icon icon="mdi:ticket-percent" inline></iconify-icon> <b>Tarif:</b> ${fareInfo.replace('<div class=\'mt-1 plus-jakarta-sans\'><b>Tarif:</b> ','').replace('</div>','')} ${infoIconLinkTarif}</div>`;
        } else {
            tarifLabel = `<div class='mb-1'><iconify-icon icon="mdi:ticket-percent" inline></iconify-icon> <b>Tarif:</b> - ${infoIconLinkTarif}</div>`;
        }
        // --- Panjang Trayek ---
        let panjangTrayekLabel = '';
        // Ambil shape_id utama dari trip pertama
        let mainShapeId = filteredTrips.length > 0 ? filteredTrips[0].shape_id : null;
        let totalLength = 0;
        if (mainShapeId) {
            const shapePoints = shapes.filter(s => s.shape_id === mainShapeId)
                .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));
            for (let i = 1; i < shapePoints.length; i++) {
                const lat1 = parseFloat(shapePoints[i-1].shape_pt_lat);
                const lon1 = parseFloat(shapePoints[i-1].shape_pt_lon);
                const lat2 = parseFloat(shapePoints[i].shape_pt_lat);
                const lon2 = parseFloat(shapePoints[i].shape_pt_lon);
                totalLength += haversine(lat1, lon1, lat2, lon2);
            }
        }
        if (totalLength > 0) {
            panjangTrayekLabel = `<div class='mb-1'><iconify-icon icon="mdi:ruler" inline style="color:#888;"></iconify-icon> <b>Panjang Trayek:</b> ${(totalLength/1000).toFixed(2)} km</div>`;
        }
        // Output mentah untuk semua file utama GTFS terkait rute ini
        function makeRawBlock(label, headers, rows) {
            if (!rows || rows.length === 0) return '';
            return `<div class='text-muted' style='font-size:0.9em;margin-top:6px;'>Raw ${label}</div><pre style='background:#f8f9fa;border:1px solid #eee;padding:8px;font-size:0.95em;overflow-x:auto;margin-top:2px;'>${headers}\n${rows.map(row => Object.values(row).join(',')).join('\n')}</pre>`;
        }
        // routes.txt
        let rawRoutesRows = '';
        if (window.routes && window.routes.length > 0 && routeObj) {
            let headers = Object.keys(window.routes[0]).join(',');
            let rows = window.routes.filter(r => r.route_id === routeObj.route_id);
            rawRoutesRows = makeRawBlock('routes.txt', headers, rows);
        }
        // trips.txt
        let rawTripsRows = '';
        if (window.trips && window.trips.length > 0 && routeObj) {
            let headers = Object.keys(window.trips[0]).join(',');
            let rows = window.trips.filter(t => t.route_id === routeObj.route_id);
            rawTripsRows = makeRawBlock('trips.txt', headers, rows);
        }
        // calendar.txt
        let rawCalendarRows = '';
        if (window.calendar && serviceIds && serviceIds.length > 0) {
            let headers = Object.keys(window.calendar[0] || {}).join(',');
            let rows = window.calendar.filter(row => serviceIds.includes(row.service_id));
            rawCalendarRows = makeRawBlock('calendar.txt', headers, rows);
        }
        // frequencies.txt
        let rawFreqRows = '';
        if (window.frequencies && window.frequencies.length > 0 && tripsForRoute && tripsForRoute.length > 0) {
            let headers = Object.keys(window.frequencies[0]).join(',');
            let tripIds = tripsForRoute.map(t => t.trip_id);
            let rows = window.frequencies.filter(f => tripIds.includes(f.trip_id));
            rawFreqRows = makeRawBlock('frequencies.txt', headers, rows);
        }
        // fare_rules.txt
        let rawFareRulesRows = '';
        if (window.fare_rules && window.fare_rules.length > 0 && routeObj) {
            let headers = Object.keys(window.fare_rules[0]).join(',');
            let rows = window.fare_rules.filter(fr => fr.route_id === routeObj.route_id);
            rawFareRulesRows = makeRawBlock('fare_rules.txt', headers, rows);
        }
        // fare_attributes.txt
        let rawFareAttrRows = '';
        if (window.fare_attributes && window.fare_attributes.length > 0 && rawFareRulesRows) {
            let headers = Object.keys(window.fare_attributes[0]).join(',');
            // Ambil fare_id dari fare_rules yang cocok
            let fareIds = (window.fare_rules.filter(fr => fr.route_id === routeObj.route_id) || []).map(fr => fr.fare_id);
            let rows = window.fare_attributes.filter(fa => fareIds.includes(fa.fare_id));
            rawFareAttrRows = makeRawBlock('fare_attributes.txt', headers, rows);
        }
        // Gabungkan semua
        title.innerHTML = `
            ${badgeLabel}
            ${jurusanLabel}
            ${tipeLayananLabel}
            ${hariOperasiLabel}
            ${jamOperasiLabel}
            ${headwayLabel}
            ${tarifLabel}
            ${panjangTrayekLabel}
        `;
        title.className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
        title.style.color = '#264697';
        // --- Render daftar halte dan polyline ---
        let allStops = [];
        let polylineShapeIds = [];
        if (!window.selectedRouteVariant) {
            // Gabungkan semua halte dari semua trip (tanpa duplikat)
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
            allStops = Array.from(halteMap.values());
            // Gabungkan semua shape_id unik dari semua trip
            polylineShapeIds = Array.from(new Set(tripsForRoute.map(t => t.shape_id)));
        } else {
            // Hanya varian terpilih
            allStops = [];
            filteredTrips.forEach(trip => {
                const stopsForTrip = stop_times.filter(st => st.trip_id === trip.trip_id)
                    .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
                stopsForTrip.forEach(st => {
                    const stop = stops.find(s => s.stop_id === st.stop_id);
                    if (stop) allStops.push(stop);
                });
            });
            // Hanya shape_id dari filteredTrips
            polylineShapeIds = filteredTrips.map(t => t.shape_id).filter(Boolean);
        }
        // --- Render daftar halte ---
        if (allStops.length === 0) {
            if (window.selectedRouteVariant) {
                ul.innerHTML = '<li class="list-group-item">Data trip tidak ditemukan untuk varian ini</li>';
            } else if (tripsForRoute.length === 0) {
                ul.innerHTML = '<li class="list-group-item">Data trip tidak ditemukan</li>';
            } else {
                ul.innerHTML = '<li class="list-group-item">Tidak ada halte ditemukan</li>';
            }
            return;
        }
        ul.innerHTML = '';
        allStops.forEach((stop, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex flex-column bg-light align-items-start gap-1 py-3';
            // Nama halte dan icon lokasi dalam satu baris (inline)
            const halteRow = document.createElement('div');
            halteRow.style.display = 'flex';
            halteRow.style.flexDirection = 'row';
            halteRow.style.alignItems = 'center';
            // Nama halte
            const halteName = document.createElement('span');
            halteName.className = 'fw-bold';
            halteName.textContent = stop.stop_name;
            halteRow.appendChild(halteName);
            // Icon lokasi (link ke Google Maps) di kanan nama halte
            if (stop.stop_lat && stop.stop_lon) {
                const locLink = document.createElement('a');
                locLink.href = `https://www.google.com/maps/search/?api=1&query=${stop.stop_lat},${stop.stop_lon}`;
                locLink.target = '_blank';
                locLink.rel = 'noopener';
                locLink.style.marginLeft = '8px';
                locLink.title = 'Lihat di Google Maps';
                locLink.innerHTML = `<iconify-icon icon="mdi:map-marker" inline style="color:#d9534f;font-size:1.2em;vertical-align:middle;"></iconify-icon>`;
                halteRow.appendChild(locLink);
            }
            li.appendChild(halteRow);
            // Label tipe halte di bawah nama
            let labelTipe = '';
            if (stop.stop_id && stop.stop_id.startsWith('B')) {
                labelTipe = `<div style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
            } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
                labelTipe = `<div class='text-muted' style='font-size:0.97em;'>Platform: ${stop.platform_code}</div>`;
            } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
                labelTipe = `<div style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
            }
            if (labelTipe) {
                const labelDiv = document.createElement('div');
                labelDiv.innerHTML = labelTipe;
                li.appendChild(labelDiv);
            }
            if (stopToRoutes[stop.stop_id]) {
                const badgesDiv = document.createElement('div');
                Array.from(stopToRoutes[stop.stop_id]).forEach(rid => {
                    if (rid !== selectedRouteId) {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            const badgeEl = document.createElement('span');
                            badgeEl.className = 'badge badge-koridor-interaktif rounded-pill me-2';
                            badgeEl.style.background = badgeColor;
                            badgeEl.style.color = '#fff';
                            badgeEl.style.cursor = 'pointer';
                            badgeEl.style.fontWeight = 'bold';
                            badgeEl.textContent = route.route_short_name;
                            badgeEl.title = route.route_long_name;
                            badgeEl.onclick = (e) => {
                                e.stopPropagation();
                                selectedRouteId = route.route_id;
                                saveActiveRouteId(selectedRouteId);
                                renderRoutes();
                                showStopsByRoute(route.route_id, route);
                            };
                            badgesDiv.appendChild(badgeEl);
                        }
                    }
                });
                li.appendChild(badgesDiv);
            }
            li.onclick = function(e) {
                // Jika klik pada link, jangan jalankan event ini
                if (e.target.tagName === 'A') return;
                window.lastStopId = stop.stop_id;
                saveUserProgress();
            };
            if (highlightStopId && stop.stop_id === highlightStopId) {
                li.classList.add('bg-warning');
                setTimeout(() => { li.scrollIntoView({behavior:'smooth', block:'center'}); }, 200);
            }
            ul.appendChild(li);
        });
        // --- Render polyline di peta ---
        if (allStops.some(s => s.stop_lat && s.stop_lon)) {
            // Gabungkan semua polyline dari polylineShapeIds
            let allLatlngs = polylineShapeIds.map(shape_id => {
                return shapes.filter(s => s.shape_id === shape_id)
                    .sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence))
                    .map(s => [parseFloat(s.shape_pt_lat), parseFloat(s.shape_pt_lon)]);
            }).filter(arr => arr.length > 0);
            // showHalteOnMap menerima array halte dan shape_id utama (pakai shape_id pertama)
            // Untuk menampilkan semua polyline, modifikasi showHalteOnMap agar bisa menerima array shape_id (atau panggil polyline manual di sini jika perlu)
            // Untuk sekarang, tetap panggil showHalteOnMap dengan shape_id pertama (agar marker tetap muncul), lalu render polyline manual
            showHalteOnMap(allStops, polylineShapeIds[0]);
            // Render polyline tambahan jika lebih dari satu shape_id
            if (typeof map !== 'undefined' && typeof L !== 'undefined') {
                if (window._multiPolylineLayers) {
                    window._multiPolylineLayers.forEach(pl => map.removeLayer(pl));
                }
                window._multiPolylineLayers = [];
                allLatlngs.forEach((latlngs, idx) => {
                    if (latlngs.length > 0) {
                        let color = '#264697';
                        if (routeObj.route_color) color = '#' + routeObj.route_color;
                        let pl = L.polyline(latlngs, {color, weight: 4, opacity: 0.7}).addTo(map);
                        window._multiPolylineLayers.push(pl);
                    }
                });
            }
        }
    } else {
        title.textContent = 'Jalur Trayek';
        title.className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
        title.style.color = '#264697';
        // fallback: tampilkan semua trip
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
        li.className = 'list-group-item d-flex flex-column bg-light align-items-start gap-1 py-3';
        // Nama halte dan icon lokasi dalam satu baris (inline)
            const halteRow = document.createElement('div');
        halteRow.style.display = 'flex';
        halteRow.style.flexDirection = 'row';
        halteRow.style.alignItems = 'center';
        // Nama halte
        const halteName = document.createElement('span');
        halteName.className = 'fw-bold';
        halteName.textContent = stop.stop_name;
        halteRow.appendChild(halteName);
            // Icon lokasi (link ke Google Maps) di kanan nama halte
        if (stop.stop_lat && stop.stop_lon) {
            const locLink = document.createElement('a');
            locLink.href = `https://www.google.com/maps/search/?api=1&query=${stop.stop_lat},${stop.stop_lon}`;
            locLink.target = '_blank';
            locLink.rel = 'noopener';
            locLink.style.marginLeft = '8px';
            locLink.title = 'Lihat di Google Maps';
            locLink.innerHTML = `<iconify-icon icon="mdi:map-marker" inline style="color:#d9534f;font-size:1.2em;vertical-align:middle;"></iconify-icon>`;
            halteRow.appendChild(locLink);
        }
        li.appendChild(halteRow);
            // Label tipe halte di bawah nama
            let labelTipe = '';
            if (stop.stop_id && stop.stop_id.startsWith('B')) {
                labelTipe = `<div style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
            } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
                labelTipe = `<div class='text-muted' style='font-size:0.97em;'>Platform: ${stop.platform_code}</div>`;
            } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
                labelTipe = `<div style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
            }
            if (labelTipe) {
                const labelDiv = document.createElement('div');
                labelDiv.innerHTML = labelTipe;
                li.appendChild(labelDiv);
            }
        if (stopToRoutes[stop.stop_id]) {
            const badgesDiv = document.createElement('div');
            Array.from(stopToRoutes[stop.stop_id]).forEach(rid => {
                if (rid !== selectedRouteId) {
                    const route = routes.find(r => r.route_id === rid);
                    if (route) {
                        let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                        const badgeEl = document.createElement('span');
                        badgeEl.className = 'badge badge-koridor-interaktif rounded-pill me-2';
                        badgeEl.style.background = badgeColor;
                        badgeEl.style.color = '#fff';
                        badgeEl.style.cursor = 'pointer';
                        badgeEl.style.fontWeight = 'bold';
                        badgeEl.textContent = route.route_short_name;
                        badgeEl.title = route.route_long_name;
                        badgeEl.onclick = (e) => {
                            e.stopPropagation();
                            selectedRouteId = route.route_id;
                            saveActiveRouteId(selectedRouteId);
                            renderRoutes();
                            showStopsByRoute(route.route_id, route);
                        };
                        badgesDiv.appendChild(badgeEl);
                    }
                }
            });
            li.appendChild(badgesDiv);
        }
        li.onclick = function(e) {
            // Jika klik pada link, jangan jalankan event ini
            if (e.target.tagName === 'A') return;
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
                    li.innerHTML = `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;font-weight:bold;padding-left:1.1em;padding-right:1.1em;padding-top:0.35em;padding-bottom:0.35em;'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
                    li.style.cursor = 'pointer';
                    li.onclick = function() {
                        selectedRouteId = route.route_id;
                        saveActiveRouteId(selectedRouteId);
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
                li.innerHTML = `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;font-weight:bold;padding-left:1.1em;padding-right:1.1em;padding-top:0.35em;padding-bottom:0.35em;'>${route.route_short_name}</span> <span>${route.route_long_name}</span>`;
                li.style.cursor = 'pointer';
                li.onclick = function() {
                    selectedRouteId = route.route_id;
                    saveActiveRouteId(selectedRouteId);
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
                            return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;font-weight:bold;padding-left:1.1em;padding-right:1.1em;padding-top:0.35em;padding-bottom:0.35em;'>${route.route_short_name}</span>`;
                        }
                        return '';
                    }).join('');
                    li.innerHTML += `<div class='mt-1'>${badges}</div>`;
                }
                li.onclick = function() {
                    if (stop.stop_lat && stop.stop_lon) {
                        // Hapus marker hasil pencarian sebelumnya
                        if (window.searchResultMarker) { map.removeLayer(window.searchResultMarker); window.searchResultMarker = null; }
                        map.setView([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], 17);
                        // Tambahkan marker hasil pencarian
                        window.searchResultMarker = L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], {
                            icon: L.icon({
                                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                                iconSize: [18, 30],
                                iconAnchor: [9, 30],
                                popupAnchor: [1, -24]
                            })
                        }).addTo(map).bindPopup(stop.stop_name).openPopup();
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
                let badgeFontSize = '1em'; // Hapus font-size dinamis
                return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;cursor:pointer;font-weight:bold;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
            }
            return '';
        }).join('');
    }
    let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
    let popupContent = `<b class='plus-jakarta-sans'>${stop.stop_name}</b><br><span class='plus-jakarta-sans'>Jarak: ${distance < 1000 ? Math.round(distance) + ' m' : (distance/1000).toFixed(2) + ' km'}</span>${layananInfo}`;
    // Pada marker halte (marker-icon.png)
    nearestStopMarker = L.marker([stopLat, stopLon], {
        icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png', // biru
            iconSize: [18, 30],
            iconAnchor: [9, 30],
            popupAnchor: [1, -24]
        })
    }).addTo(map).bindPopup(popupContent).openPopup();
    // Pada showNearestStopFromUser, simpan stopData di marker
    nearestStopMarker.stopData = stop;
    map.setView([stopLat, stopLon], 17, { animate: true });
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
                    saveActiveRouteId(selectedRouteId);
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
    let prevStop = null;
    let minSeq = Infinity;
    let tripUsed = null;
    let stopTimes = [];
    for (const trip of tripsForRoute) {
        const stTimes = stop_times.filter(st => st.trip_id === trip.trip_id)
            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        const idx = stTimes.findIndex(st => st.stop_id === currentStop.stop_id);
        if (idx !== -1) {
            if (idx < stTimes.length - 1) {
            const nextSt = stTimes[idx + 1];
            if (parseInt(nextSt.stop_sequence) < minSeq) {
                minSeq = parseInt(nextSt.stop_sequence);
                nextStop = stops.find(s => s.stop_id === nextSt.stop_id);
                    prevStop = idx > 0 ? stops.find(s => s.stop_id === stTimes[idx - 1].stop_id) : null;
                tripUsed = trip;
                stopTimes = stTimes;
            }
            } else if (idx > 0 && !nextStop) {
                prevStop = stops.find(s => s.stop_id === stTimes[idx - 1].stop_id);
                tripUsed = trip;
                stopTimes = stTimes;
            }
        }
    }
    let jarakNext = nextStop ? haversine(userLat, userLon, parseFloat(nextStop.stop_lat), parseFloat(nextStop.stop_lon)) : null;
    let arrivalMsg = '';
    // Tiba di halte jika <30m, lanjut ke halte berikutnya jika sudah menjauh >15m
    if (nextStop && jarakNext !== null && jarakNext < 30) {
        if (window.lastArrivedStopId !== nextStop.stop_id) {
            arrivalMsg = `<div style='color:green;font-weight:bold;margin-top:4px;'>Tiba di <u>${nextStop.stop_name}</u>!</div>`;
            window.lastArrivedStopId = nextStop.stop_id;
        }
    } else if (nextStop && jarakNext !== null && window.lastArrivedStopId === nextStop.stop_id) {
        if (jarakNext > 15) {
            window.lastArrivedStopId = null;
        }
    }
    let route = routes.find(r => r.route_id === routeId);
    let badgeColor = route && route.route_color ? ('#' + route.route_color) : '#264697';
    let badgeText = route && route.route_short_name ? route.route_short_name : routeId;
    let badgeLayanan = `<span class='badge badge-koridor-interaktif rounded-pill' style='background:${badgeColor};color:#fff;font-weight:bold;font-size:1.2em;padding:0.5em 1.1em;'>${badgeText}</span>`;
    // --- Halte Selanjutnya ---
    let nextStopTitle = nextStop ? `<div class='text-muted' style='font-size:0.95em;font-weight:600;margin-bottom:2px;'>Halte Selanjutnya</div>` : '';
    let nextStopName = nextStop ? `<div style='font-size:1.1em;font-weight:bold;'>${nextStop.stop_name}</div>` : '';
    let labelTipeNext = '';
    if (nextStop) {
        const nameLower = nextStop.stop_name ? nextStop.stop_name.toLowerCase() : '';
        if (nextStop.stop_id && nextStop.stop_id.startsWith('B') && !nameLower.includes('pengumpan')) {
            labelTipeNext = `<div style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
        } else if (nextStop.stop_id && nextStop.stop_id.startsWith('G') && nextStop.platform_code && !nameLower.includes('platform')) {
            labelTipeNext = `<div class='text-muted' style='font-size:0.97em;'>Platform: ${nextStop.platform_code}</div>`;
        } else if (nextStop.stop_id && (nextStop.stop_id.startsWith('E') || nextStop.stop_id.startsWith('H')) && !nameLower.includes('akses masuk')) {
            labelTipeNext = `<div style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
        }
    }
    // --- Layanan lain di halte selanjutnya ---
    let layananLainBadges = '';
    if (nextStop && stopToRoutes[nextStop.stop_id]) {
        layananLainBadges = Array.from(stopToRoutes[nextStop.stop_id])
            .filter(rid => rid !== routeId)
            .map(rid => {
                const r = routes.find(rt => rt.route_id === rid);
                if (r) {
                    let color = r.route_color ? ('#' + r.route_color) : '#6c757d';
                    return `<span class='badge badge-koridor-interaktif rounded-pill me-1' style='background:${color};color:#fff;cursor:pointer;font-weight:bold;font-size:0.95em;' data-routeid='${r.route_id}'>${r.route_short_name}</span>`;
                }
                return '';
            }).join('');
    }
    let layananLainBlock = layananLainBadges ? `<div style='margin-bottom:2px;'><b>Layanan lain:</b> ${layananLainBadges}</div>` : '';
    let jarakInfo = nextStop ? `<div style='margin-bottom:2px;'><b>Jarak:</b> ${jarakNext < 1000 ? Math.round(jarakNext) + ' m' : (jarakNext/1000).toFixed(2) + ' km'}</div>` : '';
    // --- Garis pemisah ---
    let hr = `<hr style='margin:6px 0 4px 0;border-top:1.5px solid #e5e7eb;'>`;
    // --- Halte Sebelumnya ---
    let prevStopBlock = '';
    if (prevStop) {
        prevStopBlock = `
            <div class='text-muted' style='font-size:0.95em;font-weight:600;margin-bottom:2px;color:#dc3545;'>Halte Sebelumnya</div>
            <div style='color:#dc3545;font-weight:bold;'>${prevStop.stop_name}</div>
        `;
    }
    let popupContent = `
        <div class='plus-jakarta-sans' style='min-width:180px;line-height:1.35;'>
            <div style='margin-bottom:4px;'>${badgeLayanan}</div>
            ${nextStopTitle}
            ${nextStopName}
            ${labelTipeNext}
            ${layananLainBlock}
            ${jarakInfo}
            ${hr}
            ${prevStopBlock}
            ${arrivalMsg}
        </div>
    `;
    if (window.userMarker) {
        window.userMarker.bindPopup(popupContent).openPopup();
        setTimeout(() => {
            const popupEl = window.userMarker.getPopup().getElement();
            if (!popupEl) return;
            popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                badge.onclick = function(e) {
                    e.stopPropagation();
                    const newRouteId = this.getAttribute('data-routeid');
                    if (newRouteId && newRouteId !== routeId) {
                        window.selectedRouteIdForUser = newRouteId;
                        window.selectedCurrentStopForUser = nextStop;
                        showUserRouteInfo(userLat, userLon, nextStop, newRouteId);
                        const newRoute = routes.find(r => r.route_id === newRouteId);
                        if (newRoute) {
                            selectedRouteId = newRouteId;
                            saveActiveRouteId(selectedRouteId);
                            renderRoutes();
                            showStopsByRoute(newRouteId, newRoute);
                        }
                    }
                };
            });
        }, 100);
    }
}

// Patch: update info marker user setiap update posisi jika sudah pilih layanan
// Ganti patching: deklarasikan enableLiveLocation sebagai function agar hoisted
function enableLiveLocation(onError) {
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung di browser ini.');
        if (onError) onError();
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
                        iconSize: [28, 28],
                        iconAnchor: [14, 28],
                        popupAnchor: [1, -20]
                    })
                }).addTo(map);
            }
            if (!window.userCentered) {
                map.setView([lat, lon], 16);
                window.userCentered = true;
            }
            if (window.nearestStopMarker && window.nearestStopMarker._popup && window.nearestStopMarker.stopData) {
                const stop = window.nearestStopMarker.stopData;
                const distance = haversine(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
                let koridorBadges = '';
                if (stopToRoutes[stop.stop_id]) {
                    koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;cursor:pointer;font-weight:bold;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
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
                        // Arrival jika <30m, pindah ke halte berikutnya jika sudah menjauh >20m
                        if (window.lastArrivedStopId === nextStop.stop_id) {
                            if (distToNext > 20) {
                                window.lastStopId = window.selectedCurrentStopForUser.stop_id;
                                window.selectedCurrentStopForUser = nextStop;
                            }
                        }
                    }
                }
                showUserRouteInfo(lat, lon, window.selectedCurrentStopForUser, window.selectedRouteIdForUser);
            }
        },
        err => {
            alert('Gagal mendapatkan lokasi: ' + err.message);
            setLiveBtnState(false);
            if (onError) onError();
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
window.nearestStopsMarkers = [];
function showMultipleNearestStops(userLat, userLon, maxStops = 6) {
    // Hapus marker halte terdekat sebelumnya
    window.nearestStopsMarkers.forEach(m => map.removeLayer(m));
    window.nearestStopsMarkers = [];
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
                    let badgeFontSize = '1em'; // Hapus font-size dinamis
                    return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;cursor:pointer;font-weight:bold;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                }
                return '';
            }).join('');
        }
        let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
        // Label tipe halte
        let labelTipe = '';
        if (stop.stop_id && stop.stop_id.startsWith('B')) {
            labelTipe = `<div style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
        } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
            labelTipe = `<div class='text-muted' style='font-size:0.97em;'>Platform: ${stop.platform_code}</div>`;
        } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
            labelTipe = `<div style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
        }
        let popupContent = `
            <b class='plus-jakarta-sans'>${stop.stop_name}</b><br>
            <span class='text-muted'>(${stop.stop_id})</span>
            ${labelTipe}
            ${layananInfo}
            <br><span class='plus-jakarta-sans text-primary'>Jarak ke Anda: ${stop.dist < 1000 ? Math.round(stop.dist) + ' m' : (stop.dist/1000).toFixed(2) + ' km'}</span>
        `;
        const marker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [18, 30],
                iconAnchor: [9, 30],
                popupAnchor: [1, -24]
            })
        }).addTo(map).bindPopup(`<div class='plus-jakarta-sans'>${popupContent}</div>`);
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
                        saveActiveRouteId(selectedRouteId);
                        renderRoutes();
                        showStopsByRoute(routeId, routes.find(r => r.route_id === routeId));
                    };
                });
            }, 50);
        });
        window.nearestStopsMarkers.push(marker);
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
            window.nearestStopsMarkers.forEach(m => map.removeLayer(m));
            window.nearestStopsMarkers = [];
        }
    });
    // Event tombol halte terdekat
    document.body.addEventListener('click', function(e) {
        const nearestBtn = document.getElementById('nearestStopsBtn');
        if (nearestBtn && e.target === nearestBtn) {
            if (window.userMarker) {
                const latlng = window.userMarker.getLatLng();
                showMultipleNearestStops(latlng.lat, latlng.lng, 6);
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
            saveActiveRouteId(null); // Hapus activeRouteId dari localStorage
            // Reset varian trayek dan hapus localStorage varian trayek
            window.selectedRouteVariant = null;
            window.lastRouteId = null;
            // Hapus localStorage varian trayek untuk semua koridor (opsional: hanya koridor terakhir)
            Object.keys(localStorage).forEach(k => { if (k.startsWith('selectedRouteVariant_')) localStorage.removeItem(k); });
            // Hapus marker halte terdekat, marker simulasi, dan polylineLayers (jalur trayek)
            if (window.nearestStopMarker) { map.removeLayer(window.nearestStopMarker); window.nearestStopMarker = null; }
            if (window.userToStopLine) { map.removeLayer(window.userToStopLine); window.userToStopLine = null; }
            window.nearestStopsMarkers.forEach(m => map.removeLayer(m));
            window.nearestStopsMarkers = [];
            // Hapus marker hasil pencarian jika ada
            if (window.searchResultMarker) { map.removeLayer(window.searchResultMarker); window.searchResultMarker = null; }
            if (polylineLayers && polylineLayers.length) {
                polylineLayers.forEach(pl => map.removeLayer(pl));
                polylineLayers = [];
            }
            // Hapus semua polyline multi shape jika ada
            if (window._multiPolylineLayers) {
                window._multiPolylineLayers.forEach(pl => map.removeLayer(pl));
                window._multiPolylineLayers = [];
            }
            // Hapus semua marker halte
            if (markersLayer) { map.removeLayer(markersLayer); markersLayer = null; }
            renderRoutes();
            showStopsByRoute(null, null);
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

// Tambahkan fitur tampilkan halte radius 300m dari center peta saat zoom cukup besar

let radiusHalteActive = false;
function showHalteRadius(centerLat, centerLon, radius = 300) {
    radiusHalteMarkers.forEach(m => map.removeLayer(m));
    radiusHalteMarkers = [];
    let markerToOpen = null;
    let markerToOpenStillExists = false;
    const nearbyStops = stops
  .filter(s => s.stop_lat && s.stop_lon && haversine(centerLat, centerLon, parseFloat(s.stop_lat), parseFloat(s.stop_lon)) <= radius)
  .filter(s => stopToRoutes[s.stop_id] && stopToRoutes[s.stop_id].size > 0); // hanya halte dengan layanan
    nearbyStops.forEach((stop, idx) => {
        // Info layanan (koridor) di popup
        let koridorBadges = '';
        if (stopToRoutes[stop.stop_id]) {
            koridorBadges = Array.from(stopToRoutes[stop.stop_id]).map(rid => {
                const route = routes.find(r => r.route_id === rid);
                if (route) {
                    let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                    return `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;cursor:pointer;font-weight:bold;' data-routeid='${route.route_id}'>${route.route_short_name}</span>`;
                }
                return '';
            }).join('');
        }
        let layananInfo = koridorBadges ? `<div class='mt-2 plus-jakarta-sans'>Layanan: ${koridorBadges}</div>` : '';
        const marker = L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], {
            icon: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [18, 30],
                iconAnchor: [9, 30],
                popupAnchor: [1, -24]
            })
        });
        // Tambahkan info jarak ke user jika userMarker aktif
        let jarakUser = '';
        if (window.userMarker) {
            const userLatLng = window.userMarker.getLatLng();
            const d = haversine(userLatLng.lat, userLatLng.lng, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
            jarakUser = `<br><span class='plus-jakarta-sans text-primary'>Jarak ke Anda: ${d < 1000 ? Math.round(d) + ' m' : (d/1000).toFixed(2) + ' km'}</span>`;
        }
        // Label tipe halte
        let labelTipe = '';
        if (stop.stop_id && stop.stop_id.startsWith('B')) {
            labelTipe = `<div style='font-size:0.97em;color:#facc15;font-weight:500;'>Pengumpan</div>`;
        } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
            labelTipe = `<div class='text-muted' style='font-size:0.97em;'>Platform: ${stop.platform_code}</div>`;
        } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
            labelTipe = `<div style='font-size:0.97em;color:#38bdf8;font-weight:500;'>Akses Masuk</div>`;
        }
        marker.bindPopup(
            `<div class='plus-jakarta-sans'>
                <b>${stop.stop_name}</b><br>
                <span class='text-muted'>(${stop.stop_id})</span>
                ${labelTipe}
                ${layananInfo}
                ${jarakUser}
            </div>`
        );
        marker.addTo(map);
        marker.on('popupopen', function() {
            lastRadiusPopupMarker = marker;
            lastRadiusPopupStopId = stop.stop_id;
            setTimeout(() => {
                const popupEl = marker.getPopup().getElement();
                if (!popupEl) return;
                popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                    badge.onclick = function(e) {
                        e.stopPropagation();
                        const routeId = this.getAttribute('data-routeid');
                        selectedRouteId = routeId;
                        saveActiveRouteId(selectedRouteId);
                        renderRoutes();
                        showStopsByRoute(routeId, routes.find(r => r.route_id === routeId));
                        map.closePopup();
                    };
                });
            }, 50);
        });
        marker.on('click', function() {
            if (marker._map) marker.openPopup();
            lastRadiusPopupMarker = marker;
            lastRadiusPopupStopId = stop.stop_id;
            map.panTo([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)]);
        });
        if (stop.stop_id === lastRadiusPopupStopId) {
            markerToOpen = marker;
            markerToOpenStillExists = true;
        }
        radiusHalteMarkers.push(marker);
    });
    // Jika marker popup sebelumnya sudah tidak ada di radius, tutup popup
    if (!markerToOpenStillExists && lastRadiusPopupMarker && map) {
        map.closePopup();
        lastRadiusPopupMarker = null;
        lastRadiusPopupStopId = null;
    }
    // Setelah semua marker dibuat, buka popup jika ada marker yang sama
    if (markerToOpen) {
        setTimeout(() => { if (markerToOpen._map) markerToOpen.openPopup(); }, 100);
    }
}
function removeHalteRadiusMarkers() {
    radiusHalteMarkers.forEach(m => map.removeLayer(m));
    radiusHalteMarkers = [];
    lastRadiusPopupMarker = null;
    lastRadiusPopupStopId = null;
}

// Tambahkan global untuk lastStopId
if (typeof window.lastStopId === 'undefined') window.lastStopId = null;

