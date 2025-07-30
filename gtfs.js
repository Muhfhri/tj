// Natural sort function for human-friendly sorting of route names
function naturalSort(a, b) {
    // Accepts either route objects or strings
    let ax = (typeof a === 'object' && a.route_short_name) ? a.route_short_name : a;
    let bx = (typeof b === 'object' && b.route_short_name) ? b.route_short_name : b;
    // fallback to route_id if short_name not present
    if (!ax && typeof a === 'object') ax = a.route_id;
    if (!bx && typeof b === 'object') bx = b.route_id;
    // Use Intl.Collator for numeric-aware sorting
    return ax.localeCompare(bx, undefined, { numeric: true, sensitivity: 'base' });
  }
  // Ambil data GTFS dari folder gtfs/ untuk bus stop dan shapes
  showLoadingProgress();
  updateLoadingProgress(10, 'Menyiapkan aplikasi...');
  
  Promise.all([
    fetch('gtfs/stops.txt').then(r => {
        updateLoadingProgress(25, 'Memuat data halte...');
        return r.text();
    }),
    fetch('gtfs/routes.txt').then(r => {
        updateLoadingProgress(40, 'Memuat data rute...');
        return r.text();
    }),
    fetch('gtfs/trips.txt').then(r => {
        updateLoadingProgress(55, 'Memuat data perjalanan...');
        return r.text();
    }),
    fetch('gtfs/stop_times.txt').then(r => {
        updateLoadingProgress(70, 'Memuat jadwal...');
        return r.text();
    }),
    fetch('gtfs/shapes.txt').then(r => {
        updateLoadingProgress(85, 'Memuat bentuk jalur...');
        return r.ok ? r.text() : '';
    }),
    fetch('gtfs/frequencies.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/fare_rules.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/fare_attributes.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/transfers.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/calendar.txt').then(r => r.ok ? r.text() : ''),
    fetch('gtfs/agency.txt').then(r => r.ok ? r.text() : ''),
  ]).then(([stopsTxt, routesTxt, tripsTxt, stopTimesTxt, shapesTxt, frequenciesTxt, fareRulesTxt, fareAttributesTxt, transfersTxt, calendarTxt, agencyTxt]) => {
    
    updateLoadingProgress(95, 'Menyiapkan peta...');
    
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
    
    updateLoadingProgress(100, 'Selesai!');
    
    // Hide progress immediately after everything is loaded
    hideLoadingProgress();
    
  }).catch(error => {
    console.error('Error loading GTFS data:', error);
    updateLoadingProgress(0, 'Error: Gagal memuat data');
    setTimeout(() => {
        hideLoadingProgress();
    }, 3000);
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
    // Tambahkan dropdown rute di atas map jika belum ada
    setTimeout(() => {
        if (!document.getElementById('mapRouteDropdown')) {
            const container = document.createElement('div');
            container.id = 'mapDropdownContainer';
            container.style.position = 'absolute';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.top = '10px';
            container.style.zIndex = 999;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            // Add the route dropdown (Layanan) on top
            const routeDropdown = document.createElement('select');
            routeDropdown.id = 'mapRouteDropdown';
            routeDropdown.className = 'form-select form-select-sm plus-jakarta-sans';
            routeDropdown.style.minWidth = '180px';
            routeDropdown.style.fontSize = '1em';
            routeDropdown.style.padding = '4px 8px';
            container.appendChild(routeDropdown);
            document.getElementById('map').appendChild(container);
        }
        // Isi dropdown dari data GTFS
        const dropdown = document.getElementById('mapRouteDropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
            // Sort routes naturally like outside dropdown
            const sortedRoutes = [...routes].sort(naturalSort);
            sortedRoutes.forEach(route => {
                const opt = document.createElement('option');
                opt.value = route.route_id;
                opt.textContent = (route.route_short_name ? route.route_short_name : route.route_id) + ' - ' + (route.route_long_name || '');
                dropdown.appendChild(opt);
            });
            dropdown.value = selectedRouteId || (sortedRoutes[0] && sortedRoutes[0].route_id) || '';
            dropdown.onchange = function() {
                selectedRouteId = dropdown.value;
                saveActiveRouteId(selectedRouteId);
                renderRoutes();
                showStopsByRoute(selectedRouteId, routes.find(r => r.route_id === selectedRouteId));
                // Sync other dropdowns if present
                const mainDropdown = document.getElementById('routesDropdown');
                if (mainDropdown) mainDropdown.value = selectedRouteId;
  
                // --- Tambahkan/Update dropdown varian trayek di map ---
                addOrUpdateMapVariantDropdown(selectedRouteId);
            };
        }
        // Helper: sync dropdown value if selectedRouteId changes elsewhere
        window.updateMapRouteDropdown = function(routeId) {
            const dropdown = document.getElementById('mapRouteDropdown');
            if (dropdown && dropdown.value !== routeId) {
                dropdown.value = routeId;
                // Sync varian trayek juga
                addOrUpdateMapVariantDropdown(routeId);
            }
        };
        // Tambahkan dropdown varian trayek saat init jika ada selectedRouteId
        addOrUpdateMapVariantDropdown(selectedRouteId || (routes[0] && routes[0].route_id));
  // Fungsi untuk menambah atau update dropdown varian trayek di map
  function addOrUpdateMapVariantDropdown(routeId) {
    // Hapus dropdown lama jika ada
    let old = document.getElementById('mapRouteVariantDropdown');
    if (old) old.remove();
    let oldLabel = document.getElementById('mapRouteVariantLabel');
    if (oldLabel) oldLabel.remove();
    // Cari trip untuk routeId
    const tripsForRoute = trips.filter(t => t.route_id === routeId);
    const variantRegex = /^(.*?)-(\w+)$/;
    let variantInfo = {};
    tripsForRoute.forEach(t => {
        const m = t.trip_id.match(variantRegex);
        if (m) {
            const varKey = m[2];
            if (!variantInfo[varKey]) variantInfo[varKey] = t;
        }
    });
    let variants = Object.keys(variantInfo);
    variants = variants.sort(naturalSort);
    // Remove old variant dropdown if any
    let oldDropdown = document.getElementById('mapRouteVariantDropdown');
    if (oldDropdown) oldDropdown.remove();
    // Only show if more than 1 variant
    if (variants.length > 1) {
        // Simple dropdown like route dropdown
        let variantDropdown = document.createElement('select');
        variantDropdown.id = 'mapRouteVariantDropdown';
        variantDropdown.className = 'form-select form-select-sm plus-jakarta-sans';
        variantDropdown.style.minWidth = '180px';
        variantDropdown.style.fontSize = '1em';
        variantDropdown.style.padding = '4px 8px';
        variantDropdown.style.marginTop = '8px';

        // Ambil default varian dari localStorage jika ada
        let localVarKey = 'selectedRouteVariant_' + routeId;
        let localVar = localStorage.getItem(localVarKey);
        if (localVar && !window.selectedRouteVariant) {
            window.selectedRouteVariant = localVar;
        }

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
            // Sync dengan dropdown di bagian daftar halte
            const stopsVariantDropdown = document.getElementById('stopsVariantDropdown');
            if (stopsVariantDropdown && stopsVariantDropdown.value !== this.value) {
                stopsVariantDropdown.value = this.value;
            }
            showStopsByRoute(routeId, routes.find(r => r.route_id === routeId));
        };

        // Insert into mapDropdownContainer
        const container = document.getElementById('mapDropdownContainer');
        if (container) {
            container.appendChild(variantDropdown);
        }
    } else {
        // Hapus dropdown jika tidak ada varian atau hanya satu varian
        let old = document.getElementById('mapRouteVariantDropdown');
        if (old) {
            old.remove();
        }
        // Hapus dropdown di bagian daftar halte juga
        let oldStops = document.getElementById('stopsVariantDropdown');
        if (oldStops) {
            oldStops.closest('.variant-selector-stops')?.remove();
        }
        window.selectedRouteVariant = null;
    }
  }
    }, 300);
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
    // Gunakan shape_id yang diberikan jika ada, jika tidak gunakan semua shape_id dari route
    let shapeIds = new Set();
    if (shape_id) {
        // Jika shape_id diberikan, gunakan hanya itu
        shapeIds.add(shape_id);
    } else {
        // Fallback: gunakan semua shape_id dari route (untuk kompatibilitas)
        let tripsForRoute = trips.filter(t => t.route_id === selectedRouteId);
    tripsForRoute.forEach(trip => { if (trip.shape_id) shapeIds.add(trip.shape_id); });
    }
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
                <div class='plus-jakarta-sans' style='min-width: 220px; font-family: "Plus Jakarta Sans", sans-serif;'>
                    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 14px; margin: -9px -15px 10px -15px; border-radius: 8px 8px 0 0;'>
                        <div style='font-size: 15px; font-weight: 700; margin-bottom: 3px; line-height: 1.3;'>${stop.stop_name}</div>
                        <div style='font-size: 11px; opacity: 0.9; display: flex; align-items: center;'>
                            <span style='margin-right: 6px;'>🆔</span>
                            <span>${stop.stop_id}</span>
                        </div>
                    </div>
                    
                    ${labelTipe ? `<div style='margin-bottom: 10px; padding: 6px 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #007bff;'>
                        <div style='font-size: 12px; font-weight: 600; color: #495057; display: flex; align-items: center;'>
                            <span style='margin-right: 6px;'>🚏</span>
                            ${labelTipe.replace(/<div[^>]*>|<\/div>/g, '')}
                        </div>
                    </div>` : ''}
                    
                    ${koridorBadges ? `<div style='margin-bottom: 10px;'>
                        <div style='font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 6px; display: flex; align-items: center;'>
                            <span style='margin-right: 6px;'>🚌</span>
                            <span>Layanan Tersedia</span>
                        </div>
                        <div style='display: flex; flex-wrap: wrap; gap: 4px;'>
                            ${koridorBadges}
                        </div>
                    </div>` : ''}
                </div>
            `;
            const marker = L.marker([lat, lon], {
                icon: L.icon({
                    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [18, 30],
                    iconAnchor: [9, 30],
                    popupAnchor: [1, -24]
                })
            }).bindPopup(popupContent, { className: 'custom-popup-transparent' });
            markersLayer.addLayer(marker);
            marker.on('popupopen', function() {
                setTimeout(() => {
                    const popupEl = marker.getPopup().getElement();
                    if (!popupEl) return;
                    popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                        badge.onclick = function(e) {
                            e.stopPropagation();
                            const routeId = this.getAttribute('data-routeid');
                            window.lastStopId = stop.stop_id;
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
    // Urutkan filteredRoutes secara natural
    const sortedRoutes = [...filteredRoutes].sort(naturalSort);
    sortedRoutes.forEach(route => {
        const opt = document.createElement('option');
        opt.value = route.route_id;
        // Format: tampilkan short_name dan long_name jika ada
        opt.textContent = (route.route_short_name ? route.route_short_name : route.route_id) + (route.route_long_name ? ' - ' + route.route_long_name : '');
        if (route.route_id === selectedRouteId) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = function() {
        const route = routes.find(r => r.route_id === select.value);
        selectedRouteId = select.value;
        saveActiveRouteId(selectedRouteId);
        // Sync map dropdown if present
        if (window.updateMapRouteDropdown) window.updateMapRouteDropdown(selectedRouteId);
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
        // Sync map dropdown if present
        if (window.updateMapRouteDropdown) window.updateMapRouteDropdown(selectedRouteId);
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
        // Hapus dropdown varian di bagian daftar halte juga
        let oldStops = document.getElementById('stopsVariantDropdown');
        if (oldStops) {
            oldStops.closest('.variant-selector-stops')?.remove();
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
    
    // Ambil semua trip untuk rute ini (dibutuhkan untuk filtering varian)
    const tripsForRoute = trips.filter(t => t.route_id === route_id);
    const variantRegex = /^(.*?)-(\w+)$/;
    
    if (routeObj) {
        let minHeadway = null;
        let badgeText = routeObj.route_short_name || routeObj.route_id || '';
        let badgeColor = routeObj.route_color ? ('#' + routeObj.route_color) : '#264697';
        // Gunakan class badge-koridor-interaktif agar konsisten
        let badge = `<span class='badge badge-koridor-interaktif rounded-pill me-2' style='background:${badgeColor};color:#fff;font-weight:bold;'>${badgeText}</span>`;
        let subjudul = routeObj.route_long_name ? `<span class='fw-bold' style='font-size:1.2em;'>${routeObj.route_long_name}</span>` : '';
        
        // --- Tambahan: Dropdown Varian Trayek di bagian daftar halte ---
        let variantDropdownHTML = '';
        let variantInfo = {};
        tripsForRoute.forEach(t => {
            const m = t.trip_id.match(variantRegex);
            if (m) {
                const varKey = m[2];
                if (!variantInfo[varKey]) variantInfo[varKey] = t;
            }
        });
        let variants = Object.keys(variantInfo).sort(naturalSort);
        
        if (variants.length > 1) {
            // Ambil default varian dari localStorage jika ada
            let localVarKey = 'selectedRouteVariant_' + route_id;
            let localVar = localStorage.getItem(localVarKey);
            if (localVar && !window.selectedRouteVariant) {
                window.selectedRouteVariant = localVar;
            }
            
            variantDropdownHTML = `
                <div class="variant-selector-stops">
                    <label class="form-label">
                        <iconify-icon icon="mdi:routes"></iconify-icon>
                        Pilih Varian Trayek
                    </label>
                    <select id="stopsVariantDropdown" class="form-select plus-jakarta-sans">
                        <option value="">Default (Semua Varian)</option>
                        ${variants.map(v => {
                            let trip = variantInfo[v];
                            let jurusan = trip.trip_headsign || trip.trip_long_name || '';
                            let label = v + (jurusan ? ' - ' + jurusan : '');
                            return `<option value="${v}" ${window.selectedRouteVariant===v?'selected':''}>${label}</option>`;
                        }).join('')}
                    </select>
                    <div class="help-text lurus">
                        <iconify-icon icon="mdi:information-outline"></iconify-icon>
                        Pilih varian untuk melihat arah spesifik
                    </div>
                </div>
            `;
            
            // Add event listener after DOM is updated
            setTimeout(() => {
                const stopsVariantDropdown = document.getElementById('stopsVariantDropdown');
                if (stopsVariantDropdown) {
                    stopsVariantDropdown.onchange = function() {
                        window.selectedRouteVariant = this.value || null;
                        localStorage.setItem(localVarKey, window.selectedRouteVariant || '');
                        // Sync dengan dropdown di map
                        const mapVariantDropdown = document.getElementById('mapRouteVariantDropdown');
                        if (mapVariantDropdown && mapVariantDropdown.value !== this.value) {
                            mapVariantDropdown.value = this.value;
                        }
                        // Refresh the stops display
                        showStopsByRoute(route_id, routeObj);
                    };
                }
            }, 10);
        }
        
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
            let desc = routeObj.route_desc;
            // Jika route_id diawali JAK., ganti Angkutan Umum Integrasi menjadi MikroTrans
            if (routeObj.route_id && routeObj.route_id.startsWith('JAK.') && desc.trim() === 'Angkutan Umum Integrasi') {
                desc = 'MikroTrans';
            }
            tipeLayananInfo = `<div class='mt-1 plus-jakarta-sans fw-bold text-success'>${desc}</div>`;
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
        // --- SUSUN ULANG INFORMASI LAYANAN ---
        
        // 1. BADGE LAYANAN (Route Badge)
        let badgeLabel = `<div class='mb-3 text-center'>
            <div class='route-badge-container'>
                ${badge}
                <div class='route-badge-subtitle'>Koridor TransJakarta</div>
            </div>
        </div>`;
        
        // 2. JURUSAN (Route Long Name)
        let jurusanLabel = '';
        if (subjudul) {
            jurusanLabel = `<div class='mb-3 text-center'>
                <h4 class='route-jurusan plus-jakarta-sans fw-bold'>${subjudul}</h4>
            </div>`;
        }
        
        // 3. JENIS LAYANAN (Service Type Badge)
        let jenisLayananLabel = '';
        if (routeObj.route_desc) {
            let serviceType = routeObj.route_desc;
            // Mapping untuk jenis layanan yang lebih user-friendly
            const serviceTypeMap = {
                'BRT': 'Bus Rapid Transit',
                'TransJakarta': 'Bus Rapid Transit',
                'Angkutan Umum Integrasi': 'Angkutan Umum Integrasi',
                'MikroTrans': 'MikroTrans',
                'Royal Trans': 'Royal Trans',
                'Bus Wisata': 'Bus Wisata'
            };
            let displayServiceType = serviceTypeMap[serviceType] || serviceType;
            
            // Warna badge berdasarkan jenis layanan
            let serviceBadgeClass = 'bg-primary';
            if (serviceType.includes('BRT') || serviceType.includes('TransJakarta')) {
                serviceBadgeClass = 'bg-primary';
            } else if (serviceType.includes('Angkutan Umum Integrasi')) {
                serviceBadgeClass = 'bg-success';
            } else if (serviceType.includes('Royal')) {
                serviceBadgeClass = 'bg-warning text-dark';
            } else if (serviceType.includes('Wisata')) {
                serviceBadgeClass = 'bg-info';
            }
            
            jenisLayananLabel = `<div class='mb-3 text-center'>
                <span class='badge ${serviceBadgeClass} fs-6 px-3 py-2 rounded-pill'>
                    <iconify-icon icon="mdi:bus" inline></iconify-icon>
                    ${displayServiceType}
                </span>
            </div>`;
        }
        
        // 4. HARI OPERASI (Operating Days)
        let hariOperasiLabel = '';
        let serviceIdList = serviceIds && serviceIds.length > 0 ? serviceIds.join(', ') : '-';
        let infoTooltipHari = `Lihat data mentah calendar.txt untuk service_id: ${serviceIdList}`;
        let infoIconLinkHari = `<a href='gtfs-raw-viewer.html?file=calendar&service_id=${encodeURIComponent(serviceIdList)}&route_id=${encodeURIComponent(routeObj.route_id)}' target='_blank' title='${infoTooltipHari}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        
        if (hariOperasiInfo) {
            let hariText = hariOperasiInfo.replace('mt-1 plus-jakarta-sans fw-normal','').replace('style=\'font-size:1em;\'','').replace(/<div.*?>|<\/div>/g,'').trim();
            hariOperasiLabel = `<div class='info-item mb-2'>
                <div class='info-icon'>
                    <iconify-icon icon="mdi:calendar-week" style="color: #264697;"></iconify-icon>
                </div>
                <div class='info-content'>
                    <div class='info-label'>Hari Operasi</div>
                    <div class='info-value'>${hariText} ${infoIconLinkHari}</div>
                </div>
            </div>`;
        }
        
        // 5. JAM OPERASI (Operating Hours)
        let jamOperasiLabel = '';
        let infoTooltipJam = `Lihat data mentah stop_times.txt untuk trip_id: ${tripIds && tripIds.length ? tripIds.join(',') : '-'}`;
        let infoIconLinkJam = `<a href='gtfs-raw-viewer.html?file=stop_times&trip_id=${encodeURIComponent(tripIds && tripIds.length ? tripIds.join(',') : '-')}' target='_blank' title='${infoTooltipJam}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        
        if (minStart && maxEnd) {
            jamOperasiLabel = `<div class='info-item mb-2'>
                <div class='info-icon'>
                    <iconify-icon icon="mdi:clock-outline" style="color: #264697;"></iconify-icon>
                </div>
                <div class='info-content'>
                    <div class='info-label'>Jam Operasi</div>
                    <div class='info-value'>${formatJamOperasi(minStart, maxEnd)} ${infoIconLinkJam}</div>
                </div>
            </div>`;
        }
        
        // 6. FREKUENSI (Headway/Frequency)
        let frekuensiLabel = '';
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
            
            frekuensiLabel = `<div class='info-item mb-2'>
                <div class='info-icon'>
                    <iconify-icon icon="mdi:repeat" style="color: #264697;"></iconify-icon>
                </div>
                <div class='info-content'>
                    <div class='info-label'>Frekuensi</div>
                    <div class='info-value'>${headwayText} ${infoIconLinkFreq}</div>
                </div>
            </div>`;
        }
        
        // 7. TARIF (Fare)
        let tarifLabel = '';
        let fareId = '';
        if (fareRule) fareId = fareRule.fare_id;
        let infoTooltipTarif = `Lihat data mentah fare_attributes.txt untuk fare_id: ${fareId}`;
        let infoIconLinkTarif = `<a href='gtfs-raw-viewer.html?file=fare_attributes&fare_id=${encodeURIComponent(fareId)}&route_id=${encodeURIComponent(routeObj.route_id)}&show_rules=1' target='_blank' title='${infoTooltipTarif}' style='text-decoration:none;'><iconify-icon icon="mdi:information-outline" inline></iconify-icon></a>`;
        
        if (fareInfo) {
            let tarifText = fareInfo.replace('<div class=\'mt-1 plus-jakarta-sans\'><b>Tarif:</b> ','').replace('</div>','');
            tarifLabel = `<div class='info-item mb-2'>
                <div class='info-icon'>
                    <iconify-icon icon="mdi:ticket-percent" style="color: #264697;"></iconify-icon>
                </div>
                <div class='info-content'>
                    <div class='info-label'>Tarif</div>
                    <div class='info-value'>${tarifText} ${infoIconLinkTarif}</div>
                </div>
            </div>`;
        }
        
        // 8. PANJANG TRAYEK (Route Length)
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
            panjangTrayekLabel = `<div class='info-item mb-2'>
                <div class='info-icon'>
                    <iconify-icon icon="mdi:ruler" style="color: #264697;"></iconify-icon>
                </div>
                <div class='info-content'>
                    <div class='info-label'>Panjang Trayek</div>
                    <div class='info-value'>${(totalLength/1000).toFixed(2)} km</div>
                </div>
            </div>`;
        }
        
        // --- GABUNGKAN SEMUA INFORMASI LAYANAN ---
        // Pastikan semua variabel terdefinisi
        badgeLabel = badgeLabel || '';
        jurusanLabel = jurusanLabel || '';
        jenisLayananLabel = jenisLayananLabel || '';
        hariOperasiLabel = hariOperasiLabel || '';
        jamOperasiLabel = jamOperasiLabel || '';
        frekuensiLabel = frekuensiLabel || '';
        tarifLabel = tarifLabel || '';
        panjangTrayekLabel = panjangTrayekLabel || '';
        
        let serviceInfoHTML = `
            <div class='service-info-container'>
                ${badgeLabel}
                ${jurusanLabel}
                ${jenisLayananLabel}
                <div class='service-details'>
                    ${hariOperasiLabel}
                    ${jamOperasiLabel}
                    ${frekuensiLabel}
                    ${tarifLabel}
                    ${panjangTrayekLabel}
                </div>
            </div>
            ${variantDropdownHTML}
        `;
        
        // --- TAMPILKAN INFORMASI LAYANAN ---
        document.getElementById('stopsTitle').innerHTML = serviceInfoHTML;
        document.getElementById('stopsTitle').className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
        
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
        title.innerHTML = serviceInfoHTML;
        title.className = 'mb-3 fs-3 fw-bold plus-jakarta-sans';
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
            li.className = 'stop-item';
            
            // Container utama untuk halte
            const stopContainer = document.createElement('div');
            stopContainer.className = 'stop-container';
            
            // Header halte dengan nama dan koordinat
            const stopHeader = document.createElement('div');
            stopHeader.className = 'stop-header';
            
            // Nomor urut halte
            const stopNumber = document.createElement('div');
            stopNumber.className = 'stop-number';
            stopNumber.textContent = (idx + 1).toString().padStart(2, '0');
            
            // Nama halte
            const stopName = document.createElement('div');
            stopName.className = 'stop-name';
            stopName.textContent = stop.stop_name;
            
            // Icon koordinat (link ke Google Maps)
            if (stop.stop_lat && stop.stop_lon) {
                const coordLink = document.createElement('a');
                coordLink.href = `https://www.google.com/maps/search/?api=1&query=${stop.stop_lat},${stop.stop_lon}`;
                coordLink.target = '_blank';
                coordLink.rel = 'noopener';
                coordLink.className = 'coord-link';
                coordLink.title = 'Lihat di Google Maps';
                coordLink.innerHTML = `<iconify-icon icon="mdi:map-marker" style="color: #d9534f;"></iconify-icon>`;
                stopHeader.appendChild(coordLink);
            }
            
            stopHeader.appendChild(stopNumber);
            stopHeader.appendChild(stopName);
            
            // Badge jenis halte
            let stopTypeBadge = '';
            if (stop.stop_id && stop.stop_id.startsWith('B')) {
                stopTypeBadge = `<div class='stop-type-badge feeder'>Pengumpan</div>`;
            } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
                stopTypeBadge = `<div class='stop-type-badge platform'>Platform ${stop.platform_code}</div>`;
            } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
                stopTypeBadge = `<div class='stop-type-badge access'>Akses Masuk</div>`;
            } else {
                stopTypeBadge = `<div class='stop-type-badge corridor'>Koridor</div>`;
            }
            
            // Layanan lain yang melewati halte ini
            let otherRoutesBadges = '';
            if (stopToRoutes[stop.stop_id]) {
                const otherRoutes = Array.from(stopToRoutes[stop.stop_id]).filter(rid => rid !== selectedRouteId);
                if (otherRoutes.length > 0) {
                    otherRoutesBadges = `<div class='other-routes'>
                        <div class='other-routes-label'>Layanan lain:</div>
                        <div class='other-routes-badges'>`;
                    
                    otherRoutes.forEach(rid => {
                        const route = routes.find(r => r.route_id === rid);
                        if (route) {
                            let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                            otherRoutesBadges += `<span class='route-badge' style='background: ${badgeColor};' title='${route.route_long_name}'>${route.route_short_name}</span>`;
                        }
                    });
                    
                    otherRoutesBadges += `</div></div>`;
                }
            }
            
            // Gabungkan semua elemen
            stopContainer.innerHTML = `
                ${stopHeader.outerHTML}
                ${stopTypeBadge}
                ${otherRoutesBadges}
            `;
            
            li.appendChild(stopContainer);
            
            // Event handler untuk klik pada halte
            li.onclick = function(e) {
                // Jika klik pada link, jangan jalankan event ini
                if (e.target.tagName === 'A' || e.target.closest('a')) return;
                window.lastStopId = stop.stop_id;
                saveUserProgress();
            };
            
            // Event handler untuk badge layanan
            const routeBadges = li.querySelectorAll('.route-badge');
            routeBadges.forEach(badge => {
                badge.onclick = function(e) {
                    e.stopPropagation(); // Mencegah event bubbling ke li
                    const routeShortName = this.textContent;
                    const route = routes.find(r => r.route_short_name === routeShortName);
                    if (route) {
                        window.lastStopId = stop.stop_id;
                        selectedRouteId = route.route_id;
                        saveActiveRouteId(selectedRouteId);
                        renderRoutes();
                        showStopsByRoute(route.route_id, route);
                    }
                };
            });
            
            // Highlight halte jika ada
            if (highlightStopId && stop.stop_id === highlightStopId) {
                li.classList.add('highlighted');
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
        li.className = 'stop-item';
        
        // Container utama untuk halte
        const stopContainer = document.createElement('div');
        stopContainer.className = 'stop-container';
        
        // Header halte dengan nama dan koordinat
        const stopHeader = document.createElement('div');
        stopHeader.className = 'stop-header';
        
        // Nomor urut halte
        const stopNumber = document.createElement('div');
        stopNumber.className = 'stop-number';
        stopNumber.textContent = (idx + 1).toString().padStart(2, '0');
        
        // Nama halte
        const stopName = document.createElement('div');
        stopName.className = 'stop-name';
        stopName.textContent = stop.stop_name;
        
        // Icon koordinat (link ke Google Maps)
        if (stop.stop_lat && stop.stop_lon) {
            const coordLink = document.createElement('a');
            coordLink.href = `https://www.google.com/maps/search/?api=1&query=${stop.stop_lat},${stop.stop_lon}`;
            coordLink.target = '_blank';
            coordLink.rel = 'noopener';
            coordLink.className = 'coord-link';
            coordLink.title = 'Lihat di Google Maps';
            coordLink.innerHTML = `<iconify-icon icon="mdi:map-marker" style="color: #d9534f;"></iconify-icon>`;
            stopHeader.appendChild(coordLink);
        }
        
        stopHeader.appendChild(stopNumber);
        stopHeader.appendChild(stopName);
        
        // Badge jenis halte
        let stopTypeBadge = '';
            if (stop.stop_id && stop.stop_id.startsWith('B')) {
            stopTypeBadge = `<div class='stop-type-badge feeder'>Pengumpan</div>`;
            } else if (stop.stop_id && stop.stop_id.startsWith('G') && stop.platform_code) {
            stopTypeBadge = `<div class='stop-type-badge platform'>Platform ${stop.platform_code}</div>`;
            } else if (stop.stop_id && (stop.stop_id.startsWith('E') || stop.stop_id.startsWith('H'))) {
            stopTypeBadge = `<div class='stop-type-badge access'>Akses Masuk</div>`;
        } else {
            stopTypeBadge = `<div class='stop-type-badge corridor'>Koridor</div>`;
        }
        
        // Layanan lain yang melewati halte ini
        let otherRoutesBadges = '';
        if (stopToRoutes[stop.stop_id]) {
            const otherRoutes = Array.from(stopToRoutes[stop.stop_id]).filter(rid => rid !== selectedRouteId);
            if (otherRoutes.length > 0) {
                otherRoutesBadges = `<div class='other-routes'>
                    <div class='other-routes-label'>Layanan lain:</div>
                    <div class='other-routes-badges'>`;
                
                otherRoutes.forEach(rid => {
                    const route = routes.find(r => r.route_id === rid);
                    if (route) {
                        let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                        otherRoutesBadges += `<span class='route-badge' style='background: ${badgeColor};' title='${route.route_long_name}'>${route.route_short_name}</span>`;
                    }
                });
                
                otherRoutesBadges += `</div></div>`;
            }
        }
        
        // Gabungkan semua elemen
        stopContainer.innerHTML = `
            ${stopHeader.outerHTML}
            ${stopTypeBadge}
            ${otherRoutesBadges}
        `;
        
        li.appendChild(stopContainer);
        
        // Event handler untuk klik pada halte
        li.onclick = function(e) {
            // Jika klik pada link, jangan jalankan event ini
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            window.lastStopId = stop.stop_id;
            saveUserProgress();
        };
        
        // Event handler untuk badge layanan
        const routeBadges = li.querySelectorAll('.route-badge');
        routeBadges.forEach(badge => {
            badge.onclick = function(e) {
                e.stopPropagation(); // Mencegah event bubbling ke li
                const routeShortName = this.textContent;
                const route = routes.find(r => r.route_short_name === routeShortName);
                if (route) {
                    window.lastStopId = stop.stop_id;
                    selectedRouteId = route.route_id;
                    saveActiveRouteId(selectedRouteId);
                    renderRoutes();
                    showStopsByRoute(route.route_id, route);
                }
            };
        });
        
        // Highlight halte jika ada
        if (highlightStopId && stop.stop_id === highlightStopId) {
            li.classList.add('highlighted');
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
        let foundKoridor = routes.filter(r =>
            (r.route_short_name && r.route_short_name.toLowerCase().includes(q)) ||
            (r.route_long_name && r.route_long_name.toLowerCase().includes(q))
        );
        // Urutkan hasil pencarian koridor secara natural
        foundKoridor = foundKoridor.sort(naturalSort);
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
                li.className = 'list-group-item d-flex align-items-center gap-2 py-3';
                let badgeColor = (route.route_color) ? ('#' + route.route_color) : '#6c757d';
                li.innerHTML = `
                  <span class='badge badge-koridor-interaktif rounded-pill' style='background:${badgeColor};color:#fff;font-weight:bold;font-size:1.1em;padding:0.6em 1.2em;'>${route.route_short_name}</span>
                  <span class='fw-bold plus-jakarta-sans' style='font-size:1.1em;'>${route.route_long_name || ''}</span>
                `;
                li.style.cursor = 'pointer';
                li.onmouseenter = () => li.style.background = '#f1f5f9';
                li.onmouseleave = () => li.style.background = '';
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
  
  // Function: Mendapatkan halte sebelumnya dari currentStopId dan routeId
  function getPreviousStop(currentStopId, routeId) {
    // Cari semua trip untuk rute ini
    const tripsForRoute = trips.filter(t => t.route_id === routeId);
    for (const trip of tripsForRoute) {
        // Urutkan stop_times berdasarkan stop_sequence
        const stTimes = stop_times.filter(st => st.trip_id === trip.trip_id)
            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        const idx = stTimes.findIndex(st => st.stop_id === currentStopId);
        if (idx > 0) {
            // Ambil stop_id sebelumnya
            const prevStopId = stTimes[idx - 1].stop_id;
            return stops.find(s => s.stop_id === prevStopId) || null;
        }
    }
    return null; // Tidak ditemukan
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
                
                // Cari halte sebelumnya dalam sequence untuk route ini
                const tripsForRoute = trips.filter(t => t.route_id === routeId);
                let prevStopInSequence = null;
                for (const trip of tripsForRoute) {
                    const stTimes = stop_times.filter(st => st.trip_id === trip.trip_id)
                        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
                    const idx = stTimes.findIndex(st => st.stop_id === stop.stop_id);
                    if (idx > 0) {
                        prevStopInSequence = stops.find(s => s.stop_id === stTimes[idx - 1].stop_id);
                        break;
                    }
                }
                
                // Set lastStopId ke halte sebelumnya dalam sequence (jika ada)
                if (prevStopInSequence) {
                    window.lastStopId = prevStopInSequence.stop_id;
                } else {
                    // Jika tidak ada halte sebelumnya, set ke null
                    window.lastStopId = null;
                }
                
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
    
    // Pastikan global untuk riwayat halte sudah terdefinisi
    if (typeof window.currentStopId === 'undefined') window.currentStopId = null;
    if (typeof window.currentStopId === 'undefined' || window.currentStopId === null) {
        window.currentStopId = currentStop.stop_id;
    }
    if (window.currentStopId !== currentStop.stop_id) {
        window.currentStopId = currentStop.stop_id;
    }
    // Sistem arrival dengan timer 10 detik (tanpa pembatalan)
    if (nextStop && jarakNext !== null) {
        // Arrival card hanya muncul jika user sudah < 30m dari halte berikutnya dan belum pernah arrival di halte itu
        if (jarakNext < 30 && window.lastArrivedStopId !== nextStop.stop_id) {
            // Mulai timer 10 detik
            console.log(`Timer dimulai untuk halte: ${nextStop.stop_name}`);
            window.arrivalTimer = setTimeout(() => {
                console.log(`Timer selesai, pindah dari ${currentStop.stop_name} ke ${nextStop.stop_name}`);
                window.currentStopId = nextStop.stop_id;
                window.selectedCurrentStopForUser = nextStop;
                window.lastArrivedStopId = null;
                if (window.userMarker) {
                    showUserRouteInfo(userLat, userLon, nextStop, routeId);
                }
            }, 10000);
            arrivalMsg = `<div style='background:linear-gradient(135deg, #10b981, #059669);color:white;padding:12px;border-radius:8px;margin-top:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-left:4px solid #047857;'>
                <div style='display:flex;align-items:center;gap:8px;'>
                    <div style='font-size:1.2em;'>🎉</div>
                    <div style='flex:1;'>
                        <div style='font-weight:bold;font-size:1.1em;margin-bottom:2px;'>Tiba di Halte!</div>
                        <div style='font-size:0.95em;opacity:0.9;'>${nextStop.stop_name}</div>
                    </div>
                </div>
            </div>`;
            window.lastArrivedStopId = nextStop.stop_id;
        } else if (window.lastArrivedStopId === nextStop.stop_id) {
            // Jika sudah arrival, card tetap tampil sampai timeout selesai, meskipun user menjauh > 30m
            arrivalMsg = `<div style='background:linear-gradient(135deg, #10b981, #059669);color:white;padding:12px;border-radius:8px;margin-top:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-left:4px solid #047857;'>
                <div style='display:flex;align-items:center;gap:8px;'>
                    <div style='font-size:1.2em;'>🎉</div>
                    <div style='flex:1;'>
                        <div style='font-weight:bold;font-size:1.1em;margin-bottom:2px;'>Tiba di Halte!</div>
                        <div style='font-size:0.95em;opacity:0.9;'>${nextStop.stop_name}</div>
                    </div>
                </div>
            </div>`;
        }
    }
    
    let route = routes.find(r => r.route_id === routeId);
    let badgeColor = route && route.route_color ? ('#' + route.route_color) : '#264697';
    let badgeText = route && route.route_short_name ? route.route_short_name : routeId;
    let badgeLayanan = `<span id='popup-badge-layanan' class='badge badge-koridor-interaktif rounded-pill' style='background:${badgeColor};color:#fff;font-weight:bold;font-size:1.2em;padding:0.5em 1.1em;'>${badgeText}</span>`;
    
    // --- Informasi Jurusan ---
    let jurusanInfo = '';
    if (route && route.route_long_name) {
        jurusanInfo = `<div style='margin-bottom:4px;font-size:0.95em;font-weight:600;color:#374151;'>${route.route_long_name}</div>`;
    }
    
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
    let layananSemuaBadges = '';
    if (nextStop && stopToRoutes[nextStop.stop_id]) {
        layananSemuaBadges = Array.from(stopToRoutes[nextStop.stop_id])
            .map(rid => {
                const r = routes.find(rt => rt.route_id === rid);
                if (r) {
                    let color = r.route_color ? ('#' + r.route_color) : '#6c757d';
                    let isActive = rid === routeId;
                    return `<span class='badge badge-koridor-interaktif rounded-pill me-1' style='background:${color};color:#fff;cursor:pointer;font-weight:bold;font-size:0.95em;${isActive ? 'border:2px solid #264697;' : ''}' data-routeid='${r.route_id}'>${r.route_short_name}</span>`;
                }
                return '';
            }).join('');
    }
    let layananSemuaBlock = layananSemuaBadges ? `<div style='margin-bottom:2px;'><b>Layanan di halte ini:</b> ${layananSemuaBadges}</div>` : '';
    let jarakInfo = nextStop ? `<div style='margin-bottom:2px;'><b>Jarak:</b> ${jarakNext < 1000 ? Math.round(jarakNext) + ' m' : (jarakNext/1000).toFixed(2) + ' km'}</div>` : '';
    // --- Kecepatan User ---
    let speedInfo = '';
    let speedVal = (typeof arguments[4] === 'number' && !isNaN(arguments[4])) ? arguments[4] : (typeof window._lastUserSpeed === 'number' ? window._lastUserSpeed : null);
    let speedKmh = (speedVal !== null && speedVal >= 0) ? speedVal * 3.6 : 0;
    // Jika speed null atau sangat kecil (<0.2 km/jam), anggap berhenti
    if (speedVal === null || speedKmh < 0.2) {
        speedInfo = `<div style='margin-bottom:2px;'><b>Kecepatan:</b> 0 km/jam</div>`;
    } else if (speedKmh < 1) {
        speedInfo = `<div style='margin-bottom:2px;'><b>Kecepatan:</b> ${(speedKmh*1000).toFixed(0)} m/jam</div>`;
    } else {
        speedInfo = `<div style='margin-bottom:2px;'><b>Kecepatan:</b> ${speedKmh.toFixed(1)} km/jam</div>`;
    }
    // --- Garis pemisah ---
    let hr = `<hr style='margin:6px 0 4px 0;border-top:1.5px solid #e5e7eb;'>`;
    // Tombol Maps dihapus sesuai permintaan
    let mapsBtn = '';
    let popupContent = `
    <div class='plus-jakarta-sans popup-card-friendly' style='min-width:220px;max-width:340px;line-height:1.45;background:rgba(248,250,252,0.95);border-radius:18px;box-shadow:none;padding:18px 18px 12px 18px;position:relative;'>
        <div style='display:flex;align-items:center;gap:12px;margin-bottom:8px;'>
            <div style='flex:1;'>${badgeLayanan}</div>
        </div>
        <div id='popup-dinamis-info'>
            ${jurusanInfo}
            <div style='margin-bottom:6px;'>
                ${nextStopTitle}
                ${nextStopName}
                ${labelTipeNext}
                ${layananSemuaBlock}
            </div>
            ${jarakInfo}
            ${speedInfo}
            ${hr}
            ${arrivalMsg}
        </div>
        <div style='position:absolute;bottom:0;right:0;opacity:0.09;font-size:6em;pointer-events:none;'>🚌</div>
    </div>
    <style>
    .popup-card-friendly .btn { transition:box-shadow 0.2s,background 0.2s; }
    .popup-card-friendly .btn:hover { box-shadow:0 2px 8px rgba(38,70,151,0.13); background:#e0e7ff; }
    /* Custom Leaflet popup style */
    .leaflet-popup-content-wrapper, .leaflet-popup-tip {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
    }
    .leaflet-popup-content {
        margin:0 !important;
        padding:0 !important;
        background: transparent !important;
    }
    .leaflet-popup-tip {
        display: none !important;
    }
    </style>
    `;
    if (window.userMarker) {
        // Only animate on first open, not every update
        let popupEl = window.userMarker.getPopup() && window.userMarker.getPopup().getElement();
        if (!popupEl || !popupEl.classList.contains('popup-card-friendly')) {
            window.userMarker.bindPopup(popupContent).openPopup();
            setTimeout(() => {
                const popupEl2 = window.userMarker.getPopup().getElement();
                if (!popupEl2) return;
                popupEl2.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                    badge.onclick = function(e) {
                        e.stopPropagation();
                        const newRouteId = this.getAttribute('data-routeid');
                        if (newRouteId && newRouteId !== routeId) {
                            // Reset timer jika ada
                            if (window.arrivalTimer) {
                                clearTimeout(window.arrivalTimer);
                                window.arrivalTimer = null;
                            }
                            // Reset status arrival
                            window.lastArrivedStopId = null;
                            // Jangan set lastStopId saat berganti rute
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
        } else {
            // Update hanya bagian dinamis, badge dan tombol Maps tetap
            // Hindari setPopupContent, update DOM langsung
            const dinamis = popupEl.querySelector('#popup-dinamis-info');
            if (dinamis) {
                dinamis.innerHTML = `
                    ${jurusanInfo}
                    <div style='margin-bottom:6px;'>
                        ${nextStopTitle}
                        ${nextStopName}
                        ${labelTipeNext}
                        ${layananSemuaBlock}
                    </div>
                    ${jarakInfo}
                    ${speedInfo}
                    ${hr}
                    ${arrivalMsg}
                `;
            }
        }
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
    // Variabel global untuk kecepatan user
    if (!window._lastUserPos) window._lastUserPos = null;
    if (!window._lastUserTime) window._lastUserTime = null;
    if (!window._lastUserSpeed) window._lastUserSpeed = null;
    window.geoWatchId = navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const now = Date.now();
            // Hitung kecepatan (m/s)
            let speed = null;
            if (window._lastUserPos && window._lastUserTime) {
                const dist = haversine(window._lastUserPos.lat, window._lastUserPos.lon, lat, lon);
                const dt = (now - window._lastUserTime) / 1000; // detik
                if (dt > 0 && dist < 1000) { // abaikan loncatan jauh
                    speed = dist / dt;
                }
            }
            window._lastUserPos = { lat, lon };
            window._lastUserTime = now;
            window._lastUserSpeed = speed;
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
                let popupContent = `
                    <div class='plus-jakarta-sans' style='min-width: 220px; font-family: "Plus Jakarta Sans", sans-serif;'>
                        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 14px; margin: -9px -15px 10px -15px; border-radius: 8px 8px 0 0;'>
                            <div style='font-size: 15px; font-weight: 700; margin-bottom: 3px; line-height: 1.3;'>${stop.stop_name}</div>
                            <div style='font-size: 11px; opacity: 0.9; display: flex; align-items: center;'>
                                <span style='margin-right: 6px;'>🆔</span>
                                <span>${stop.stop_id}</span>
                            </div>
                        </div>
                        
                        ${labelTipe ? `<div style='margin-bottom: 10px; padding: 6px 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #007bff;'>
                            <div style='font-size: 12px; font-weight: 600; color: #495057; display: flex; align-items: center;'>
                                <span style='margin-right: 6px;'>🚏</span>
                                ${labelTipe.replace(/<div[^>]*>|<\/div>/g, '')}
                            </div>
                        </div>` : ''}
                        
                        ${koridorBadges ? `<div style='margin-bottom: 10px;'>
                            <div style='font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 6px; display: flex; align-items: center;'>
                                <span style='margin-right: 6px;'>🚌</span>
                                <span>Layanan Tersedia</span>
                            </div>
                            <div style='display: flex; flex-wrap: wrap; gap: 4px;'>
                                ${koridorBadges}
                            </div>
                        </div>` : ''}
                        
                        <div style='padding: 8px 12px; background: linear-gradient(90deg, #e3f2fd 0%, #f3e5f5 100%); border-radius: 6px; border-left: 4px solid #2196f3;'>
                            <div style='font-size: 13px; font-weight: 600; color: #1976d2; display: flex; align-items: center;'>
                                <span style='margin-right: 8px;'>📍</span>
                                <span>Jarak ke Anda: ${stop.dist < 1000 ? Math.round(stop.dist) + ' m' : (stop.dist/1000).toFixed(2) + ' km'}</span>
                            </div>
                        </div>
                    </div>
                `;
                window.nearestStopMarker.setPopupContent(popupContent);
            }
            if (window.userMarker) {
                // Hanya tampilkan 'Posisi Anda' jika belum pilih layanan
                if (!window.selectedRouteIdForUser || !window.selectedCurrentStopForUser) {
                    window.userMarker.bindPopup('Posisi Anda');
                } else {
                    // Jika sudah pilih layanan, tampilkan info rute (termasuk saat arrival)
                    showUserRouteInfo(
                        window.userMarker.getLatLng().lat,
                        window.userMarker.getLatLng().lng,
                        window.selectedCurrentStopForUser,
                        window.selectedRouteIdForUser,
                        window._lastUserSpeed
                    );
                }
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
                        // Hanya deteksi arrival, timer akan ditangani di showUserRouteInfo
                        // Tidak ada pembatalan timer saat menjauh
                    }
                }
                // Hanya panggil showUserRouteInfo jika tidak sedang dalam status arrival
                if (!window.lastArrivedStopId) {
                    showUserRouteInfo(lat, lon, window.selectedCurrentStopForUser, window.selectedRouteIdForUser);
                } else {
                    // Jika sedang dalam status arrival, hanya update popup tanpa memulai timer baru
                    updatePopupOnly(lat, lon, window.selectedCurrentStopForUser, window.selectedRouteIdForUser);
                }
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
    // Bersihkan timer arrival
    if (window.arrivalTimer) {
        clearTimeout(window.arrivalTimer);
        window.arrivalTimer = null;
    }
    window.lastArrivedStopId = null;
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
            <div class='plus-jakarta-sans' style='min-width: 220px; font-family: "Plus Jakarta Sans", sans-serif;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 14px; margin: -9px -15px 10px -15px; border-radius: 8px 8px 0 0;'>
                    <div style='font-size: 15px; font-weight: 700; margin-bottom: 3px; line-height: 1.3;'>${stop.stop_name}</div>
                    <div style='font-size: 11px; opacity: 0.9; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🆔</span>
                        <span>${stop.stop_id}</span>
                    </div>
                </div>
                
                ${labelTipe ? `<div style='margin-bottom: 10px; padding: 6px 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #007bff;'>
                    <div style='font-size: 12px; font-weight: 600; color: #495057; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🚏</span>
                        ${labelTipe.replace(/<div[^>]*>|<\/div>/g, '')}
                    </div>
                </div>` : ''}
                
                ${koridorBadges ? `<div style='margin-bottom: 10px;'>
                    <div style='font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 6px; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🚌</span>
                        <span>Layanan Tersedia</span>
                    </div>
                    <div style='display: flex; flex-wrap: wrap; gap: 4px;'>
                        ${koridorBadges}
                    </div>
                </div>` : ''}
                
                <div style='padding: 6px 10px; background: linear-gradient(90deg, #e3f2fd 0%, #f3e5f5 100%); border-radius: 5px; border-left: 3px solid #2196f3;'>
                    <div style='font-size: 12px; font-weight: 600; color: #1976d2; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>📍</span>
                        <span>Jarak ke Anda: ${stop.dist < 1000 ? Math.round(stop.dist) + ' m' : (stop.dist/1000).toFixed(2) + ' km'}</span>
                    </div>
                </div>
            </div>
        `;
        const marker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [18, 30],
                iconAnchor: [9, 30],
                popupAnchor: [1, -24]
            })
        }).addTo(map).bindPopup(`<div class='plus-jakarta-sans'>${popupContent}</div>`, { className: 'custom-popup-transparent' });
        marker.on('popupopen', function() {
            setTimeout(() => {
                const popupEl = marker.getPopup().getElement();
                if (!popupEl) return;
                popupEl.querySelectorAll('.badge-koridor-interaktif').forEach(badge => {
                    badge.onclick = function(e) {
                        e.stopPropagation();
                        const routeId = this.getAttribute('data-routeid');
                        window.lastStopId = stop.stop_id;
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
    nearbyStops.forEach((stop) => {
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
            `<div class='plus-jakarta-sans' style='min-width: 220px; font-family: "Plus Jakarta Sans", sans-serif;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 14px; margin: -9px -15px 10px -15px; border-radius: 8px 8px 0 0;'>
                    <div style='font-size: 15px; font-weight: 700; margin-bottom: 3px; line-height: 1.3;'>${stop.stop_name}</div>
                    <div style='font-size: 11px; opacity: 0.9; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🆔</span>
                        <span>${stop.stop_id}</span>
                    </div>
                </div>
                
                ${labelTipe ? `<div style='margin-bottom: 10px; padding: 6px 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #007bff;'>
                    <div style='font-size: 12px; font-weight: 600; color: #495057; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🚏</span>
                        ${labelTipe.replace(/<div[^>]*>|<\/div>/g, '')}
                    </div>
                </div>` : ''}
                
                ${koridorBadges ? `<div style='margin-bottom: 10px;'>
                    <div style='font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 6px; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>🚌</span>
                        <span>Layanan Tersedia</span>
                    </div>
                    <div style='display: flex; flex-wrap: wrap; gap: 4px;'>
                        ${koridorBadges}
                    </div>
                </div>` : ''}
                
                ${jarakUser ? `<div style='padding: 6px 10px; background: linear-gradient(90deg, #e3f2fd 0%, #f3e5f5 100%); border-radius: 5px; border-left: 3px solid #2196f3;'>
                    <div style='font-size: 12px; font-weight: 600; color: #1976d2; display: flex; align-items: center;'>
                        <span style='margin-right: 6px;'>📍</span>
                        <span>${jarakUser.replace(/<[^>]*>/g, '').replace('Jarak ke Anda: ', '')}</span>
                    </div>
                </div>` : ''}
            </div>`,
            {
                className: 'custom-popup-transparent'
            }
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
                        window.lastStopId = stop.stop_id;
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
  
  // Simple Progress Bar untuk Initial Loading
  function showLoadingProgress() {
    const loadingModal = document.getElementById('loadingProgress');
    if (loadingModal) {
        loadingModal.style.display = 'flex';
        // Trigger animation after display
        setTimeout(() => {
            loadingModal.classList.add('show');
        }, 10);
    }
  }
  
  function hideLoadingProgress() {
    const loadingModal = document.getElementById('loadingProgress');
    if (loadingModal) {
        loadingModal.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            loadingModal.style.display = 'none';
        }, 300);
    }
  }
  
  function updateLoadingProgress(percent, status) {
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressStatus = document.getElementById('progressStatus');
    
    if (progressBar) {
        // Smooth transition for progress bar
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
    }
    if (progressPercent) {
        progressPercent.textContent = Math.round(percent) + '%';
    }
    if (progressStatus && status) {
        progressStatus.textContent = status;
    }
  }