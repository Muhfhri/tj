import { koridorData, halteKRL, halteMRT, integrasiBadge, halteIntegrasi } from './dataKoridor.js';

// Tambahkan di awal file (atau sebelum fungsi getJurusan)
(function() {
    const style = document.createElement('style');
    style.innerHTML = `.popover { max-width:220px !important; word-break:break-word; overflow-wrap:break-word; } .popover .bus-popover-img { max-width:100%; max-height:120px; object-fit:contain; background:#f8f9fa; border-radius:8px; padding:2px; display:block; margin:auto; }`;
    document.head.appendChild(style);
})();

// Tambahkan style global untuk efek hover/klik badge koridor interaktif
(function() {
    const style = document.createElement('style');
    style.innerHTML = `
    .badge-koridor-interaktif {
        transition: box-shadow 0.18s, transform 0.18s, filter 0.18s;
    }
    .badge-koridor-interaktif:hover {
        box-shadow: 0 0 0 2px #26469744;
        transform: scale(1.12);
        filter: brightness(1.13);
        cursor: pointer;
        z-index: 2;
    }
    .badge-koridor-interaktif:active {
        transform: scale(0.96);
        filter: brightness(0.95);
    }
    `;
    document.head.appendChild(style);
})();

// Tambahkan di awal file (setelah import dan IIFE style)
const mapImageCache = {};

function getKoridorBadgeColor(koridor) {
    const colorMap = {
        "1": "#D02027",    
        "1A": "#93C3A4",    
        "1F": "#ff7465",    
        "1P": "#FF0040",    
        "1R": "#FC8DA9",    
        "2": "#264697",   
        "2A": "#4FA8DE",   
        "3": "#FCC81B",    
        "3H": "#98692C",    
        "3F": "#b39233",    
        "4": "#562A62",    
        "4C": "#E7A7CA",    
        "4D": "#E58BBA",    
        "4K": "#9626b5",    
        "5": "#BC5827",   
        "5B": "#905B3A",   
        "5C": "#9CD2C6",    
        "5M": "#ff5400",    
        "5N": "#ff4000",
        "6": "#2FA449",   
        "6A": "#76C18A",
        "6B": "#99C175",
        "6V": "#3C9F68",
        "7": "#E2275B",   
        "L7": "#E2275B",   
        "7D": "#53bbb9",   
        "7F": "#ff326b", 
        "8": "#CC2990", 
        "9": "#3F9593",    
        "9A": "#8D9F3D",    
        "9C": "#3C9F68",    
        "9D": "#4DB748",    
        "9N": "#783D3F",    
        "10": "#8F1A1E",   
        "10D": "#9b3337",   
        "10H": "#9c050a",   
        "11": "#2F4FA2",   
        "11D": "#A7BAE0",
        "11Q": "#10C0FF",
        "12": "#62BD73",   
        "13": "#5C359D",   
        "13B": "#972489",   
        "13E": "#761C86",   
        "L13E": "#761C86",   
        "14": "#FF7F00",
        "B11": "#D07C28",
        "B21": "#3BB59C",
        "B25": "#A9C498",
        "B41": "#A9C498",
        "P11": "#A9C498",
        "T31": "#A9C498",
        "PRJ1": "#00a54f",
        "PRJ2": "#00c65c",
        "2C": "#DB5E27",
        // Tambah Warna TJ Koridor lain
    };
    return colorMap[koridor] || "#adb5bd"; // Default abu-abu jika tidak ada warna
}

// Update daftar koridor berdasarkan layanan
function updateKoridorOptions() {
    const koridorSelect = document.getElementById('koridorSelect');
    const serviceSelect = document.getElementById('serviceSelect');
    const selectedService = serviceSelect.value;
    
    koridorSelect.innerHTML = '<option value="" selected>Pilih Koridor...</option>';
    koridorSelect.disabled = false;

    // Add routes for selected service only, format: '1 BLOK M - KOTA'
    for (const koridor in koridorData[selectedService]) {
        const koridorEntry = koridorData[selectedService][koridor];
        const label = `${koridor} ${koridorEntry.start.toUpperCase()} - ${koridorEntry.end.toUpperCase()}`;
        const option = document.createElement('option');
        option.value = koridor;
        option.textContent = label;
        koridorSelect.appendChild(option);
    }

    // Info start/end halte di bawah dropdown (optional, bisa dihapus jika tidak perlu)
    let infoDiv = document.getElementById('koridorStartEndInfo');
    if (!infoDiv) {
        infoDiv = document.createElement('div');
        infoDiv.id = 'koridorStartEndInfo';
        infoDiv.className = 'alert alert-info mt-2 d-none';
        koridorSelect.parentNode.appendChild(infoDiv);
    } else {
        infoDiv.classList.add('d-none');
        infoDiv.innerHTML = '';
    }

    koridorSelect.addEventListener('change', function() {
        const koridor = this.value;
        if (!koridor) {
            infoDiv.classList.add('d-none');
            infoDiv.innerHTML = '';
            return;
        }
        const entry = koridorData[selectedService][koridor];
        infoDiv.classList.remove('d-none');
        infoDiv.innerHTML = `<b>Start:</b> ${entry.start}<br><b>End:</b> ${entry.end}`;
    });

    // Render custom dropdown setiap kali update
    renderCustomKoridorDropdown();
}

// Mendapatkan daftar layanan dan koridor berdasarkan nama halte
function getServicesAndKoridorsByHalte(halteName) {
    const results = [];
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, koridorInfo] of Object.entries(koridors)) {
            if (koridorInfo.haltes.includes(halteName)) {
                results.push({ service, koridor });
            }
        }
    }
    return results;
}

// Menampilkan hasil pencarian halte
function displaySearchResults(query) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (query === '') {
        resultsContainer.innerHTML = '<li class="list-group-item bg-light rounded-3 text-warning">Masukkan nama halte untuk mencari.</li>';
        return;
    }

    const results = new Set();
    for (const koridors of Object.values(koridorData)) {
        for (const koridorInfo of Object.values(koridors)) {
            koridorInfo.haltes.forEach(halte => {
                if (halte.toLowerCase().includes(query.toLowerCase())) {
                    results.add(halte);
                }
            });
        }
    }

    if (results.size === 0) {
        resultsContainer.innerHTML = '<li class="list-group-item bg-light rounded-3 text-danger">Halte tidak ditemukan.</li>';
        return;
    }

    results.forEach(halte => {
        const servicesAndKoridors = getServicesAndKoridorsByHalte(halte);
        servicesAndKoridors.forEach(({ service, koridor }) => {
            const koridorEntry = koridorData[service][koridor];
            const idx = koridorEntry.haltes.indexOf(halte);

            const listItem = document.createElement('li');
            listItem.className = 'list-group-item bg-light d-flex align-items-center';
            listItem.style.cursor = 'pointer';

            // Badge koridor
            const koridorBadge = createKoridorBadge(service, koridor);
            koridorBadge.style.marginRight = "8px";

            // Badge nomor urut halte
            const nomorBadge = document.createElement('span');
            nomorBadge.textContent = String(idx + 1).padStart(2, '0');
            nomorBadge.style.backgroundColor = getKoridorBadgeColor(koridor);
            nomorBadge.style.color = "#fff";
            nomorBadge.style.width = "24px";
            nomorBadge.style.height = "24px";
            nomorBadge.style.display = "inline-flex";
            nomorBadge.style.alignItems = "center";
            nomorBadge.style.justifyContent = "center";
            nomorBadge.style.borderRadius = "50%";
            nomorBadge.style.fontWeight = "bold";
            nomorBadge.style.fontSize = "0.8rem";
            nomorBadge.style.marginRight = "10px";

            // Nama halte (text saja)
            const halteSpan = document.createElement('span');
            halteSpan.className = 'text-dark';
            halteSpan.innerHTML = halte 
                + (halteKRL.includes(halte)
                    ? ` <iconify-icon inline icon="jam:train"></iconify-icon>`
                    : '')
                + (halteMRT.includes(halte)
                    ? ` <iconify-icon inline icon="pepicons-pop:train-circle"></iconify-icon>`
                    : '');
            listItem.appendChild(koridorBadge);
            listItem.appendChild(nomorBadge);
            listItem.appendChild(halteSpan);

            // Klik: langsung arahkan ke koridor dan highlight halte
            listItem.onclick = function() {
                selectKoridor(service, koridor);
                setTimeout(() => {
                    if (service === 'Non-BRT' || service === 'TransJabodetabek') {
                        const koridorEntry = koridorData[service][koridor];
                        let foundDirection = null;
                        let foundHaltes = null;
                        if (koridorEntry.directions) {
                            for (const dir in koridorEntry.directions) {
                                if (koridorEntry.directions[dir].includes(halte)) {
                                    foundDirection = dir;
                                    foundHaltes = koridorEntry.directions[dir];
                                    break;
                                }
                            }
                        }
                        if (foundDirection && foundHaltes) {
                            window._highlightHalte = halte;
                            // Selalu panggil showHaltes agar highlight selalu muncul, meskipun arah sama
                            showHaltes(koridor, foundDirection, foundHaltes, halte);
                            // Tidak perlu trigger klik tombol arah lagi
                        } else {
                            window._highlightHalte = null;
                            displayKoridorResults(service, koridor, halte);
                        }
                    } else {
                        window._highlightHalte = null;
                        displayKoridorResults(service, koridor, halte);
                    }
                }, 150);
            };

            resultsContainer.appendChild(listItem);
        });
    });
}

// Fungsi untuk mendapatkan status operasi berdasarkan hari dan jam
function getOperationalStatus(koridorNumber, service) {
    const koridor = koridorData[service]?.[koridorNumber];
    if (!koridor) return null;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Minggu, 1 = Senin, dst
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + currentMinute/60;

    // Default jam operasi untuk semua koridor
    const defaultHours = {
        start: 5,
        end: 22
    };

    // Special handling for PRJ1 and PRJ2
    if ((koridorNumber === 'PRJ1' || koridorNumber === 'PRJ2' || koridorNumber === '2C') && koridor.operationalSchedule) {
        const schedule = koridor.operationalSchedule;
        let isOperational = false;
        let timeInfo = '';
        let hours = null;
        let dayRange = '';
        let isWeekend = false;
        // Gunakan properti 'type' untuk label hari
        if (schedule.weekend && schedule.weekend.days.includes(currentDay)) {
            hours = schedule.weekend.hours;
            dayRange = schedule.weekend.type === 'weekend' ? 'Sabtu - Minggu' : '';
            isWeekend = true;
        } else if (schedule.weekday && schedule.weekday.days.includes(currentDay)) {
            hours = schedule.weekday.hours;
            dayRange = schedule.weekday.type === 'weekday' ? 'Senin - Jumat' : '';
        }
        // Format jam operasi
        let timeSlots = Array.isArray(hours) ? hours : [hours];
        isOperational = timeSlots.some(slot => currentTime >= slot.start && currentTime < slot.end);
        // Hitung waktu tersisa atau waktu mulai
        if (isOperational) {
            const nextEnd = timeSlots.find(slot => currentTime >= slot.start && currentTime < slot.end)?.end;
            if (nextEnd) {
                const remainingHours = Math.floor(nextEnd - currentTime);
                const remainingMinutes = Math.round((nextEnd - currentTime - remainingHours) * 60);
                timeInfo = `${remainingHours} jam ${remainingMinutes} menit lagi`;
            }
        } else {
            // Cari slot operasi berikutnya
            const nextSlot = timeSlots.find(slot => slot.start > currentTime);
            if (nextSlot) {
                let diff = (nextSlot.start - currentTime + 24) % 24;
                let hoursUntilStart = Math.floor(diff);
                let minutesUntilStart = Math.round((diff - hoursUntilStart) * 60);
                timeInfo = ` (${hoursUntilStart} jam ${minutesUntilStart} menit lagi)`;
            } else {
                // Jika tidak ada slot lagi hari ini, hitung sampai besok
                const firstSlot = timeSlots[0];
                let diff = (24 - currentTime + firstSlot.start) % 24;
                let hoursUntilStart = Math.floor(diff);
                let minutesUntilStart = Math.round((diff - hoursUntilStart) * 60);
                timeInfo = ` (${hoursUntilStart} jam ${minutesUntilStart} menit lagi)`;
            }
        }
        // Format jam operasi string
        let jamOperasiStr = timeSlots.map(slot => `${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00`).join(' | ');
        return {
            isOperational,
            message: isOperational ? 'Sedang beroperasi' : 'Di luar jam operasi',
            timeInfo,
            schedule: {
                weekday: {
                    hours: timeSlots,
                    dayRange: dayRange,
                    jamOperasiStr: jamOperasiStr
                }
            }
        };
    }

    // Jika koridor memiliki jadwal khusus
    if (koridor.operationalSchedule) {
        const schedule = koridor.operationalSchedule;
        const hours = schedule.weekday?.hours || defaultHours;
        const days = schedule.weekday?.days || [];
        
        // Format hari operasi
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        let startDay = dayNames[Math.min(...days)];
        let endDay = dayNames[Math.max(...days)];
        let dayRange = days.length === 7 ? "Setiap hari" : `${startDay} - ${endDay}`;
        // Special case: if days is [6,0] or [0,6], force 'Sabtu - Minggu'
        if (days.length === 2 && days.includes(0) && days.includes(6)) {
            dayRange = 'Sabtu - Minggu';
        }
        
        // Cek apakah hari ini adalah hari operasi
        const isOperationalDay = days.includes(currentDay);
        
        if (!isOperationalDay) {
            // Hitung hari sampai operasi berikutnya
            const nextOperationalDay = days.find(day => day > currentDay) || days[0];
            const daysUntilNext = nextOperationalDay > currentDay ? 
                nextOperationalDay - currentDay : 
                7 - currentDay + nextOperationalDay;
            
            return {
                isOperational: false,
                message: "Tidak beroperasi pada hari ini",
                timeInfo: `${daysUntilNext} hari lagi`,
                schedule: {
                    weekday: { 
                        hours: hours,
                        dayRange: dayRange
                    }
                }
            };
        }

        // Cek apakah dalam jam operasi
        let isOperational = false;
        let timeSlots = [];

        // Jika hours adalah array (multiple time slots)
        if (Array.isArray(hours)) {
            timeSlots = hours.map(slot => ({
                start: slot.start,
                end: slot.end,
                period: slot.start < 12 ? "Pagi" : "Sore"
            }));
            
            isOperational = hours.some(slot => 
                currentTime >= slot.start && currentTime < slot.end
            );
        } else {
            // Single time slot
            timeSlots = [{
                start: hours.start,
                end: hours.end,
                period: ""
            }];
            isOperational = currentTime >= hours.start && currentTime < hours.end;
        }

        // Hitung waktu tersisa atau waktu mulai
        let timeInfo = "";
        if (isOperational) {
            const nextEnd = timeSlots.find(slot => currentTime >= slot.start && currentTime < slot.end)?.end;
            if (nextEnd) {
                const remainingHours = Math.floor(nextEnd - currentTime);
                const remainingMinutes = Math.round((nextEnd - currentTime - remainingHours) * 60);
                timeInfo = ` (${remainingHours} jam ${remainingMinutes} menit lagi)`;
            }
        } else {
            // Cari slot operasi berikutnya
            const nextSlot = timeSlots.find(slot => slot.start > currentTime);
            if (nextSlot) {
                let diff = (nextSlot.start - currentTime + 24) % 24;
                let hoursUntilStart = Math.floor(diff);
                let minutesUntilStart = Math.round((diff - hoursUntilStart) * 60);
                timeInfo = ` (${hoursUntilStart} jam ${minutesUntilStart} menit lagi)`;
            } else {
                // Jika tidak ada slot lagi hari ini, hitung sampai besok
                const firstSlot = timeSlots[0];
                let diff = (24 - currentTime + firstSlot.start) % 24;
                let hoursUntilStart = Math.floor(diff);
                let minutesUntilStart = Math.round((diff - hoursUntilStart) * 60);
                timeInfo = ` (${hoursUntilStart} jam ${minutesUntilStart} menit lagi)`;
            }
        }

        if (isOperational) {
            return {
                isOperational: true,
                message: "Sedang beroperasi",
                timeInfo: timeInfo.replace(/[()]/g, ''),
                schedule: {
                    weekday: { 
                        hours: timeSlots,
                        dayRange: dayRange
                    }
                }
            };
        } else {
            return {
                isOperational: false,
                message: "Di luar jam operasi",
                timeInfo: timeInfo.replace(/[()]/g, ''),
                schedule: {
                    weekday: { 
                        hours: timeSlots,
                        dayRange: dayRange
                    }
                }
            };
        }
    }

    // Gunakan default schedule jika tidak ada jadwal khusus
    if (currentTime >= defaultHours.start && currentTime < defaultHours.end) {
        const remainingHours = Math.floor(defaultHours.end - currentTime);
        const remainingMinutes = Math.round((defaultHours.end - currentTime - remainingHours) * 60);
        return {
            isOperational: true,
            message: "Sedang beroperasi",
            timeInfo: `${remainingHours} jam ${remainingMinutes} menit lagi`,
            schedule: {
                weekday: { 
                    hours: [{
                        start: defaultHours.start,
                        end: defaultHours.end,
                        period: ""
                    }],
                    dayRange: "Setiap hari"
                }
            }
        };
    } else {
        // Hitung waktu sampai operasi besok
        let diff = (24 - currentTime + defaultHours.start) % 24;
        let hoursUntilStart = Math.floor(diff);
        let minutesUntilStart = Math.round((diff - hoursUntilStart) * 60);
        return {
            isOperational: false,
            message: "Di luar jam operasi",
            timeInfo: `${hoursUntilStart} jam ${minutesUntilStart} menit lagi`,
            schedule: {
                weekday: { 
                    hours: [{
                        start: defaultHours.start,
                        end: defaultHours.end,
                        period: ""
                    }],
                    dayRange: "Setiap hari"
                }
            }
        };
    }
}

// Fungsi untuk mendapatkan daftar hari tidak beroperasi
function getNonOperationalDays(schedule) {
    const allDays = [0, 1, 2, 3, 4, 5, 6]; // 0 = Minggu, 1 = Senin, dst
    const operationalDays = new Set([
        ...(schedule.weekday?.days || []),
        ...(schedule.weekend?.days || [])
    ]);
    
    return allDays.filter(day => !operationalDays.has(day));
}

// Fungsi untuk mengecek apakah koridor adalah AMARI
function isAMARIKoridor(koridorNumber, service) {
    const koridor = koridorData[service]?.[koridorNumber];
    return koridor?.isAMARI || false;
}

// Fungsi untuk mendapatkan tarif berdasarkan jam
function getTarif() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + currentMinute/60;
    // --- TARIF KHUSUS TANGGAL TERTENTU ---
    // Contoh: 1 Juli (bulan 6, karena bulan di JS dimulai dari 0)
    if ((now.getDate() === 1 && now.getMonth() === 6)) {
        return {
            amount: 1,
            period: "Tarif Spesial",
            description: "Tarif Spesial Hari Bhayangkara",
            timeInfo: "Tarif hanya berlaku hari ini"
        };
    }
    // Tarif 2000 untuk jam 05:00 - 07:00
    if (currentTime >= 5 && currentTime < 7) {
        const remainingMinutes = Math.round((7 - currentTime) * 60);
        return {
            amount: 2000,
            period: "05:00 - 06:59",
            description: "Tarif Awal",
            timeInfo: `Berlaku ${remainingMinutes} menit lagi`
        };
    }
    
    // Tarif 3500 untuk jam 07:00 - 04:59
    let hoursUntilNext, minutesUntilNext;
    if (currentTime < 5) {
        // Hitung mundur ke jam 5 pagi hari ini
        const nowDate = new Date();
        const next5 = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 5, 0, 0, 0);
        const diffMs = next5 - nowDate;
        hoursUntilNext = Math.floor(diffMs / (1000 * 60 * 60));
        minutesUntilNext = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    } else {
        // Hitung mundur ke jam 5 pagi besok
        const nowDate = new Date();
        const next5 = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1, 5, 0, 0, 0);
        const diffMs = next5 - nowDate;
        hoursUntilNext = Math.floor(diffMs / (1000 * 60 * 60));
        minutesUntilNext = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    }
    return {
        amount: 3500,
        period: "07:00 - 04:59",
        description: "Tarif Normal",
        timeInfo: `Berlaku ${hoursUntilNext} jam ${minutesUntilNext} menit lagi`
    };
}

// Function to create night service badge
function createNightServiceBadge() {
    return '<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info" style="font-size:0.5em;"><iconify-icon icon="mdi:moon-waning-crescent"></iconify-icon></span>';
}

// Function to check if string contains AMARI
function isAMARIService(str) {
    return str.toLowerCase().includes('amari');
}

// Function to remove AMARI text from string
function removeAMARIText(str) {
    return str.replace(/\s*amari\s*/i, '').trim();
}

// Update fungsi getJurusan untuk menampilkan status operasi dan tarif real-time
function getJurusan(koridorNumber, service) {
    const koridor = koridorData[service]?.[koridorNumber];
    const outputElement = document.getElementById("jurusan");

    if (!koridor) {
        outputElement.innerHTML = `Koridor ${koridorNumber} tidak ditemukan.`;
        return;
    }

    const halteAwal = koridor.start;
    const halteAkhir = koridor.end;
    const operator = koridor.operator || "Operator tidak tersedia";
    const busTypes = Array.isArray(koridor.busType) ? koridor.busType : (koridor.busType ? [koridor.busType] : []);
    const isAMARI = isAMARIKoridor(koridorNumber, service);
    const tarif = getTarif();
    const operationalStatus = getOperationalStatus(koridorNumber, service);

    // Format jam operasi
    function formatHours(hours) {
        if (Array.isArray(hours)) {
            return hours.map(slot => 
                slot.period ? `${slot.period}: ${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00` : `${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00`
            ).join(" | ");
        }
        return `${String(hours.start).padStart(2,'0')}:00 - ${String(hours.end).padStart(2,'0')}:00`;
    }

    let busTypeHtml = '';
    if (busTypes.length > 0) {
        // Mapping gambar bus (bisa ditambah sesuai kebutuhan)
        const busTypeToImage = {
            "Volvo B11R": "https://live.staticflickr.com/874/41008899292_7698081274_b.jpg",
            "Mercedes-Benz OH 1626": "https://pbs.twimg.com/media/EMfDLRrUYAU5wAZ.jpg",
            "Mercedes-Benz OH 1526": "https://pbs.twimg.com/media/EhuPuokU4AAniIJ.jpg",
            "Mercedes-Benz O500U": "https://live.staticflickr.com/851/28967921207_220cc5117c_b.jpg",
            "Mercedes-Benz OC 500 RF 2542": "https://live.staticflickr.com/1825/42375369745_d59b0db737_b.jpg",
            "Scania K320IA": "https://mobilkomersial.com/wp-content/uploads/2023/04/Bus-TJ-Gandeng.jpg",
            "Scania K310IB": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Transjakarta_MYS_18116_at_Gambir.jpg/1100px-Transjakarta_MYS_18116_at_Gambir.jpg",
            "Scania K250UB": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Transjakarta_-_TJ632_Scania_K250UB.jpg/250px-Transjakarta_-_TJ632_Scania_K250UB.jpg",
            "Hino RK1 JSNL": "https://live.staticflickr.com/4624/39561244554_fc5cf21761_b.jpg",
            "Hino RK8 R260": "https://live.staticflickr.com/1937/45752656441_bf9489a0bb_b.jpg",
            "Zhongtong Bus LCK6180GC": "https://redigest.web.id/wp-content/uploads/2019/10/IMG_20191011_104316_HDR.jpg",
            "Zhongtong Bus LCK6126EVGRA1": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Transjakarta_-_DMR-240127_01.jpg/250px-Transjakarta_-_DMR-240127_01.jpg",
            "Zhongtong Bus LCK6126EVGRA2": "https://img.okezone.com/content/2025/06/20/1/3148864/bus_listrik_damri-peyD_large.jpg",
            "SAG Golden Dragon XML6125JEVJ0C3": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Transjakarta_-_BMP-240327.jpg/1100px-Transjakarta_-_BMP-240327.jpg",
            "Skywell NJL6126BEV": "https://www.transgo.co.id/wp-content/uploads/2024/11/002.png",
            "Skywell NJL6129BEV": "https://mobilkomersial.com/wp-content/uploads/2024/11/Snapinsta.app_466929837_870028668268355_8248708680309915930_n_1080.jpg",
            "VKTR BYD D9 (EV)": "https://asset.kompas.com/crops/G33-Spk3Y_p-AZPaLFIgdLT1bd0=/13x164:1080x875/1200x800/data/photo/2024/12/03/674e9cfae21a3.jpg",
            "Hino GB 150": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bus_Minitrans_melayani_penumpang_di_rute_6W.jpg/250px-Bus_Minitrans_melayani_penumpang_di_rute_6W.jpg",
            "VKTR BYD B12 (EV)": "https://mobilkomersial.com/wp-content/uploads/2023/07/904275434704_493450525478316_422167581136174078_n.jpg",
            "Mitsubishi Colt FE 84G": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/MiniTrans.jpg/1100px-MiniTrans.jpg",
            "Hino RN8 285" : "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BHL_TJ_Kampung_Rambutan_bus_terminal_20220715.jpg/1100px-BHL_TJ_Kampung_Rambutan_bus_terminal_20220715.jpg"
        };
        // Create a mapping of bus types to their specific operators and type
        const busTypeToOperators = {
            // Volvo Buses
            "Volvo B11R": {
                operators: ["Steady Safe (SAF)"],
                type: "BRT Maxi"
            },
            
            // Mercedes-Benz Buses
            "Mercedes-Benz OH 1626": {
                operators: ["PT Transportasi Jakarta", "Mayasari Bakti", "Bianglala Metropolitan", "Pahala Kencana Transportation"],
                type: "BRT Biasa"
            },
            "Mercedes-Benz OH 1626 amari": {
                operators: ["Bianglala Metropolitan"],
                type: "Layanan AMARI Transjakarta"
            },
            "Mercedes-Benz OH 1526": {
                operators: ["PT Transportasi Jakarta"],
                type: "BRT Biasa"
            },
            "Mercedes-Benz O500U": {
                operators: ["PT Transportasi Jakarta"],
                type: "Low Deck Non-BRT Swakelola"
            },
            "Mercedes-Benz OC 500 RF 2542": {
                operators: ["PT Transportasi Jakarta"],
                type: "BRT Maxi"
            },
            
            // Scania Buses
            "Scania K320IA": {
                operators: ["Mayasari Bakti"],
                type: "Bus Gandeng"
            },
            "Scania K310IB": {
                operators: ["Mayasari Bakti"],
                type: "BRT Maxi"
            },
            "Scania K250UB": {
                operators: ["PT Transportasi Jakarta"],
                type: "Low Deck Non-BRT Swakelola"
            },
            
            // Hino Buses
            "Hino RK1 JSNL": {
                operators: ["PT Transportasi Jakarta"],
                type: "BRT Biasa"
            },
            "Hino RK8 R260": {
                operators: ["Perum DAMRI", "Bianglala Metropolitan"],
                type: "BRT Biasa"
            },
            "Hino RK1 JSNL amari": {
                operators: ["Bianglala Metropolitan"],
                type: "Layanan AMARI  Transjakarta"
            },
            "Hino RK8 R260 amari": {
                operators: ["Bianglala Metropolitan"],
                type: "Layanan AMARI Transjakarta"
            },
            "Hino GB 150": {
                operators: ["Jewa Dian Mitra"],
                type: "Bus Medium Non BRT"
            },
            "Hino RN8 285": {
                operators: ["Bayu Holong Persada"],
                type: "BRT Biasa"
            },
            // Mitsubishi
            "Mitsubishi Colt FE 84G": {
                operators: ["Trans Swadaya (Unit Bisnis Transjakarta)"],
                type: "Bus Medium Non BRT"
            },

            // Zhongtong Buses
            "Zhongtong Bus LCK6180GC": {
                operators: ["Perum DAMRI"],
                type: "Bus Gandeng"
            },
            "Zhongtong Bus LCK6126EVGRA1": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik BRT"
            },
            "Zhongtong Bus LCK6126EVGRA1 amari": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik BRT - Layanan AMARI"
            },
            "Zhongtong Bus LCK6126EVGRA2": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik BRT Zhongtong Batch 2"
            },
            
            // Electric Buses
            "SAG Golden Dragon XML6125JEVJ0C3": {
                operators: ["Bianglala Metropolitan"],
                type: "Bus Listrik BRT"
            },
            "Skywell NJL6126BEV": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik BRT"
            },
            "Skywell NJL6126BEV amari": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik BRT - Layanan AMARI"
            },
            "Skywell NJL6129BEV": {
                operators: ["Perum DAMRI"],
                type: "Bus Listrik Low Deck"
            },
            "VKTR BYD D9 (EV)": {
                operators: ["Sinar Jaya Megah Langgeng"],
                type: "Bus Listrik BRT E-Cityline 3 Laksana"
            },
            "VKTR BYD B12 (EV)":{
                operators: ["Mayasari Bakti"],
                type: "Bus Listrik Low Deck"
                
            }
        };

        busTypeHtml = `
        <span class="text-muted fw-bold small">Jenis Bus :</span>
        <div class="pt-sans-narrow-bold mt-2">
            ${busTypes.map(busType => {
                const isElectric = busType.toLowerCase().includes('ev') || busType.toLowerCase().includes('listrik');
                const isAMARIBus = isAMARIService(busType);
                const busInfo = busTypeToOperators[busType] || { operators: [], type: 'Tidak ada data' };
                const operatorList = busInfo.operators.join(', ');
                const displayBusType = removeAMARIText(busType);
                const imgSrc = busTypeToImage[removeAMARIText(busType)] || 'https://via.placeholder.com/120x40?text=No+Image';
                return `
                    <button 
                        class="btn btn-sm mb-1 me-1 rounded-5 position-relative" 
                        style="background:${getKoridorBadgeColor(koridorNumber)}; color:white; border:none;"
                        data-bs-toggle="popover"
                        data-bs-trigger="hover"
                        data-bs-placement="auto"
                        data-bs-html="true"
                        data-bs-content="<div style='width:140px;display:flex;justify-content:center;align-items:center;'><a href='${imgSrc}' target='_blank' tabindex='-1'><img src='${imgSrc}' alt='${displayBusType}' class='bus-popover-img'></a></div><b>Operator:</b><br>${operatorList || 'Tidak ada data operator'}<br><br><b>Tipe:</b><br>${busInfo.type}"
                    >
                        ${displayBusType}
                        ${isElectric ? '<span class=\"position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning\" style=\"font-size:0.5em;\"><iconify-icon icon=\"mdi:lightning-bolt\"></iconify-icon></span>' : ''}
                        ${isAMARIBus ? createNightServiceBadge() : ''}
                    </button>
                `;
            }).join('')}
        </div>
        <hr>
        `;
    }

    // Process operator string to handle AMARI indicators
    const operatorHtml = (Array.isArray(operator) ? operator : operator.split(',')).map(op => {
        const isAMARIOperator = isAMARIService(op);
        const displayOperator = removeAMARIText(op);
        
        return `
            <span class="badge me-1 shadow-lg rounded-5 position-relative" style="background:${getKoridorBadgeColor(koridorNumber)};">
                ${displayOperator}
                ${isAMARIOperator ? createNightServiceBadge() : ''}
            </span>
        `;
    }).join('');

    outputElement.innerHTML = `
    <div class="pt-sans-narrow-bold">
        Koridor<br>
        <span 
            id="koridorMapBadge"
            class="mt-2 h3 d-inline-flex justify-content-center align-items-center"
            style="
                width:48px;
                height:48px;
                border-radius:50%;
                background:${getKoridorBadgeColor(koridorNumber)};
                color:#fff;
                display:inline-flex;
                font-size:1.3rem;
                font-weight:bold;
                cursor:pointer;"
            title="Lihat peta koridor"
        >${koridorNumber}</span>
        <br><span class="text-muted badge fw-bold">${service}</span>
        ${isAMARI ? '<br><span class="badge bg-info rounded-5 mt-1"><iconify-icon inline icon="mdi:moon-waning-crescent"></iconify-icon> AMARI</span>' : ''}
    </div>
    <div class="pt-sans-narrow-bold fw-bold">${halteAwal} - ${halteAkhir}</div>
    <hr>
    <span class="text-muted fw-bold small">Operator Bus :</span>
    <div class="pt-sans-narrow-bold mt-2">
        ${operatorHtml}
    </div>
    ${busTypeHtml}
    <span class="text-muted fw-bold small">Tarif :</span>
    <div class="pt-sans-narrow-bold mt-2">
        <div class="alert ${tarif.amount === 2000 ? 'alert-info' : 'alert-warning'} py-2 small mb-2">
            <iconify-icon icon="mdi:cash-multiple"></iconify-icon>
            <b>Rp ${tarif.amount.toLocaleString('id-ID')}</b> - ${tarif.description}
            <br>
            <small>${tarif.period}</small>
            <br>
            <small>${tarif.timeInfo}</small>
        </div>
    </div>
    <hr>
    <span class="text-muted fw-bold small">Status Operasi :</span>
    <div class="pt-sans-narrow-bold mt-2">
        ${isAMARI ? `
        <div class="alert alert-info py-2 small mb-2">
            <iconify-icon icon="mdi:bus-clock"></iconify-icon>
            <b>AMARI</b> - Beroperasi 24 jam
        </div>
        ` : `
        <div class="alert ${operationalStatus.isOperational ? 'alert-success' : 'alert-danger'} py-2 small mb-2">
            <iconify-icon icon="mdi:bus-clock"></iconify-icon>
            <b>${operationalStatus.message}</b>
        </div>
        <div class="small mb-2">
            <span class="badge rounded-5" style="background:${operationalStatus.isOperational ? '#198754' : '#dc3545'}; color:white;">
                ${operationalStatus.timeInfo}
            </span>
        </div>
        <div class="small">
            ${operationalStatus.schedule.weekday ? `
            <div class="mb-1">
                <b>${operationalStatus.schedule.weekday.dayRange} <br> ${operationalStatus.schedule.weekday.jamOperasiStr || formatHours(operationalStatus.schedule.weekday.hours)}
            </div>
            ` : ''}
        </div>
        `}
    </div>
    ${ (service === "Non-BRT" || service === "TransJabodetabek") ? `
    <hr>
    <span class="text-muted fw-bold small">Arah :</span>
    <div class="pt-sans-narrow-bold mt-2">
        <div class="d-flex flex-wrap gap-2 justify-content-center">
            <button class="btn btn-sm rounded-5 direction-btn active" data-direction="forward" style="background:${getKoridorBadgeColor(koridorNumber)}; color:white; border:none; min-width:150px; padding: 8px 16px;">
                 ${halteAwal} <iconify-icon  inline icon="ei:arrow-left"></iconify-icon>
            </button>
            <button class="btn btn-sm rounded-5 direction-btn" data-direction="backward" style="background:transparent; color:${getKoridorBadgeColor(koridorNumber)}; border:2px solid ${getKoridorBadgeColor(koridorNumber)}; min-width:150px; padding: 8px 16px;">
                <iconify-icon  inline icon="ei:arrow-right"></iconify-icon> ${halteAkhir}
            </button>
        </div>
        <div id="haltesList-${koridorNumber}" class="mt-3"></div>
    </div>
    ` : '' }
    `;

    // Initialize Bootstrap popovers
    const popoverTriggerList = outputElement.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    // Add event listeners after the HTML is inserted
    if (service === "Non-BRT" || service === "TransJabodetabek") {
        const buttons = outputElement.querySelectorAll('.direction-btn');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                buttons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = getKoridorBadgeColor(koridorNumber);
                    btn.style.border = `2px solid ${getKoridorBadgeColor(koridorNumber)}`;
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                this.style.background = getKoridorBadgeColor(koridorNumber);
                this.style.color = 'white';
                this.style.border = 'none';
                const direction = this.getAttribute('data-direction');
                // Simpan state arah ke localStorage per koridor
                localStorage.setItem('lastDirection_' + koridorNumber, direction);
                const halteAwal = koridor.start;
                const halteAkhir = koridor.end;
                
                // Khusus untuk Koridor 11Q, selalu gunakan directions
                if (koridorNumber === "11Q") {
                    if (direction === 'forward') {
                        showHaltes(
                            koridorNumber,
                            halteAwal,
                            halteAkhir,
                            koridor.directions[halteAwal],
                            window._highlightHalte || null
                        );
                    } else {
                        showHaltes(
                            koridorNumber,
                            halteAkhir,
                            halteAwal,
                            koridor.directions[halteAkhir],
                            window._highlightHalte || null
                        );
                    }
                } else {
                    // Untuk koridor lain, cek apakah ada data directions
                    const hasDirections = koridor.directions && 
                        koridor.directions[halteAwal] && 
                        koridor.directions[halteAkhir] &&
                        koridor.directions[halteAwal].length > 0 &&
                        koridor.directions[halteAkhir].length > 0;

                    if (hasDirections) {
                        // Gunakan data directions jika ada
                        if (direction === 'forward') {
                            showHaltes(
                                koridorNumber,
                                halteAwal,
                                halteAkhir,
                                koridor.directions[halteAwal],
                                window._highlightHalte || null
                            );
                        } else {
                            showHaltes(
                                koridorNumber,
                                halteAkhir,
                                halteAwal,
                                koridor.directions[halteAkhir],
                                window._highlightHalte || null
                            );
                        }
                    } else {
                        // Fallback ke data haltes jika directions tidak ada
                        if (direction === 'forward') {
                            showHaltes(
                                koridorNumber,
                                halteAwal,
                                halteAkhir,
                                koridor.haltes.slice(0, Math.floor(koridor.haltes.length/2)),
                                window._highlightHalte || null
                            );
                        } else {
                            showHaltes(
                                koridorNumber,
                                halteAkhir,
                                halteAwal,
                                koridor.haltes.slice(Math.floor(koridor.haltes.length/2)).reverse(),
                                window._highlightHalte || null
                            );
                        }
                    }
                }
            });
        });
        // Restore state arah dari localStorage jika ada
        const lastDirection = localStorage.getItem('lastDirection_' + koridorNumber);
        if (lastDirection) {
            const btn = outputElement.querySelector(`[data-direction="${lastDirection}"]`);
            if (btn) btn.click();
        } else {
        const forwardButton = outputElement.querySelector('[data-direction="forward"]');
            if (forwardButton) forwardButton.click();
        }
    }

    // Setelah render, tambahkan event listener pada badge koridor untuk modal peta
    const badge = outputElement.querySelector('#koridorMapBadge');
    if (badge) {
        badge.onclick = function(e) {
            e.stopPropagation();
            const koridorEntry = koridorData[service]?.[koridorNumber];
            if (koridorEntry && koridorEntry.map) {
                // Pastikan modal sudah ada
                let modal = null;
                // Hapus modal lama jika ada
                const oldModal = document.getElementById('modalMapKoridor');
                if (oldModal) oldModal.remove();
                if (!document.getElementById('modalMapKoridor')) {
                    const modalHtml = `
                    <div class=\"modal fade\" id=\"modalMapKoridor\" tabindex=\"-1\" aria-labelledby=\"modalMapKoridorLabel\" aria-hidden=\"true\">\n                      <div class=\"modal-dialog modal-dialog-centered modal-lg\">\n                        <div class=\"modal-content\">\n                          <div class=\"modal-header\">\n                           <button id=\"modalMapPrevBtn\" class=\"btn btn-outline-dark btn-sm rounded-circle me-2\"><b>&lt;</b></button>\n                            <h5 class=\"modal-title fw-bold plus-jakarta-sans d-flex align-items-center gap-2\" id=\"modalMapKoridorLabel\">Peta Koridor <span id=\"modalKoridorBadge\"></span></h5>\n                            <button id=\"modalMapNextBtn\" class=\"btn btn-outline-dark btn-sm rounded-circle ms-2\"><b>&gt;</b></button>\n                            <button type=\"button\" class=\"btn btn-outline-dark\" data-bs-dismiss=\"modal\" aria-label=\"Tutup\"><iconify-icon inline  icon=\"line-md:close\"></iconify-icon></button>\n                          </div>\n                          <div class=\"modal-body text-center\">\n                            <div id=\"modalKoridorJurusan\" class=\"fw-bold fs-5 mb-2\"></div>\n                            <img id=\"imgMapKoridor\" src=\"\" alt=\"Peta Koridor\" class=\"img-fluid rounded shadow\">\n                          </div>\n                        </div>\n                      </div>\n                    </div>`;
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                }
                modal = new bootstrap.Modal(document.getElementById('modalMapKoridor'));
                modal.show();
                // Tambahkan event handler next/back agar navigasi berfungsi
                const koridorList = getKoridorListForService(service);
                let idx = koridorList.indexOf(koridorNumber);
                // Preload semua gambar peta koridor untuk layanan ini
                koridorList.forEach(kor => {
                    const mapUrl = koridorData[service][kor]?.map;
                    if (mapUrl && !mapImageCache[mapUrl]) {
                        const img = new window.Image();
                        img.src = mapUrl;
                        mapImageCache[mapUrl] = img;
                    }
                });
                function updateModalKoridor(idxBaru) {
                    const koridorBaru = koridorList[idxBaru];
                    const koridorEntryBaru = koridorData[service][koridorBaru];
                    const badgeSpan = document.getElementById('modalKoridorBadge');
                    if (badgeSpan) {
                        badgeSpan.innerHTML = `
                          <span class=\"pt-sans\" style=\"
                            display:inline-flex;
                            align-items:center;
                            justify-content:center;
                            width:32px;
                            height:32px;
                            border-radius:50%;
                            background:${getKoridorBadgeColor(koridorBaru)};
                            color:#fff;
                            font-weight:bold;
                            font-size:0.8em;
                            margin-left:4px;\">
                            ${koridorBaru}
                          </span>
                        `;
                    }
                    // Update jurusan di modal
                    const jurusanDiv = document.getElementById('modalKoridorJurusan');
                    if (jurusanDiv) {
                        let jurusanText = `${koridorEntryBaru.start} - ${koridorEntryBaru.end}`;
                        const viaMatch = jurusanText.match(/(.*?)( VIA .*)/i);
                        if (viaMatch) {
                            jurusanDiv.innerHTML = `${viaMatch[1]}<span class='text-muted'>${viaMatch[2]}</span>`;
                        } else {
                            jurusanDiv.textContent = jurusanText;
                        }
                    }
                    const imgElem = document.getElementById('imgMapKoridor');
                    const mapUrl = koridorEntryBaru.map;
                    if (mapUrl && mapImageCache[mapUrl] && mapImageCache[mapUrl].complete) {
                        imgElem.src = mapUrl;
                    } else {
                        imgElem.src = mapUrl; // fallback, browser akan cache juga
                    }
                    imgElem.alt = `Peta Koridor ${koridorBaru}`;
                    document.getElementById('modalMapPrevBtn').disabled = idxBaru <= 0;
                    document.getElementById('modalMapNextBtn').disabled = idxBaru >= koridorList.length - 1;
                    idx = idxBaru;
                    // Simpan koridor terakhir yang ditampilkan di modal ke localStorage
                    saveKoridorState(service, koridorBaru);
                }
                // Setelah modal ditutup, update tampilan halte/jurusan sesuai koridor terakhir di modal
                const modalEl = document.getElementById('modalMapKoridor');
                modalEl.addEventListener('hidden.bs.modal', function() {
                    // Ambil koridor terakhir dari idx
                    const koridorTerakhir = koridorList[idx];
                    saveKoridorState(service, koridorTerakhir);
                    displayKoridorResults(service, koridorTerakhir);
                });
                // Setelah modal muncul, langsung update jurusan dan gambar pertama kali
                setTimeout(() => {
                    updateModalKoridor(idx);
                    document.getElementById('modalMapPrevBtn').onclick = function() {
                        if (idx > 0) updateModalKoridor(idx - 1);
                    };
                    document.getElementById('modalMapNextBtn').onclick = function() {
                        if (idx < koridorList.length - 1) updateModalKoridor(idx + 1);
                    };
                }, 10);
            } else {
                alert('Peta koridor belum tersedia untuk koridor ini.');
            }
        };
    }
}

// Menampilkan daftar halte dalam koridor yang dipilih
function displayKoridorResults(service, koridor, highlightHalte = null) {
    const resultsContainer = document.getElementById('koridorResults');
    resultsContainer.innerHTML = '';

    // Tombol reset jika ada state koridor
    const koridorState = loadKoridorState();
    if (koridorState && koridorState.service && koridorState.koridor) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-sm btn-outline-secondary mb-2 rounded-5 px-3';
        resetBtn.textContent = 'Tutup';
        resetBtn.onclick = function() {
            clearKoridorState();
            document.getElementById('serviceSelect').value = '';
            updateKoridorOptions();
            document.getElementById('koridorSelect').value = '';
            resultsContainer.innerHTML = '';
            document.getElementById('jurusan').innerHTML = '';
        };
        resultsContainer.appendChild(resetBtn);
    }

    // Check BRT, Non-BRT, dan TransJabodetabek
    const koridorDataEntry = koridorData[service]?.[koridor];
    if (!koridor || !koridorDataEntry) return;

    // Determine service type
    let serviceType = "BRT";
    if (koridorData["Non-BRT"]?.[koridor]) serviceType = "Non-BRT";
    if (koridorData["TransJabodetabek"]?.[koridor]) serviceType = "TransJabodetabek";

    // Tampilkan jurusan di atas daftar halte
    const jurusanDiv = document.createElement('div');
    resultsContainer.appendChild(jurusanDiv);

    // Show halte list for BRT routes
    if (serviceType === "BRT") {
        // Buat mapping halte ke semua index kemunculannya
        const halteIndexes = {};
        koridorDataEntry.haltes.forEach((halte, idx) => {
            if (!halteIndexes[halte]) halteIndexes[halte] = [];
            halteIndexes[halte].push(idx);
        });

        // Penomoran khusus untuk Koridor 1: ASEAN & Kejaksaan Agung = 2, Masjid Agung = 3, dst
        let nomorOverride = {};
        if (koridor === "1") {
            const idxAsean = koridorDataEntry.haltes.indexOf("ASEAN");
            const idxKejagung = koridorDataEntry.haltes.indexOf("Kejaksaan Agung");
            const idxMasjid = koridorDataEntry.haltes.indexOf("Masjid Agung");
            if (idxAsean !== -1 && idxKejagung !== -1 && idxMasjid !== -1) {
                nomorOverride[idxAsean] = 2;
                nomorOverride[idxKejagung] = 2;
                nomorOverride[idxMasjid] = 3;
            }
        }
        if (koridor === "12") {
            const idxPenjaringan = koridorDataEntry.haltes.indexOf("Penjaringan");
            const idxBandengan = koridorDataEntry.haltes.indexOf("Bandengan");
            const idxKaliBesar = koridorDataEntry.haltes.indexOf("Kali Besar");
            if (idxPenjaringan !== -1) nomorOverride[idxPenjaringan] = 25;
            if (idxBandengan !== -1) nomorOverride[idxBandengan] = 24;
            if (idxKaliBesar !== -1) nomorOverride[idxKaliBesar] = 23;

            const idxManggaDuaRaya = koridorDataEntry.haltes.indexOf("Mangga Dua Raya");
    if (idxManggaDuaRaya !== -1) nomorOverride[idxManggaDuaRaya] = 7;

    const idxManggaDua = koridorDataEntry.haltes.indexOf("Mangga Dua");
    if (idxManggaDua !== -1) nomorOverride[idxManggaDua] = 8;

    const idxGunungSahari = koridorDataEntry.haltes.indexOf("Gunung Sahari");
    if (idxGunungSahari !== -1) nomorOverride[idxGunungSahari] = 9;

    const idxJembatanMerah = koridorDataEntry.haltes.indexOf("Jembatan Merah");
    if (idxJembatanMerah !== -1) nomorOverride[idxJembatanMerah] = 10;

    const idxLandasanPacu = koridorDataEntry.haltes.indexOf("Landasan Pacu");
    if (idxLandasanPacu !== -1) nomorOverride[idxLandasanPacu] = 11;

    const idxDanauAgung = koridorDataEntry.haltes.indexOf("Danau Agung");
    if (idxDanauAgung !== -1) nomorOverride[idxDanauAgung] = 12;

    const idxDanauSunter = koridorDataEntry.haltes.indexOf("Danau Sunter");
    if (idxDanauSunter !== -1) nomorOverride[idxDanauSunter] = 13;

    const idxSunterUtara = koridorDataEntry.haltes.indexOf("Sunter Utara");
    if (idxSunterUtara !== -1) nomorOverride[idxSunterUtara] = 14;

    const idxSunterKarya = koridorDataEntry.haltes.indexOf("Sunter Karya");
    if (idxSunterKarya !== -1) nomorOverride[idxSunterKarya] = 15;

    const idxSunterBoulevardBarat = koridorDataEntry.haltes.indexOf("Sunter Boulevard Barat");
    if (idxSunterBoulevardBarat !== -1) nomorOverride[idxSunterBoulevardBarat] = 16;

    const idxSunterKelapaGading = koridorDataEntry.haltes.indexOf("Sunter Kelapa Gading");
    if (idxSunterKelapaGading !== -1) nomorOverride[idxSunterKelapaGading] = 17;

    const idxPlumpang = koridorDataEntry.haltes.indexOf("Plumpang");
    if (idxPlumpang !== -1) nomorOverride[idxPlumpang] = 18;

    const idxWalikotaJakartaUtara = koridorDataEntry.haltes.indexOf("Walikota Jakarta Utara");
    if (idxWalikotaJakartaUtara !== -1) nomorOverride[idxWalikotaJakartaUtara] = 19;

    const idxKoja = koridorDataEntry.haltes.indexOf("Koja");
    if (idxKoja !== -1) nomorOverride[idxKoja] = 20;

    const idxMambo = koridorDataEntry.haltes.indexOf("Mambo");
    if (idxMambo !== -1) nomorOverride[idxMambo] = 21;

    const idxTanjungPriok = koridorDataEntry.haltes.indexOf("Tanjung Priok");
    if (idxTanjungPriok !== -1) nomorOverride[idxTanjungPriok] = 22;
        }
        if (koridor === "2") {
            const idxKwitang = koridorDataEntry.haltes.indexOf("Kwitang");
            const idxGambir2 = koridorDataEntry.haltes.indexOf("Gambir 2");
            const idxBalaiKota = koridorDataEntry.haltes.indexOf("Balai Kota");
            const idxMonas = koridorDataEntry.haltes.indexOf("Monumen Nasional");
            if (idxKwitang !== -1) nomorOverride[idxKwitang] = 24;
            if (idxGambir2 !== -1) nomorOverride[idxGambir2] = 23;
            if (idxBalaiKota !== -1) nomorOverride[idxBalaiKota] = 22;
            if (idxMonas !== -1) nomorOverride[idxMonas] = 21;
        }

        koridorDataEntry.haltes.forEach((halte, idx) => {
            let nomorUrut;
            if ((koridor === "1" || koridor === "2" || koridor === "12") && nomorOverride[idx]) {
                nomorUrut = nomorOverride[idx];
            } else {
                // Default: nomor urut terkecil dari nama halte
                nomorUrut = Math.min(...halteIndexes[halte]) + 1;
                // Jika setelah Masjid Agung, tambahkan offset jika perlu
                if (koridor === "1" && idx > koridorDataEntry.haltes.indexOf("Masjid Agung")) {
                        nomorUrut = idx;
                }
            }

            // Penanda arah
            let arah = "";
            if (koridor === "1") {
                if (halte === "ASEAN") arah = "→ ke Masjid Agung";
                if (halte === "Kejaksaan Agung") arah = "→ ke BLOK M";
                if (halte === "Museum Sejarah Jakarta") arah = "→ arah BLOK M";
                if (halte === "Kota") arah = "→ arah BLOK M";
            }
            if (koridor === "2") {
                if (halte === "Kwitang") arah = "→ ke Senen TOYOTA Rangga";
            }
            if (koridor === "3F") {
                if (halte === "Grogol Reformasi") arah = "→ arah Senayan BANK DKI";
            }
            if (koridor === "3H") {
                if (["Kali Besar", "Museum Sejarah Jakarta"].includes(halte)) {
                    arah = "→ arah Kota";
                }
            }
            if (koridor === "4") {
                if (["Matraman", "Tegalan", "Kesatrian"].includes(halte)) {
                    arah = "→ arah Galunggung";
                }
                if (halte === "Flyover Pramuka") arah = "← arah Pulo Gadung";
            }
            if (koridor === "4D") {
                if (["Matraman", "Tegalan", "Kesatrian"].includes(halte)) {
                    arah = "→ arah Galunggung";
                }
                else if (["Flyover Pramuka", "Flyover Kuningan"].includes(halte)) {
                    arah = "← arah Pulo Gadung";
                }
            }
            if (koridor === "5") {
                if (["Jatinegara", "Bali Mester"].includes(halte)) {
                    arah = "→ arah Kampung Melayu";
                }
            }
            if (koridor === "5C") {
                if (["Jatinegara", "Bali Mester"].includes(halte)) {
                    arah = "→ arah Kampung Melayu";
                }
            }
            if (koridor === "6") {
                if (["Flyover Kuningan", "Halimun"].includes(halte)) {
                    arah = "→ arah Galunggung";
                }
            }
            if (koridor === "6B") {
                if (halte === "Semanggi") arah = "→ arah Balai Kota";
            }
            if (koridor === "6V") {
                if (halte === "ASEAN") arah = "← arah Ragunan";
            }
            if (koridor === "7F") {
                if (halte === "Pasar Induk") arah = "← Masuk TOL Jagorawi arah Utan Kayu Rawamangun";
                if (halte === "Juanda") arah = "→ arah Pasar Baru";
                if (halte === "Pecenongan") arah = "← arah Juanda";
                if (halte === "Sumur Batu") arah = "→ arah Kampung Rambutan langsung ke Pulomas Bypass";
                if (halte === "Pecenongan") arah = "← arah Juanda";
                if (halte === "Cempaka Mas") arah = "← hanya berhenti arah Juanda";
                if (halte === "Cempaka Putih") arah = "← hanya berhenti arah Juanda";
                if (halte === "Pasar Baru") arah = "→ Arah Kampung Rambutan langsung ke Kwitang";
                if (halte === "Utan Kayu Rawamangun") arah = "→ Masuk TOL Jagorawi arah Pasar Induk";
            }
            if (koridor === "L7") {
                if (halte === "Kampung Rambutan") arah = "→ Masuk TOL HEK arah Cawang Sentral";
                if (halte === "Cawang Sentral") arah = "← Masuk TOL HEK arah Kampung Rambutan";
            }
            if (koridor === "8") {
                if (halte === "Grogol Reformasi") arah = "→ arah Pasar Baru";
                if (halte === "Pondok Pinang") arah = "→ arah Pasar Baru";
            }
             if (koridor === "9C") {
                if (halte === "Semanggi") arah = "← arah Pinang Ranti";
            }
            if (koridor === "11") {
                if (halte === "Jatinegara") arah = "→ arah Kampung Melayu";
                if (halte === "Kampung Melayu") arah = "← ke Stasiun Jatinegara";
            }
             if (koridor === "12") {
                if (["Penjaringan", "Bandengan", "Kali Besar"].includes(halte)) {
                    arah = "← Pluit";
                } else if (["Pluit", "Pluit Selatan", "Pakin", "Gedong Panjang", "Museum Sejarah Jakarta", "Kota"].includes(halte)) {
                    arah = "→ Tanjung Priok";
                }
            }

            if (koridor === "13") {
                if (halte === "Puri Beta 1") arah = "→ arah Tegal Mampang";
            }
             if (koridor === "13B") {
                if (["Pancoran", "Tegal Mampang"].includes(halte)) {
                    arah = "→ arah Puri Beta 2";
                }  if (halte === "Puri Beta 1") arah = "← arah Pancoran";
            }
            if (koridor === "13E") {
                if (["Underpass Kuningan", "Tegal Mampang"].includes(halte)) {
                    arah = "← Arah Puri Beta 2";
                } else if (["Simpang Kuningan", "Puri Beta 1"].includes(halte)) {
                    arah = "→ arah Flyover Kuningan";
                }
            }
            if (koridor === "L13E") {
                if (["Underpass Kuningan", "Tegal Mampang"].includes(halte)) {
                    arah = "← Arah Puri Beta 2";
                } else if (["Simpang Kuningan", "Puri Beta 1"].includes(halte)) {
                    arah = "→ Flyover Kuningan";
                }
            }

            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex bg-light align-items-center justify-content-between';
            listItem.style.flexWrap = "wrap";
            listItem.style.gap = "8px";

            // Highlight jika halte ini adalah yang dicari
            if (highlightHalte && halte === highlightHalte) {
                listItem.style.background = '#ffe066';
                listItem.style.boxShadow = '0 0 0 2px #ffd700';
            }

            // Kiri: badge nomor urut + nama halte + arah
            const left = document.createElement('div');
            left.className = "d-flex align-items-center";
            left.style.flex = "1";
            left.style.minWidth = "200px";

            // Badge nomor urut halte
            const nomorBadge = document.createElement('span');
            nomorBadge.textContent = String(nomorUrut).padStart(2, '0');
            nomorBadge.style.backgroundColor = getKoridorBadgeColor(koridor);
            nomorBadge.style.color = "#fff";
            nomorBadge.style.minWidth = "28px";
            nomorBadge.style.height = "28px";
            nomorBadge.style.display = "inline-flex";
            nomorBadge.style.alignItems = "center";
            nomorBadge.style.justifyContent = "center";
            nomorBadge.style.borderRadius = "50%";
            nomorBadge.style.fontWeight = "bold";
            nomorBadge.style.fontSize = "0.9rem";
            nomorBadge.style.marginRight = "10px";
            nomorBadge.style.flexShrink = "0";

            // Nama halte (link)
            const halteLink = document.createElement('a');
            halteLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Halte Transjakarta ' + halte)}`;
            halteLink.target = '_blank';
            halteLink.className = 'text-decoration-none text-dark';
            halteLink.innerHTML = halte 
                + (arah ? ` <span class=\"text-secondary small\">${arah}</span>` : '')
                + (halteKRL.includes(halte) ? ` <iconify-icon inline icon=\"jam:train\"></iconify-icon>` : '')
                + (halteMRT.includes(halte) ? ` <iconify-icon inline icon=\"pepicons-pop:train-circle"></iconify-icon>` : '');

            left.appendChild(nomorBadge);
            left.appendChild(halteLink);

            // Tambahkan penanda khusus untuk koridor 13
            if (koridor === "13") {
                if (halte === "CBD Ciledug") {
                    const info = document.createElement('div');
                    info.className = 'text-muted small ms-2 d-flex align-items-center';
                    info.innerHTML = '<iconify-icon icon=\"mdi:white-balance-sunny\" style=\"font-size:1em;margin-right:4px;\"></iconify-icon>Layanan 05.00–22.00';
                    left.appendChild(info);
                }
                if (halte === "Puri Beta 2") {
                    const info = document.createElement('div');
                    info.className = 'text-muted small ms-2 d-flex align-items-center';
                    info.innerHTML = '<iconify-icon icon=\"mdi:moon-waning-crescent\" style=\"font-size:1em;margin-right:4px;\"></iconify-icon>Layanan 22.00–05.00';
                    left.appendChild(info);
                }
            }

            // Kanan: badge koridor lain (selain koridor utama)
            const badges = document.createElement('div');
            badges.className = "d-flex flex-wrap gap-1";
            badges.style.flexShrink = "0";
            badges.style.maxWidth = "100%";
            badges.style.justifyContent = "flex-end";

            const servicesAndKoridors = getServicesAndKoridorsByHalte(halte);
            servicesAndKoridors.forEach(({ service: svc, koridor: kor }) => {
                if (kor !== koridor) {
                    const badge = createKoridorBadge(svc, kor);
                    badges.appendChild(badge);
                }
            });
            // Tambahkan badge integrasi manual jika ada
            if (integrasiBadge[halte]) {
                integrasiBadge[halte].forEach(kor => {
                    if (kor !== koridor) {
                        const badge = createKoridorBadge("BRT", kor);
                        badges.appendChild(badge);
                    }
                });
            }

            listItem.appendChild(left);
            listItem.appendChild(badges);
            resultsContainer.appendChild(listItem);
        });
    }

    getJurusan(koridor, serviceType);
}

// Fungsi untuk memilih koridor ketika badge diklik
window.selectKoridor = function(service, koridor) {
    // Update service select to match the selected service
    const serviceSelect = document.getElementById('serviceSelect');
    serviceSelect.value = service;
    
    // Update koridor options based on selected service
    updateKoridorOptions();
    
    // Set the koridor select value and display results
    setTimeout(() => {
        const koridorSelect = document.getElementById('koridorSelect');
        koridorSelect.value = koridor;
        saveKoridorState(service, koridor);
        displayKoridorResults(service, koridor);
        // Scroll ke elemen jurusan (bukan koridorResults)
        const jurusanSection = document.getElementById('jurusan');
        if (jurusanSection) {
            const offset = 0;
            const elementPosition = jurusanSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }, 100);
}

// Fungsi untuk mencari layanan dan koridor
function searchServiceKoridor(query) {
    const results = [];
    for (const service in koridorData) {
        for (const koridor in koridorData[service]) {
            const koridorEntry = koridorData[service][koridor];

            // Periksa apakah query cocok dengan nomor koridor
            const isKoridorMatch = koridor.toLowerCase().includes(query.toLowerCase());

            // Periksa apakah query cocok dengan halte awal, akhir, atau nama halte
            const isStartMatch = koridorEntry.start.toLowerCase().includes(query.toLowerCase());
            const isEndMatch = koridorEntry.end.toLowerCase().includes(query.toLowerCase());
            const matchingHaltes = koridorEntry.haltes.filter(halte =>
                halte.toLowerCase().includes(query.toLowerCase())
            );

            // Jika cocok, tambahkan ke hasil
            if (isKoridorMatch || isStartMatch || isEndMatch || matchingHaltes.length > 0) {
                results.push({
                    service,
                    koridor,
                    jurusan: `${koridorEntry.start} - ${koridorEntry.end}`,
                    haltes: matchingHaltes // Halte yang cocok
                });
            }
        }
    }
    return results;
}

// Fungsi untuk menampilkan hasil pencarian
function displayAutocompleteResults(results) {
    const autocompleteResults = document.getElementById("autocompleteResults");
    const query = document.getElementById("searchServiceKoridor").value.toLowerCase();
    autocompleteResults.innerHTML = ""; // Bersihkan hasil sebelumnya

    if (results.length === 0) {
        const noResultItem = document.createElement("li");
        noResultItem.className = "list-group-item text-center";
        noResultItem.textContent = "Tidak ada hasil ditemukan.";
        autocompleteResults.appendChild(noResultItem);
        return;
    }

    results.forEach(({ service, koridor, jurusan, haltes }) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item bg-light d-flex flex-column";

        // Baris atas: badge koridor + jurusan
        const topRow = document.createElement("div");
        topRow.className = "d-flex align-items-center mb-1";

        // Badge koridor
        const koridorBadge = createKoridorBadge(service, koridor);
        koridorBadge.style.marginRight = "10px";
        koridorBadge.style.fontSize = "1em";
        koridorBadge.style.width = "28px";
        koridorBadge.style.height = "28px";

        // Jurusan dengan highlight
        const jurusanText = document.createElement("span");
        jurusanText.className = "fw-bold";
        const parts = jurusan.split(new RegExp(`(${query})`, 'gi'));
        parts.forEach(part => {
            if (part.toLowerCase() === query) {
                const highlight = document.createElement("span");
                highlight.className = "fw-bold";
                highlight.style.color = "#0d6efd";
                highlight.textContent = part;
                jurusanText.appendChild(highlight);
            } else {
                jurusanText.appendChild(document.createTextNode(part));
            }
        });

        // Tambahkan jenis bus (BRT/Non-BRT)
        const jenisBus = document.createElement("div");
        jenisBus.className = "text-muted small";
        jenisBus.textContent = service; // BRT atau Non-BRT

        topRow.appendChild(koridorBadge);
        topRow.appendChild(jurusanText);

        // Baris bawah: halte yang cocok (jika ada)
        let haltesRow = null;
        if (haltes.length > 0) {
            haltesRow = document.createElement("div");
            haltesRow.className = "mt-1";
            haltes.forEach(halte => {
                const halteBadge = document.createElement("span");
                const parts = halte.split(new RegExp(`(${query})`, 'gi'));
                parts.forEach(part => {
                    if (part.toLowerCase() === query) {
                        const highlight = document.createElement("span");
                        highlight.className = "fw-bold";
                        highlight.style.color = "#0d6efd";
                        highlight.textContent = part;
                        halteBadge.appendChild(highlight);
                    } else {
                        halteBadge.appendChild(document.createTextNode(part));
                    }
                });
                halteBadge.style.background = "#eee";
                halteBadge.style.color = "#333";
                halteBadge.style.borderRadius = "12px";
                halteBadge.style.fontSize = "0.85em";
                halteBadge.style.padding = "2px 10px";
                halteBadge.style.marginRight = "6px";
                halteBadge.style.display = "inline-block";
                halteBadge.style.marginBottom = "2px";
                haltesRow.appendChild(halteBadge);
            });
        }

        // Gabungkan ke list item
        listItem.appendChild(topRow);
        listItem.appendChild(jenisBus); // Tambahkan jenis bus
        if (haltesRow) listItem.appendChild(haltesRow);

        // Klik: pilih koridor
        listItem.onclick = () => {
            const searchInput = document.getElementById("searchServiceKoridor");
            searchInput.value = koridor;
            autocompleteResults.innerHTML = "";
            selectKoridor(service, koridor);
        };

        autocompleteResults.appendChild(listItem);
    });
}

// Helper: Normalisasi nama halte (case-insensitive, hilangkan spasi ekstra)
function normalizeHalteName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Helper: Cari nama halte asli dari input user (case-insensitive)
function findRealHalteName(input) {
    const normInput = normalizeHalteName(input);
    for (const halte of getAllHalteNames()) {
        if (normalizeHalteName(halte) === normInput) return halte;
    }
    return input; // fallback, biar error handling tetap jalan
}

function findRoutePanduan(halteAsal, halteTujuan) {
    halteAsal = findRealHalteName(halteAsal);
    halteTujuan = findRealHalteName(halteTujuan);
    // 0. Cek apakah halteAsal dan halteTujuan terhubung langsung via integrasi
    const isLangsungIntegrasi = halteIntegrasi.some(([h1, h2]) =>
        (h1 === halteAsal && h2 === halteTujuan) || (h1 === halteTujuan && h2 === halteAsal)
    );
    if (isLangsungIntegrasi) {
        return `Jalan kaki dari ${halteAsal} ke ${halteTujuan}.`;
    }

    // 1. Cari koridor yang langsung menghubungkan kedua halte
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, data] of Object.entries(koridors)) {
            if (data.haltes.includes(halteAsal) && data.haltes.includes(halteTujuan)) {
                return `Naik ${service} Koridor ${koridor} langsung dari ${halteAsal} ke ${halteTujuan}.`;
            }
        }
    }

    // 2. Jika tidak ada koridor langsung, cari transit
    // Buat daftar: halteAsal ada di koridor mana saja, halteTujuan ada di koridor mana saja
    const asalKoridorList = [];
    const tujuanKoridorList = [];
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, data] of Object.entries(koridors)) {
            if (data.haltes.includes(halteAsal)) asalKoridorList.push({ service, koridor, haltes: data.haltes });
            if (data.haltes.includes(halteTujuan)) tujuanKoridorList.push({ service, koridor, haltes: data.haltes });
        }
    }

    // 3. Cari halte transit yang sama di dua koridor berbeda
    for (const asal of asalKoridorList) {
        for (const tujuan of tujuanKoridorList) {
            if (asal.service === tujuan.service && asal.koridor === tujuan.koridor) continue; // Sudah dicek di atas
            // Cari halte transit yang sama
            const halteTransit = asal.haltes.find(h => tujuan.haltes.includes(h));
            if (halteTransit) {
                return `Naik ${asal.service} Koridor ${asal.koridor} dari ${halteAsal} ke ${halteTransit}, lalu transit ke ${tujuan.service} Koridor ${tujuan.koridor} menuju ${halteTujuan}.`;
            }
        }
    }

    return "Rute tidak ditemukan atau transit lebih dari satu kali diperlukan.";
}

function findRoutePanduanMultiTransit(halteAsal, halteTujuan) {
    halteAsal = findRealHalteName(halteAsal);
    halteTujuan = findRealHalteName(halteTujuan);
    // Cek apakah halteAsal dan halteTujuan terhubung langsung via integrasi
    const isLangsungIntegrasi = halteIntegrasi.some(([h1, h2]) =>
        (h1 === halteAsal && h2 === halteTujuan) || (h1 === halteTujuan && h2 === halteAsal)
    );
    if (isLangsungIntegrasi) {
        return `Jalan kaki dari ${halteAsal} ke ${halteTujuan}.`;
    }

    // Buat graph halte: halte -> [{halteTujuan, service, koridor}]
    const halteGraph = {};

    // Tambahkan koneksi antar halte dalam koridor yang sama
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, data] of Object.entries(koridors)) {
            for (let i = 0; i < data.haltes.length; i++) {
                const halte = data.haltes[i];
                if (!halteGraph[halte]) halteGraph[halte] = [];
                if (i > 0) {
                    halteGraph[halte].push({ halteTujuan: data.haltes[i - 1], service, koridor, idx: i - 1 });
                }
                if (i < data.haltes.length - 1) {
                    halteGraph[halte].push({ halteTujuan: data.haltes[i + 1], service, koridor, idx: i + 1 });
                }
            }
        }
    }

    // Tambahkan integrasi jalan kaki antar halte
    halteIntegrasi.forEach(([h1, h2, keterangan]) => {
        if (!halteGraph[h1]) halteGraph[h1] = [];
        if (!halteGraph[h2]) halteGraph[h2] = [];
        halteGraph[h1].push({ halteTujuan: h2, service: "Integrasi", koridor: keterangan || "Integrasi", idx: null });
        halteGraph[h2].push({ halteTujuan: h1, service: "Integrasi", koridor: keterangan || "Integrasi", idx: null });
    });

    // BFS dengan prioritas: koridor yang sama > integrasi > koridor berbeda
    const queue = [{
        halte: halteAsal,
        path: [{ halte: halteAsal, service: null, koridor: null }],
        service: null,
        koridor: null
    }];
    const visited = new Set([`${halteAsal}|`]);

    while (queue.length > 0) {
        const { halte, path, service: currService, koridor: currKoridor } = queue.shift();
        if (halte === halteTujuan) {
            return formatRute(path);
        }

        // Prioritaskan koridor yang sama dan integrasi
        const neighbors = halteGraph[halte] || [];
        const sortedNeighbors = neighbors.sort((a, b) => {
            // Prioritaskan koridor yang sama
            if (currService === a.service && currKoridor === a.koridor) return -1;
            if (currService === b.service && currKoridor === b.koridor) return 1;
            // Kemudian integrasi
            if (a.service === "Integrasi") return -1;
            if (b.service === "Integrasi") return 1;
            return 0;
        });

        for (const next of sortedNeighbors) {
            let nextKey = `${next.halteTujuan}|${next.service}|${next.koridor}`;
            if (!visited.has(nextKey)) {
                // Cek apakah dari halte sekarang bisa langsung jalan kaki ke tujuan
                const integrasiLangsung = halteIntegrasi.find(([h1, h2]) =>
                    (h1 === halte && h2 === halteTujuan) || (h2 === halte && h1 === halteTujuan)
                );
                if (integrasiLangsung) {
                    return (
                        path.length === 1
                            ? `Jalan kaki dari ${halte} ke ${halteTujuan}.`
                            : formatRute(path.concat([{ halte: halteTujuan, service: "Integrasi", koridor: integrasiLangsung[2] || "Integrasi" }]))
                    );
                }

                if (currService === next.service && currKoridor === next.koridor) {
                    queue.unshift({
                        halte: next.halteTujuan,
                        path: [...path, { halte: next.halteTujuan, service: next.service, koridor: next.koridor }],
                        service: next.service,
                        koridor: next.koridor
                    });
                } else {
                    queue.push({
                        halte: next.halteTujuan,
                        path: [...path, { halte: next.halteTujuan, service: next.service, koridor: next.koridor }],
                        service: next.service,
                        koridor: next.koridor
                    });
                }
                visited.add(nextKey);
            }
        }
    }
    return "Rute tidak ditemukan.";
}

function findRouteKoridorUtama(halteAsal, halteTujuan) {
    // Buat graph hanya dari koridor utama (tanpa huruf)
    const halteGraph = {};
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, data] of Object.entries(koridors)) {
            if (!/^[0-9]+$/.test(koridor)) continue; // Hanya angka saja
            for (let i = 0; i < data.haltes.length; i++) {
                const halte = data.haltes[i];
                if (!halteGraph[halte]) halteGraph[halte] = [];
                if (i > 0) {
                    halteGraph[halte].push({ halteTujuan: data.haltes[i - 1], service, koridor });
                }
                if (i < data.haltes.length - 1) {
                    halteGraph[halte].push({ halteTujuan: data.haltes[i + 1], service, koridor });
                }
            }
        }
    }
    // BFS
    const queue = [{
        halte: halteAsal,
        path: [{ halte: halteAsal, service: null, koridor: null }],
        service: null,
        koridor: null
    }];
    const visited = new Set([`${halteAsal}|`]);
    while (queue.length > 0) {
        const { halte, path, service: currService, koridor: currKoridor } = queue.shift();
        if (halte === halteTujuan) {
            // Format hasil rute
            let result = "";
            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                if (
                    !prev.service ||
                    prev.service !== curr.service ||
                    prev.koridor !== curr.koridor
                ) {
                    if (result) {
                        result += ", lanjut naik ";
                    } else {
                        result += "Naik ";
                    }
                    result += `${curr.service} Koridor ${curr.koridor} dari ${prev.halte} ke `;
                }
                if (
                    i === path.length - 1 ||
                    curr.service !== path[i + 1]?.service ||
                    curr.koridor !== path[i + 1]?.koridor
                ) {
                    result += `${curr.halte}`;
                }
            }
            result += ".";
            return result;
        }
        for (const next of halteGraph[halte] || []) {
            let nextKey = `${next.halteTujuan}|${next.service}|${next.koridor}`;
            if (!visited.has(nextKey)) {
                if (next.service === "Integrasi") {
                    queue.unshift({
                        halte: next.halteTujuan,
                        path: [...path, { halte: next.halteTujuan, service: next.service, koridor: next.koridor }],
                        service: next.service,
                        koridor: next.koridor
                    });
                } else if (currService === next.service && currKoridor === next.koridor) {
                    queue.unshift({
                        halte: next.halteTujuan,
                        path: [...path, { halte: next.halteTujuan, service: next.service, koridor: next.koridor }],
                        service: next.service,
                        koridor: next.koridor
                    });
                } else {
                    queue.push({
                        halte: next.halteTujuan,
                        path: [...path, { halte: next.halteTujuan, service: next.service, koridor: next.koridor }],
                        service: next.service,
                        koridor: next.koridor
                    });
                }
                visited.add(nextKey);
            }
        }
    }
    return "Rute utama (tanpa huruf) tidak ditemukan.";
}

function getAllHalteNames() {
    const halteSet = new Set();
    for (const koridors of Object.values(koridorData)) {
        for (const koridorInfo of Object.values(koridors)) {
            koridorInfo.haltes.forEach(halte => halteSet.add(halte));
        }
    }
    return Array.from(halteSet);
}

function populateHalteDatalist() {
    const halteList = document.getElementById('halteList');
    halteList.innerHTML = '';
    getAllHalteNames().forEach(halte => {
        const option = document.createElement('option');
        option.value = halte;
        halteList.appendChild(option);
    });
}

// Panggil fungsi ini sekali saat halaman dimuat
populateHalteDatalist();

// Event listeners
document.getElementById('serviceSelect').addEventListener('change', function() {
    updateKoridorOptions();
    const koridor = document.getElementById('koridorSelect').value;
    if (koridor) {
        displayKoridorResults(this.value, koridor);
    }
});

document.getElementById('koridorSelect').addEventListener('change', function() {
    const service = document.getElementById('serviceSelect').value;
    window.selectKoridor(service, this.value);
});

document.getElementById('searchInput').addEventListener('input', function () {
    displaySearchResults(this.value);
});

document.getElementById("searchServiceKoridor").addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = searchServiceKoridor(query);
        displayAutocompleteResults(results);
    } else {
        document.getElementById("autocompleteResults").innerHTML = ""; // Bersihkan hasil jika input kosong
    }
});

document.getElementById('cariRuteBtn').addEventListener('click', function () {
    const asal = document.getElementById('halteAsalInput').value.trim();
    const tujuan = document.getElementById('halteTujuanInput').value.trim();
    const hasilDiv = document.getElementById('hasilRute');
    hasilDiv.innerHTML = ""; // Kosongkan dulu

    if (!asal || !tujuan) {
        hasilDiv.textContent = "Silakan isi kedua nama halte.";
        return;
    }

    // Coba cari rute khusus terlebih dahulu
    let hasil = findRouteKhusus(asal, tujuan);
    
    // Jika tidak ada rute khusus, gunakan algoritma normal
    if (!hasil) {
        hasil = findRoutePanduan(asal, tujuan);
    if (hasil === "Rute tidak ditemukan atau transit lebih dari satu kali diperlukan.") {
        hasil = findRoutePanduanMultiTransit(asal, tujuan);
        }
    }

    // Parsing hasil untuk badge interaktif
    const koridorRegex = /([A-Za-z]+) Koridor (\w+)/g;
    let match, lastIndex = 0;
    hasilDiv.innerHTML = "";

    while ((match = koridorRegex.exec(hasil)) !== null) {
        hasilDiv.append(document.createTextNode(hasil.slice(lastIndex, match.index)));
        const badge = createKoridorBadge(match[1], match[2]);
        hasilDiv.appendChild(document.createTextNode(`${match[1]} Koridor `));
        hasilDiv.appendChild(badge);
        lastIndex = koridorRegex.lastIndex;
    }
    hasilDiv.append(document.createTextNode(hasil.slice(lastIndex)));

    // Tambahkan peringatan jika ada koridor huruf di luar jam operasional
    const warning = peringatanKoridorHurufPadaRute(hasil, asal, tujuan);
    if (warning) {
        hasilDiv.insertAdjacentHTML('beforeend', warning);
        // Tambahkan event listener untuk tombol Grand AMARI
        setTimeout(() => {
            const btn = document.getElementById('btnGrandAmari');
            if (btn) {
                btn.onclick = function() {
                    const grandResult = document.getElementById('grandAmariResult');
                    const hasilGrand = findRouteKoridorUtama(asal, tujuan);
                    // Parsing badge juga
                    let html = "";
                    let match2, lastIdx2 = 0;
                    const koridorRegex2 = /([A-Za-z]+) Koridor (\w+)/g;
                    while ((match2 = koridorRegex2.exec(hasilGrand)) !== null) {
                        html += hasilGrand.slice(lastIdx2, match2.index);
                        html += `${match2[1]} Koridor `;
                        // Buat badge
                        const temp = document.createElement('span');
                        temp.appendChild(createKoridorBadge(match2[1], match2[2]));
                        html += temp.innerHTML;
                        lastIdx2 = koridorRegex2.lastIndex;
                    }
                    html += hasilGrand.slice(lastIdx2);
                    grandResult.innerHTML = html;
                };
            }
        }, 100);
    }
});

// Fungsi untuk menentukan warna badge berdasarkan nomor koridor


function createKoridorBadge(service, koridor, showMapOnClick = false) {
    const badge = document.createElement('span');
    badge.textContent = koridor;
    badge.title = `Lihat daftar halte Koridor ${koridor}`;
    badge.style.backgroundColor = getKoridorBadgeColor(koridor);
    badge.style.color = "#fff";
    badge.style.width = "24px";
    badge.style.height = "24px";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.borderRadius = "50%";
    badge.style.fontWeight = "bold";
    badge.style.fontSize = "0.7rem";
    badge.style.cursor = "pointer";
    badge.style.margin = "0 4px";
    badge.classList.add('badge-koridor-interaktif');
    if (showMapOnClick) {
        badge.onclick = (e) => {
            e.stopPropagation();
            if (koridorData[service]?.[koridor] && koridorData[service][koridor].map) {
                showMapKoridorModal(service, koridor);
            } else {
                alert('Peta koridor belum tersedia untuk koridor ini.');
            }
        };
    } else {
        badge.onclick = () => selectKoridor(service, koridor);
    }
    return badge;
}

//jam
function updateLiveClock() {
    const clock = document.getElementById('liveClock');
    if (!clock) return;
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// Panggil updateKoridorOptions saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    updateKoridorOptions();
    const koridorState = loadKoridorState();
    if (koridorState && koridorState.service && koridorState.koridor) {
        // Jangan panggil displayKoridorResults dua kali
        window.selectKoridor(koridorState.service, koridorState.koridor);
    }
});

function isKoridorHuruf(koridor) {
    // Cek apakah koridor mengandung angka lalu huruf (misal: 2A, 4K, 10D)
    return /^[0-9]+[A-Z]$/i.test(koridor);
}

function isWaktuDiluarOperasional() {
    const now = new Date();
    const jam = now.getHours() + now.getMinutes()/60;
    return (jam < 5 || jam >= 22);
}

// Fungsi untuk mengecek dan memberi peringatan jika ada koridor huruf di luar jam operasional
function peringatanKoridorHurufPadaRute(teksRute, asal, tujuan) {
    const koridorRegex = /Koridor\s+([0-9]+[A-Z])/gi;
    let match, adaKoridorHuruf = false;
    while ((match = koridorRegex.exec(teksRute)) !== null) {
        adaKoridorHuruf = true;
        break;
    }
    if (adaKoridorHuruf && isWaktuDiluarOperasional()) {
        // Tombol custom style
        return `<div class="alert alert-danger mt-2 py-2 small">
            ⚠️ <b>Perhatian:</b> Koridor dengan kode huruf di belakang angka (misal 2A, 4K, 5C, 10D, dst) hanya beroperasi pukul <b>05.00–22.00</b>. Pastikan waktu perjalanan Anda!
        </div>
        <button id="btnGrandAmari" class="btn btn-outline-warning btn-sm rounded-5 mb-2 px-4 py-2 fw-bold">Gunakan Grand AMARI (Lebih Jauh)</button>
        <div id="grandAmariResult"></div>`;
    }
    return "";
}

function formatRute(path) {
    let result = "";
    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        if (
            !prev.service ||
            prev.service !== curr.service ||
            prev.koridor !== curr.koridor
        ) {
            if (curr.service === "Integrasi") {
                result += (result ? ", lalu " : "") + `Jalan kaki dari ${prev.halte} ke `;
            } else {
                if (result) {
                    result += ", lanjut naik ";
                } else {
                    result += "Naik ";
                }
                result += `${curr.service} Koridor ${curr.koridor} dari ${prev.halte} ke `;
            }
        }
        if (
            i === path.length - 1 ||
            curr.service !== path[i + 1]?.service ||
            curr.koridor !== path[i + 1]?.koridor
        ) {
            result += `${curr.halte}`;
        }
    }
    result += ".";
    return result;
}

function findRouteKhusus(halteAsal, halteTujuan) {
    halteAsal = findRealHalteName(halteAsal);
    halteTujuan = findRealHalteName(halteTujuan);
    // Cek apakah kedua halte ada di koridor AMARI
    const amariKoridors = [];
    for (const [service, koridors] of Object.entries(koridorData)) {
        for (const [koridor, data] of Object.entries(koridors)) {
            if (data.isAMARI && data.haltes.includes(halteAsal) && data.haltes.includes(halteTujuan)) {
                amariKoridors.push({ service, koridor });
            }
        }
    }

    if (amariKoridors.length > 0) {
        const { service, koridor } = amariKoridors[0];
        return `Naik ${service} Koridor ${koridor} (AMARI) langsung dari ${halteAsal} ke ${halteTujuan}.`;
    }

    // Daftar rute khusus dengan patokan halte integrasi
    const ruteKhusus = {
        "Blok M-Pulo Gebang": {
            asal: "Blok M",
            tujuan: "Pulo Gebang",
            patokanIntegrasi: [
                { 
                    halte: "ASEAN",
                    integrasi: "Kejaksaan Agung",
                    koridor: "4K",
                    keterangan: "JPO Integrasi",
                    tujuan: "Flyover Jatinegara"
                },
                {
                    halte: "Flyover Jatinegara",
                    koridor: "11"
                }
            ]
        },
        "Pulo Gebang-Blok M": {
            asal: "Pulo Gebang",
            tujuan: "Blok M",
            patokanIntegrasi: [
                {
                    halte: "Flyover Jatinegara",
                    koridor: "11"
                },
                {
                    halte: "Kejaksaan Agung",
                    integrasi: "ASEAN",
                    koridor: "4K",
                    keterangan: "JPO Integrasi",
                }
            ]
        }
    };

    // Cek apakah ada rute khusus untuk pasangan halte ini
    for (const [key, data] of Object.entries(ruteKhusus)) {
        // Cek apakah halte asal sesuai
        if (data.asal === halteAsal) {
            // Cek apakah halte tujuan ada di koridor terakhir
            const koridorTerakhir = data.patokanIntegrasi[data.patokanIntegrasi.length - 1].koridor;
            const koridorDataTerakhir = koridorData["BRT"][koridorTerakhir] || koridorData["Non-BRT"][koridorTerakhir];
            
            if (koridorDataTerakhir && koridorDataTerakhir.haltes.includes(halteTujuan)) {
                let result = "";
                let currentHalte = halteAsal;

                // Proses setiap patokan integrasi
                for (const patokan of data.patokanIntegrasi) {
                    if (patokan.integrasi) {
                        // Ada integrasi jalan kaki
                        result += `Naik BRT Koridor 1 dari ${currentHalte} ke ${patokan.halte}, `;
                        result += `lalu jalan kaki ke ${patokan.integrasi} (${patokan.keterangan}), `;
                        currentHalte = patokan.integrasi;
                        // Tambahkan naik koridor setelah integrasi
                        result += `lanjut naik Non-BRT Koridor ${patokan.koridor} ke ${patokan.tujuan}, `;
                    } else {
                        // Lanjut ke koridor berikutnya
                        result += `lanjut naik BRT Koridor ${patokan.koridor} ke ${halteTujuan}`;
                    }
                }
                return result + ".";
            }
        }
    }

    return null;
}

// Function to show haltes for a specific direction
function showHaltes(koridorNumber, start, end, haltes, highlightHalte = null) {
    const container = document.getElementById(`haltesList-${koridorNumber}`);
    if (!container) return;

    const halteList = haltes.map((halte, index) => {
        const isKRL = halteKRL.includes(halte);
        const isMRT = halteMRT.includes(halte);
        const halteLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Halte Transjakarta ' + halte)}`;
        const servicesAndKoridors = getServicesAndKoridorsByHalte(halte);
        // Highlight jika halte ini adalah yang dicari
        const highlightStyle = (highlightHalte && halte === highlightHalte) ? 'background:#ffe066;box-shadow:0 0 0 2px #ffd700;' : '';
        return `
            <tr style="background: transparent; border-left: none; border-right: none;${highlightStyle}">
                <td class="align-middle" style="width: 50px; background: transparent; border-left: none; border-right: none;">
                    <span class="badge rounded-circle" style="background:${getKoridorBadgeColor(koridorNumber)}; color:white; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem; border-radius:50%;">
                        ${String(index + 1).padStart(2, '0')}
                    </span>
                </td>
                <td class="align-middle" style="width: 100%; background: transparent; border-left: none; border-right: none;">
                    <a href="${halteLink}" target="_blank" class="text-decoration-none text-dark d-block text-start" style="font-size: 0.875rem;">
                        ${halte}
                        ${isKRL ? ' <iconify-icon inline icon="jam:train"></iconify-icon>' : ''}
                        ${isMRT ? ' <iconify-icon inline icon="pepicons-pop:train-circle"></iconify-icon>' : ''}
                    </a>
                </td>
                <td class="align-middle" style="width: 120px; text-align: right; background: transparent; border-left: none; border-right: none;">
                    <div class="d-flex flex-wrap gap-1 justify-content-end" style="min-width: 120px;">
                        ${servicesAndKoridors.map(({ service, koridor }) => {
                            if (koridor !== koridorNumber) {
                                return `<span class="badge rounded-circle badge-koridor-interaktif" style="background:${getKoridorBadgeColor(koridor)}; color:white; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.7rem; border-radius:50%; cursor:pointer;" onclick="window.selectKoridor('${service}', '${koridor}')">${koridor}</span>`;
                            }
                            return '';
                        }).join('')}
                        ${integrasiBadge[halte] ? integrasiBadge[halte].map(kor => {
                            if (kor !== koridorNumber) {
                                return `<span class="badge rounded-circle badge-koridor-interaktif" style="background:${getKoridorBadgeColor(kor)}; color:white; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.7rem; border-radius:50%; cursor:pointer;" onclick="window.selectKoridor('BRT', '${kor}')">${kor}</span>`;
                            }
                            return '';
                        }).join('') : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="text-center mb-3">
            <div class="fw-bold mb-2">Arah: ${start}</div>
        </div>
        <div class="table-responsive">
            <table class="table table-bordered mb-0" style="width: 100%; background: transparent; border-left: none; border-right: none;">
                <tbody style="border-left: none; border-right: none;">
                    ${halteList}
                </tbody>
            </table>
        </div>
    `;
}

const transJabodetabekData = koridorData["TransJabodetabek"];

// Fungsi untuk menyimpan dan mengambil state koridor terakhir
function saveKoridorState(service, koridor) {
    localStorage.setItem('koridorState', JSON.stringify({ service, koridor }));
}
function loadKoridorState() {
    try {
        return JSON.parse(localStorage.getItem('koridorState'));
    } catch {
        return null;
    }
}
function clearKoridorState() {
    localStorage.removeItem('koridorState');
}

// Saat halaman dimuat, cek state koridor terakhir dan tampilkan jika ada
window.addEventListener('DOMContentLoaded', function() {
    updateKoridorOptions();
    const koridorState = loadKoridorState();
    if (koridorState && koridorState.service && koridorState.koridor) {
        // Jangan panggil displayKoridorResults dua kali
        window.selectKoridor(koridorState.service, koridorState.koridor);
    }
});

// Custom dropdown koridor dengan badge dan jurusan
function renderCustomKoridorDropdown() {
    const koridorSelect = document.getElementById('koridorSelect');
    const serviceSelect = document.getElementById('serviceSelect');
    if (!koridorSelect || !serviceSelect) return;

    // Sembunyikan <select> asli
    koridorSelect.style.display = 'none';

    // Hapus dropdown custom lama jika ada
    let old = document.getElementById('customKoridorDropdown');
    if (old) old.remove();

    // Buat container
    const container = document.createElement('div');
    container.className = 'dropdown w-100';
    container.id = 'customKoridorDropdown';

    // Tombol utama
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-m3 rounded-4 dropdown-toggle w-100';
    btn.type = 'button';
    btn.setAttribute('data-bs-toggle', 'dropdown');
    btn.style.textAlign = 'left';
    btn.style.whiteSpace = 'normal';
    btn.style.wordBreak = 'break-word';
    btn.style.maxWidth = '400px';
    // Default text
    btn.innerHTML = '<span class="text-truncate">Pilih Koridor...</span>';
    container.appendChild(btn);

    // List koridor
    const ul = document.createElement('ul');
    ul.className = 'dropdown-menu w-100';
    ul.style.maxHeight = '350px';
    ul.style.overflowY = 'auto';
    ul.style.wordBreak = 'break-word';
    ul.style.whiteSpace = 'normal';
    ul.style.minWidth = '250px';
    ul.style.maxWidth = '400px';

    const selectedService = serviceSelect.value;
    for (const koridor in koridorData[selectedService]) {
        const entry = koridorData[selectedService][koridor];
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item d-flex align-items-start';
        a.href = '#';
        a.style.wordBreak = 'break-word';
        a.style.whiteSpace = 'normal';
        a.style.alignItems = 'flex-start';
        a.style.fontWeight = 'bold';
        // Compose dropdown item (NO operator codes, NO jam operasi)
        a.innerHTML = `<span class=\"badge me-2 flex-shrink-0\" style=\"background:${getKoridorBadgeColor(koridor)};width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.9rem;border-radius:50%;\">${koridor}</span> <span style='display:block;white-space:normal;word-break:break-word;max-width:320px;font-weight:bold;'>${entry.start.toUpperCase()} - ${entry.end.toUpperCase()}</span>`;
        a.onclick = function(e) {
            e.preventDefault();
            // Extract operator codes in parentheses (allow slashes)
            let operatorStr = entry.operator || '';
            let operatorCodes = [];
            if (Array.isArray(operatorStr)) {
                operatorStr = operatorStr.join(', ');
            }
            const regex = /\(([A-Z0-9 /]+)\)/g;
            let match;
            while ((match = regex.exec(operatorStr)) !== null) {
                operatorCodes.push(match[1]);
            }
            // Get operational time
            let jamOperasi = '05:00 - 22:00';
            if (entry.isAMARI) {
                jamOperasi = '24 Jam';
            } else if (entry.operationalSchedule && entry.operationalSchedule.weekday && entry.operationalSchedule.weekday.hours) {
                const h = entry.operationalSchedule.weekday.hours;
                if (Array.isArray(h)) {
                    jamOperasi = h.map(slot => `${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00`).join(' | ');
                } else {
                    jamOperasi = `${String(h.start).padStart(2,'0')}:00 - ${String(h.end).padStart(2,'0')}:00`;
                }
            }
            // Set button text with operator codes BELOW jurusan, only after selection
            btn.innerHTML = `
                <span class=\"badge me-2 flex-shrink-0\" style=\"background:${getKoridorBadgeColor(koridor)};width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.9rem;border-radius:50%;\">${koridor}</span>
                <span style='display:block;white-space:normal;word-break:break-word;max-width:320px;font-weight:bold;'>${entry.start.toUpperCase()} - ${entry.end.toUpperCase()}</span>
                <span class='d-block fw-bold text-muted mt-1' style='font-size:1em;margin-top:2px;'>${operatorCodes.map(code => `(${code})`).join(' ')}${operatorCodes.length ? ' - ' : ''}${jamOperasi}</span>
            `;
            koridorSelect.value = koridor;
            saveKoridorState(selectedService, koridor);
            displayKoridorResults(selectedService, koridor);
            // Scroll ke daftar halte
            setTimeout(() => {
                const koridorTitle = document.getElementById('jurusan');
                if (koridorTitle) {
                    koridorTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            btn.click();
        };
        li.appendChild(a);
        ul.appendChild(li);
    }
    container.appendChild(ul);

    // Sisipkan setelah <select>
    koridorSelect.parentNode.insertBefore(container, koridorSelect.nextSibling);

    // Restore pilihan terakhir jika ada
    const koridorState = loadKoridorState();
    if (koridorState && koridorState.service === selectedService && koridorState.koridor && koridorData[selectedService][koridorState.koridor]) {
        const entry = koridorData[selectedService][koridorState.koridor];
        // Extract operator codes in parentheses (allow slashes)
        let operatorStr = entry.operator || '';
        let operatorCodes = [];
        if (Array.isArray(operatorStr)) {
            operatorStr = operatorStr.join(', ');
        }
        const regex = /\(([A-Z0-9 /]+)\)/g;
        let match;
        while ((match = regex.exec(operatorStr)) !== null) {
            operatorCodes.push(match[1]);
        }
        // Get operational time
        let jamOperasi = '05:00 - 22:00';
        if (entry.isAMARI) {
            jamOperasi = '24 Jam';
        } else if (entry.operationalSchedule && entry.operationalSchedule.weekday && entry.operationalSchedule.weekday.hours) {
            const h = entry.operationalSchedule.weekday.hours;
            if (Array.isArray(h)) {
                jamOperasi = h.map(slot => `${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00`).join(' | ');
            } else {
                jamOperasi = `${String(h.start).padStart(2,'0')}:00 - ${String(h.end).padStart(2,'0')}:00`;
            }
        }
        btn.innerHTML = `
            <span class=\"badge me-2 flex-shrink-0\" style=\"background:${getKoridorBadgeColor(koridorState.koridor)};width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.9rem;border-radius:50%;\">${koridorState.koridor}</span>
            <span style='display:block;white-space:normal;word-break:break-word;max-width:320px;font-weight:bold;'>${entry.start.toUpperCase()} - ${entry.end.toUpperCase()}</span>
            <span class='d-block fw-bold text-muted mt-1' style='font-size:1em;margin-top:2px;'>${operatorCodes.map(code => `(${code})`).join(' ')}${operatorCodes.length ? ' - ' : ''}${jamOperasi}</span>
        `;
        koridorSelect.value = koridorState.koridor;
        displayKoridorResults(selectedService, koridorState.koridor);
        setTimeout(() => {
    const koridorResults = document.getElementById('koridorResults');
    if (koridorResults) {
        // Cari data koridor
        const entry = koridorData[selectedService][koridor];
        // Ambil operator bus (dalam kurung saja)
        let operatorStr = entry.operator || '';
        let operatorCodes = [];
        if (Array.isArray(operatorStr)) {
            operatorStr = operatorStr.join(', ');
        }
        const regex = /\(([A-Z0-9 /]+)\)/g;
        let match;
        while ((match = regex.exec(operatorStr)) !== null) {
            operatorCodes.push(match[1]);
        }
        // Info AMARI
        let jamOperasi = '';
        if (entry.isAMARI) {
            jamOperasi = '<span class="badge bg-info ms-2">24 Jam (AMARI)</span>';
        } else {
            jamOperasi = '<span class="badge bg-secondary ms-2">05.00 - 22.00</span>';
            if (entry.operationalSchedule && entry.operationalSchedule.weekday && entry.operationalSchedule.weekday.hours) {
                const h = entry.operationalSchedule.weekday.hours;
                if (Array.isArray(h)) {
                    jamOperasi = h.map(slot => `<span class='badge bg-secondary ms-2'>${String(slot.start).padStart(2,'0')}:00 - ${String(slot.end).padStart(2,'0')}:00</span>`).join('');
                } else {
                    jamOperasi = `<span class='badge bg-secondary ms-2'>${String(h.start).padStart(2,'0')}:00 - ${String(h.end).padStart(2,'0')}:00</span>`;
                }
            }
        }
        // Sisipkan info di atas daftar halte
        let infoDiv = document.getElementById('koridorOperatorInfo');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'koridorOperatorInfo';
            infoDiv.className = 'mb-2';
            koridorResults.parentNode.insertBefore(infoDiv, koridorResults);
        }
        infoDiv.innerHTML =
            (operatorCodes.length ? `<span class='badge bg-warning text-dark me-2'>${operatorCodes.join(', ')}</span>` : '') +
            jamOperasi;
    }
    // Scroll ke judul koridor
    const koridorTitle = document.getElementById('jurusan');
    if (koridorTitle) {
        koridorTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}, 100);
    }

    // Hapus info start/end jika ada
    let infoDiv = document.getElementById('koridorStartEndInfo');
    if (infoDiv) infoDiv.remove();
    let halteListDiv = document.getElementById('customKoridorHalteList');
    if (halteListDiv) halteListDiv.remove();
}

// Panggil custom dropdown saat halaman dimuat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateKoridorOptions);
} else {
    updateKoridorOptions();
}

// Fungsi untuk menampilkan modal peta koridor dengan navigasi next/prev
function showMapKoridorModal(service, koridor) {
    let modal = null;
    if (!document.getElementById('modalMapKoridor')) {
        const modalHtml = `
        <div class=\"modal fade\" id=\"modalMapKoridor\" tabindex=\"-1\" aria-labelledby=\"modalMapKoridorLabel\" aria-hidden=\"true\">\n                      <div class=\"modal-dialog modal-dialog-centered modal-lg\">\n                        <div class=\"modal-content\">\n                          <div class=\"modal-header\">\n                           <button id=\"modalMapPrevBtn\" class=\"btn btn-outline-dark btn-sm rounded-circle me-2\"><b>&lt;</b></button>\n                            <h5 class=\"modal-title fw-bold plus-jakarta-sans d-flex align-items-center gap-2\" id=\"modalMapKoridorLabel\">Peta Koridor <span id=\"modalKoridorBadge\"></span></h5>\n                            <button id=\"modalMapNextBtn\" class=\"btn btn-outline-dark btn-sm rounded-circle ms-2\"><b>&gt;</b></button>\n                            <button type=\"button\" class=\"btn btn-outline-dark\" data-bs-dismiss=\"modal\" aria-label=\"Tutup\"><iconify-icon inline  icon=\"line-md:close\"></iconify-icon></button>\n                          </div>\n                          <div class=\"modal-body text-center\">\n                            <div id=\"modalKoridorJurusan\" class=\"fw-bold fs-5 mb-2\"></div>\n                            <img id=\"imgMapKoridor\" src=\"\" alt=\"Peta Koridor\" class=\"img-fluid rounded shadow\">\n                          </div>\n                        </div>\n                      </div>\n                    </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    modal = new bootstrap.Modal(document.getElementById('modalMapKoridor'));
    modal.show();
    // Tambahkan event handler next/back agar navigasi berfungsi
    const koridorList = getKoridorListForService(service);
    let idx = koridorList.indexOf(koridor);
    function updateModalKoridor(idxBaru) {
        const koridorBaru = koridorList[idxBaru];
        const koridorEntryBaru = koridorData[service][koridorBaru];
        const badgeSpan = document.getElementById('modalKoridorBadge');
        if (badgeSpan) {
            badgeSpan.innerHTML = `
              <span class=\"pt-sans\" style=\"
                display:inline-flex;
                align-items:center;
                justify-content:center;
                width:32px;
                height:32px;
                border-radius:50%;
                background:${getKoridorBadgeColor(koridorBaru)};
                color:#fff;
                font-weight:bold;
                font-size:1em;
                margin-left:4px;\">
                ${koridorBaru}
              </span>
            `;
        }
        // Update jurusan di modal
        const jurusanDiv = document.getElementById('modalKoridorJurusan');
        if (jurusanDiv) {
            let jurusanText = `${koridorEntryBaru.start} - ${koridorEntryBaru.end}`;
            // Jika ada VIA, pisahkan dan beri text-muted
            const viaMatch = jurusanText.match(/(.*?)( VIA .*)/i);
            if (viaMatch) {
                jurusanDiv.innerHTML = `${viaMatch[1]}<span class='text-muted'>${viaMatch[2]}</span>`;
            } else {
                jurusanDiv.textContent = jurusanText;
            }
        }
        const img = document.getElementById('imgMapKoridor');
        img.src = koridorEntryBaru.map;
        img.alt = `Peta Koridor ${koridorBaru}`;
        const label = document.getElementById('modalMapKoridorLabel');
        if (label) label.childNodes[0].textContent = `Peta Koridor `;
        // Update tombol
        document.getElementById('modalMapPrevBtn').disabled = idxBaru <= 0;
        document.getElementById('modalMapNextBtn').disabled = idxBaru >= koridorList.length - 1;
        idx = idxBaru;
    }
    setTimeout(() => {
        updateModalKoridor(idx);
        document.getElementById('modalMapPrevBtn').onclick = function() {
            if (idx > 0) updateModalKoridor(idx - 1);
        };
        document.getElementById('modalMapNextBtn').onclick = function() {
            if (idx < koridorList.length - 1) updateModalKoridor(idx + 1);
        };
    }, 10);
}

// Saat badge diklik dan modal akan tampil:
const badgeSpan = document.getElementById('modalKoridorBadge');
if (badgeSpan) {
  badgeSpan.innerHTML = `
    <span style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:32px;
      height:32px;
      border-radius:50%;
      background:${getKoridorBadgeColor(koridorNumber)};
      color:#fff;
      font-weight:bold;
      font-size:1em;
      margin-left:4px;">
      ${koridorNumber}
    </span>
  `;
}

// Helper untuk mendapatkan urutan koridor pada layanan tertentu
function getKoridorListForService(service) {
    return Object.keys(koridorData[service] || {});
}

// Helper untuk mendapatkan index koridor saat ini pada layanan tertentu
function getKoridorIndex(service, koridor) {
    const list = getKoridorListForService(service);
    return list.indexOf(koridor);
}
