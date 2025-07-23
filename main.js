// --- UI Elements ---
// (Input, map, info sudah diatur di HTML)

let allRefs = [];
let refToName = {};
let geoJsonLayer = null;
let halteMarkers = [];
let map = L.map('map').setView([-6.2, 106.8], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const koridorInput = document.getElementById('koridorInput');
const koridorSuggestions = document.getElementById('koridorSuggestions');
const koridorNameDiv = document.getElementById('koridorName');

// Icon untuk halte terdekat
const halteNearestIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/layers-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// --- Ambil semua ref unik dan nama dari kedua file ---
Promise.all([
  fetch('export.geojson').then(res => res.json()),
  fetch('halte.geojson').then(res => res.json())
]).then(([exportData, halteData]) => {
  const refsSet = new Set();
  // export.geojson
  exportData.features.forEach(f => {
    let refs = [];
    if (f.properties && f.properties.ref) {
      refs = f.properties.ref.split(';').map(s => s.trim());
    }
    refs.forEach(r => {
      if (r) {
        refsSet.add(r);
        // Simpan nama jika ada
        if (f.properties && f.properties.name) refToName[r] = f.properties.name;
        else if (f.properties && f.properties.tags && f.properties.tags.name) refToName[r] = f.properties.tags.name;
      }
    });
  });
  // halte.geojson
  halteData.features.forEach(f => {
    let refs = [];
    if (f.properties && f.properties.route_ref) {
      if (Array.isArray(f.properties.route_ref)) {
        refs = f.properties.route_ref;
      } else if (typeof f.properties.route_ref === 'string') {
        refs = f.properties.route_ref.split(';').map(s => s.trim());
      }
    }
    refs.forEach(r => { if (r) refsSet.add(r); });
  });
  allRefs = Array.from(refsSet).sort((a, b) => {
    if (!isNaN(a) && !isNaN(b)) return Number(a) - Number(b);
    return a.localeCompare(b);
  });
});

// Fungsi utilitas untuk format kode koridor
function formatKoridorRef(ref) {
  if (!ref) return '';
  if (ref.includes(';')) ref = ref.split(';')[0];
  if (ref.includes(':')) ref = ref.split(':').pop();
  return ref.trim();
}

// Fungsi normalisasi kode koridor agar pencocokan antara export.geojson dan halte.geojson konsisten
function normalizeKoridorCode(code) {
  if (!code) return '';
  // Hilangkan titik, strip, spasi, dan case insensitive
  code = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Jika JAK diikuti angka, tambahkan leading zero agar jadi 3 digit
  code = code.replace(/^JAK(\d{1,2})$/, (m, d) => 'JAK' + d.padStart(3, '0'));
  code = code.replace(/^JAK(\d{1,2}[A-Z])$/, (m, d) => 'JAK' + d.padStart(4, '0'));
  return code;
}

// Fungsi validasi kode JAK: hanya JAK + 2/3 digit + opsional 1 huruf
function isValidJAK(code) {
  if (!code) return false;
  const clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return /^JAK\d{2,3}([A-Z])?$/.test(clean);
}

// --- Autocomplete logic ---
let koridorInputTimeout = null;
koridorInput.addEventListener('input', function() {
  clearTimeout(koridorInputTimeout);
  const val = this.value.trim().toLowerCase();
  koridorSuggestions.innerHTML = '';
  if (!val) return;
  if (val.includes('jak')) {
    // Normalisasi input user
    const normVal = normalizeKoridorCode(this.value);
    // Tampilkan hanya daftar koridor JAK yang cocok dengan input user (setelah normalisasi), dan punya jurusan
    const jakRefs = allRefs.filter(r =>
      isValidJAK(r) &&
      refToName[r] &&
      normalizeKoridorCode(r).includes(normVal)
    );
    jakRefs.sort((a, b) => normalizeKoridorCode(a).localeCompare(normalizeKoridorCode(b), undefined, { numeric: true, sensitivity: 'base' }));
    koridorSuggestions.innerHTML = '';
    if (jakRefs.length > 0) {
      // Tambahkan header
      const header = document.createElement('div');
      header.className = 'list-group-item fw-bold bg-light text-primary';
      header.textContent = 'MikroTrans';
      koridorSuggestions.appendChild(header);
      jakRefs.forEach(r => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = normalizeKoridorCode(r) + (refToName[r] ? ' — ' + refToName[r] : '');
        item.onclick = () => {
          koridorInput.value = normalizeKoridorCode(r);
          koridorSuggestions.innerHTML = '';
          showKoridor(r);
        };
        koridorSuggestions.appendChild(item);
      });
    }
    // Tidak tampilkan saran TJ jika input 'jak'
    return;
  }
  // Render saran koridor TJ biasa
  const matches = allRefs.filter(r => !/^m/i.test(formatKoridorRef(r)) && (r.toLowerCase().includes(val) || (refToName[r] && refToName[r].toLowerCase().includes(val))));
  matches.slice(0, 10).forEach(r => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action';
    item.textContent = formatKoridorRef(r) + (refToName[r] ? ' — ' + refToName[r] : '');
    item.onclick = () => {
      koridorInput.value = formatKoridorRef(r);
      koridorSuggestions.innerHTML = '';
      showKoridor(r);
    };
    koridorSuggestions.appendChild(item);
  });
  // Debounce fetch halte
  koridorInputTimeout = setTimeout(() => {
    fetch('halte.geojson')
      .then(res => res.json())
      .then(geojson => {
        const halteMatches = geojson.features.filter(f => {
          const halteName = f.properties && (f.properties.name || (f.properties.tags && f.properties.tags.name));
          return halteName && halteName.toLowerCase().includes(val);
        });
        if (halteMatches.length > 0) {
          const halte = halteMatches[0];
          const halteName = halte.properties && (halte.properties.name || (halte.properties.tags && halte.properties.tags.name));
          // Ambil daftar bus/koridor yang lewat halte ini
          let koridorList = [];
          if (halte.properties && halte.properties.route_ref) {
            if (Array.isArray(halte.properties.route_ref)) {
              koridorList = halte.properties.route_ref;
            } else if (typeof halte.properties.route_ref === 'string') {
              koridorList = halte.properties.route_ref.split(';').map(s => s.trim());
            }
          }
          // Format koridor: gunakan formatKoridorRef dan filter yang depannya M
          koridorList = koridorList.map(formatKoridorRef).filter(k => k && !/^m/i.test(k));
          const koridorInfo = koridorList.length > 0 ? ` (dilewati: ${koridorList.join(', ')})` : '';
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'list-group-item list-group-item-action text-primary';
          item.textContent = `Halte yang cocok: ${halteName}${koridorInfo}`;
          item.onclick = () => {
            koridorSuggestions.innerHTML = '';
            map.setView([halte.geometry.coordinates[1], halte.geometry.coordinates[0]], 17);
            // Tambahkan marker sementara dan popup
            if (window.tempHalteMarker) { map.removeLayer(window.tempHalteMarker); }
            window.tempHalteMarker = L.marker([halte.geometry.coordinates[1], halte.geometry.coordinates[0]], {
              icon: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
              })
            }).addTo(map).bindPopup(halteName + (koridorInfo ? `<br><span class='text-muted small'>${koridorInfo}</span>` : '')).openPopup();
          };
          // Prepend saran halte ke atas daftar saran
          koridorSuggestions.insertBefore(item, koridorSuggestions.firstChild);
        }
      });
  }, 300);
});
// Pilih dengan enter jika hanya satu saran
koridorInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && koridorSuggestions.firstChild) {
    koridorSuggestions.firstChild.click();
    e.preventDefault();
  }
});
// Klik di luar suggestions menutup saran
window.addEventListener('click', e => {
  if (!koridorSuggestions.contains(e.target) && e.target !== koridorInput) koridorSuggestions.innerHTML = '';
});

// --- Fungsi utama untuk render map & info ---
function showKoridor(ref) {
  // Jika JAK dan tidak 3 digit, abaikan
  if (/^JAK/i.test(ref) && !/^JAK\d{3}([A-Z])?$/i.test(ref)) return;
  koridorNameDiv.innerHTML = '';
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
  }
  halteMarkers.forEach(m => map.removeLayer(m));
  halteMarkers = [];
  if (!ref) return;

  fetch('export.geojson')
    .then(res => res.json())
    .then(geojson => {
      const koridorFeatures = geojson.features.filter(f => {
        if (!(f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')) return false;
        let refs = [];
        if (f.properties && f.properties.ref) {
          refs = f.properties.ref.split(';').map(s => s.trim());
        } else if (f.properties && f.properties.tags && f.properties.tags.ref) {
          refs = f.properties.tags.ref.split(';').map(s => s.trim());
        }
        let route = f.properties.route || (f.properties.tags && f.properties.tags.route);
        let network = f.properties.network || (f.properties.tags && f.properties.tags.network);
        return refs.includes(ref) && route === 'bus' && network === 'Transjakarta';
      });
      // --- Info koridor ---
      let koridorInfo = '';
      if (koridorFeatures.length > 0) {
        const f = koridorFeatures[0];
        const p = f.properties;
        koridorInfo = `<div><b>${p.name || (p.tags && p.tags.name) || ''}</b></div><table class="table table-sm table-bordered w-auto mt-1 mb-0 p-2" style="padding:0.5em 1em;"><tbody>`;
        const infoFields = [
          ['ref', '<iconify-icon icon="mdi:identifier" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Kode'],
          ['from', '<iconify-icon icon="mdi:arrow-left-bold" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Dari'],
          ['to', '<iconify-icon icon="mdi:arrow-right-bold" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Ke'],
          ['operator', '<iconify-icon icon="mdi:account-tie" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Operator'],
          ['opening_hours', '<iconify-icon icon="mdi:clock-outline" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Jam Operasi'],
          // Pembayaran akan di-handle khusus di bawah
          ['website', '<iconify-icon icon="mdi:web" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Website'],
        ];
        infoFields.forEach(([key, label]) => {
          let val = p[key] || (p.tags && p.tags[key]);
          if (key === 'ref' && val) {
            val = formatKoridorRef(val);
          }
          if (val) {
            if (key === 'website') val = `<a href="${val}" target="_blank">${val}</a>`;
            koridorInfo += `<tr><td style="padding:0.5em 1em;vertical-align:middle;">${label}</td><td style="padding:0.5em 1em;vertical-align:middle;">${val}</td></tr>`;
          }
        });
        // Handle pembayaran
        const paymentFields = [
          ['payment:cash', 'Tunai'],
          ['payment:ep_brizzi', 'BRIZZI'],
          ['payment:ep_flazz', 'Flazz'],
          ['payment:ep_jakcard', 'JakCard'],
          ['payment:ep_mandiri_emoney', 'Mandiri eMoney'],
          ['payment:ep_tapcash', 'TapCash'],
          ['payment:jak_lingko', 'JakLingko'],
        ];
        const availablePayments = paymentFields
          .map(([key, label]) => {
            let val = p[key] || (p.tags && p.tags[key]);
            if (typeof val === 'string' && val.trim().toLowerCase() === 'yes') return label;
            return null;
          })
          .filter(Boolean);
        if (availablePayments.length > 0) {
          koridorInfo += `<tr><td><iconify-icon icon="mdi:credit-card-outline" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Jenis kartu yang didukung</td><td>${availablePayments.join(', ')}</td></tr>`;
        }
        const koridorLength = getKoridorLength(koridorFeatures);
        koridorInfo += `<tr><td><iconify-icon icon="mdi:ruler" class="align-text-bottom" style="font-size:1.1em;"></iconify-icon> Panjang Rute</td><td>${(koridorLength/1000).toFixed(2)} km</td></tr>`;
        koridorInfo += '</tbody></table>';
      }
      koridorNameDiv.innerHTML = koridorInfo;
      if (koridorFeatures.length === 0) {
        alert('Data koridor tidak ditemukan di export.geojson');
        return;
      }
      geoJsonLayer = L.geoJSON({ type: 'FeatureCollection', features: koridorFeatures }, {
        style: { color: '#0074D9', weight: 3 },
        onEachFeature: function(feature, layer) {
          if (feature.properties && (feature.properties.name || (feature.properties.tags && feature.properties.tags.name))) {
            layer.bindPopup(feature.properties.name || feature.properties.tags.name);
          }
        }
      }).addTo(map);
      if (geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
        map.fitBounds(geoJsonLayer.getBounds(), { maxZoom: 15 });
      }
    });

  fetch('halte.geojson')
    .then(res => res.json())
    .then(geojson => {
      const halteAdded = new Set();
      geojson.features.forEach(f => {
        let routeRefs = [];
        if (f.properties && f.properties.route_ref) {
          if (Array.isArray(f.properties.route_ref)) {
            routeRefs = f.properties.route_ref;
          } else if (typeof f.properties.route_ref === 'string') {
            routeRefs = f.properties.route_ref.split(';').map(s => s.trim());
          }
          // Hanya filter dengan isValidJAK jika ref yang dipilih adalah JAK
          if (/^JAK/i.test(ref)) {
            routeRefs = routeRefs.filter(isValidJAK);
          }
        }
        if (routeRefs.map(normalizeKoridorCode).includes(normalizeKoridorCode(ref))) {
          // Gunakan id atau koordinat sebagai key unik
          const halteId = (f.properties && f.properties['@id']) || f.id || (f.geometry && f.geometry.coordinates.join(','));
          if (halteAdded.has(halteId)) return;
          halteAdded.add(halteId);
          let halteName = f.properties && (f.properties.name || f.properties.tags && f.properties.tags.name);
          if (!halteName && f.properties && f.properties.ref) halteName = f.properties.ref;
          if (!halteName && f.properties && f.properties.id) halteName = f.properties.id;
          const marker = L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
            icon: L.icon({
              iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34]
            })
          }).addTo(map)
            .bindPopup(halteName || 'Halte');
          halteMarkers.push(marker);
        }
      });
    });
}

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

// Hitung total panjang koridor (dalam meter)
function getKoridorLength(features) {
  let total = 0;
  features.forEach(f => {
    if (f.geometry.type === 'LineString') {
      const coords = f.geometry.coordinates;
      for (let i = 1; i < coords.length; i++) {
        total += haversine(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0]);
      }
    } else if (f.geometry.type === 'MultiLineString') {
      f.geometry.coordinates.forEach(line => {
        for (let i = 1; i < line.length; i++) {
          total += haversine(line[i-1][1], line[i-1][0], line[i][1], line[i][0]);
        }
      });
    }
  });
  return total;
}

let halteNearestMarker = null;
let userMarker = null;

// Event: klik di peta untuk cari halte Transjakarta terdekat
map.on('click', function(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  // Hapus marker user lama jika ada, hanya jika lokasiAktif === false
  if (!lokasiAktif) {
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
  }
  if (lokasiAktif) return; // Jangan lakukan apapun jika mode lokasi aktif
  userMarker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    })
  }).addTo(map).bindPopup('Titik Pilihan').openPopup();
  // Event: klik marker biru hapus kedua marker
  userMarker.on('click', function() {
    if (!lokasiAktif) {
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
    }
  });
  // Cari halte terdekat
  fetch('halte.geojson')
    .then(res => res.json())
    .then(geojson => {
      let minDist = Infinity;
      let nearest = null;
      geojson.features.forEach(f => {
        if (f.geometry.type === 'Point') {
          // Filter hanya halte Transjakarta
          const network = f.properties.network || (f.properties.tags && f.properties.tags.network);
          const operator = f.properties.operator || (f.properties.tags && f.properties.tags.operator);
          if (network !== 'Transjakarta' && operator !== 'Transjakarta') return;
          const [lon, lat2] = f.geometry.coordinates;
          const dist = haversine(lat, lng, lat2, lon);
          if (dist < minDist) {
            minDist = dist;
            nearest = f;
          }
        }
      });
      if (nearest) {
        // Hapus marker halte terdekat sebelumnya, hanya jika lokasiAktif === false
        if (!lokasiAktif && halteNearestMarker) {
          map.removeLayer(halteNearestMarker);
          halteNearestMarker = null;
        }
        const halteName = nearest.properties && (nearest.properties.name || (nearest.properties.tags && nearest.properties.tags.name)) || 'Halte';
        let koridorList = [];
        if (nearest.properties && nearest.properties.route_ref) {
          if (Array.isArray(nearest.properties.route_ref)) {
            koridorList = nearest.properties.route_ref;
          } else if (typeof nearest.properties.route_ref === 'string') {
            koridorList = nearest.properties.route_ref.split(';').map(s => s.trim());
          }
        }
        koridorList = koridorList.map(normalizeKoridorCode).filter(Boolean);
        const koridorBadges = koridorList.map(kor =>
          `<span class="koridor-link mx-1" data-koridor="${kor}" title="${kor}" style="cursor:pointer;text-decoration:underline;color:#0074d9;font-size:0.98em;">${kor}</span>`
        ).join('');
        const koridorInfo = koridorBadges ? `<br>Layanan: ${koridorBadges}` : '';
        halteNearestMarker = L.marker([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], {
          icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/layers-2x.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
          })
        }).addTo(map)
          .bindPopup(`Halte Terdekat:<br><b>${halteName}</b><br>Jarak: ${(minDist/1000).toFixed(2)} km${koridorInfo}`).openPopup();
        setTimeout(() => {
          document.querySelectorAll('.koridor-link').forEach(link => {
            link.onclick = function(e) {
              e.stopPropagation();
              koridorInput.value = this.dataset.koridor;
              koridorSuggestions.innerHTML = '';
              showKoridor(this.dataset.koridor);
              map.closePopup();
            };
          });
        }, 100);
        halteNearestMarker.on('click', function() {
          if (!lokasiAktif) {
            if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
            if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
          }
          // Jika lokasiAktif, jangan lakukan apapun (biarkan popup tetap terbuka)
        });
      }
    });
});

// Hapus marker jika klik di luar map
const mapContainer = document.getElementById('map');
document.addEventListener('click', function(e) {
  if (!mapContainer.contains(e.target)) {
    if (!lokasiAktif) {
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
    }
  }
});

// Toggle lokasi
const btnLokasiToggle = document.getElementById('btnLokasiToggle');
const labelLokasiToggle = document.getElementById('labelLokasiToggle');
const iconLokasiToggle = document.getElementById('iconLokasiToggle');
let lokasiAktif = false;
let lokasiWatchId = null;
let lokasiIntervalId = null;

function setLokasiToggleUI(on) {
  if (on) {
    btnLokasiToggle.classList.remove('btn-primary');
    btnLokasiToggle.classList.add('btn-success');
    labelLokasiToggle.textContent = 'Lokasi: Dinyalakan';
    iconLokasiToggle.setAttribute('icon', 'mdi:crosshairs-gps');
    iconLokasiToggle.style.color = '#fff';
  } else {
    btnLokasiToggle.classList.remove('btn-success');
    btnLokasiToggle.classList.add('btn-primary');
    labelLokasiToggle.textContent = 'Lokasi: Dimatikan';
    iconLokasiToggle.setAttribute('icon', 'mdi:crosshairs-off');
    iconLokasiToggle.style.color = '';
  }
}

if (btnLokasiToggle) {
  btnLokasiToggle.addEventListener('click', function() {
    if (!lokasiAktif) {
      // Aktifkan lokasi
      if (!navigator.geolocation) {
        alert('Geolocation tidak didukung di browser ini.');
        return;
      }
      btnLokasiToggle.disabled = true;
      setLokasiToggleUI(true);
      lokasiAktif = true;
      // --- Real-time update lokasi ---
      function updateLokasi(pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Update atau buat marker user
        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          userMarker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: 'https://api.iconify.design/mdi:map-marker-circle.svg?color=%23007bff',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
              popupAnchor: [0, -16],
              className: 'user-location-marker'
            })
          }).addTo(map).bindPopup('Lokasi Anda');
        }
        map.setView([lat, lng], 16);
        // Cari halte terdekat
        fetch('halte.geojson')
          .then(res => res.json())
          .then(geojson => {
            let minDist = Infinity;
            let nearest = null;
            geojson.features.forEach(f => {
              if (f.geometry.type === 'Point') {
                const network = f.properties.network || (f.properties.tags && f.properties.tags.network);
                const operator = f.properties.operator || (f.properties.tags && f.properties.tags.operator);
                if (network !== 'Transjakarta' && operator !== 'Transjakarta') return;
                const [lon, lat2] = f.geometry.coordinates;
                const dist = haversine(lat, lng, lat2, lon);
                if (dist < minDist) {
                  minDist = dist;
                  nearest = f;
                }
              }
            });
            if (nearest) {
              // Update atau buat marker halte terdekat
              if (halteNearestMarker) {
                halteNearestMarker.setLatLng([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]]);
              } else {
                halteNearestMarker = L.marker([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], {
                  icon: L.icon({
                    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/layers-2x.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                  })
                }).addTo(map);
              }
              const halteName = nearest.properties && (nearest.properties.name || (nearest.properties.tags && nearest.properties.tags.name)) || 'Halte';
              let koridorList = [];
              if (nearest.properties && nearest.properties.route_ref) {
                if (Array.isArray(nearest.properties.route_ref)) {
                  koridorList = nearest.properties.route_ref;
                } else if (typeof nearest.properties.route_ref === 'string') {
                  koridorList = nearest.properties.route_ref.split(';').map(s => s.trim());
                }
              }
              koridorList = koridorList.map(normalizeKoridorCode).filter(Boolean);
              const koridorBadges = koridorList.map(kor =>
                `<span class="koridor-link mx-1" data-koridor="${kor}" title="${kor}" style="cursor:pointer;text-decoration:underline;color:#0074d9;font-size:0.98em;">${kor}</span>`
              ).join('');
              const koridorInfo = koridorBadges ? `<br>Layanan: ${koridorBadges}` : '';
              halteNearestMarker.bindPopup(`Halte Terdekat:<br><b>${halteName}</b><br>Jarak: ${(minDist/1000).toFixed(2)} km${koridorInfo}`).openPopup();
              setTimeout(() => {
                document.querySelectorAll('.koridor-link').forEach(link => {
                  link.onclick = function(e) {
                    e.stopPropagation();
                    koridorInput.value = this.dataset.koridor;
                    koridorSuggestions.innerHTML = '';
                    showKoridor(this.dataset.koridor);
                    map.closePopup();
                  };
                });
              }, 100);
              halteNearestMarker.on('click', function() {
                if (!lokasiAktif) {
                  if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
                  if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
                }
                // Jika lokasiAktif, jangan hapus marker apapun
              });
            }
          });
      }
      // Selalu gunakan watchPosition untuk update lokasi real-time tanpa jeda
      if (navigator.geolocation.watchPosition) {
        lokasiWatchId = navigator.geolocation.watchPosition(updateLokasi, function(err) {
          alert('Gagal mendapatkan lokasi: ' + err.message);
          setLokasiToggleUI(false);
          lokasiAktif = false;
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 });
      } else {
        alert('Browser tidak mendukung update lokasi real-time.');
        setLokasiToggleUI(false);
        lokasiAktif = false;
      }
      btnLokasiToggle.disabled = false;
    } else {
      // Matikan lokasi
      lokasiAktif = false;
      setLokasiToggleUI(false);
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (halteNearestMarker) { map.removeLayer(halteNearestMarker); halteNearestMarker = null; }
      if (lokasiWatchId !== null) {
        navigator.geolocation.clearWatch(lokasiWatchId);
        lokasiWatchId = null;
      }
      // Tidak perlu clearInterval karena tidak ada polling
    }
  });
}
