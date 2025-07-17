// Mapping logo/gambar karoseri, operator, chasis
const logoKaroseri = {
  "Laksana": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpn7XVnx7AM_AGSwg1jw5VF6-VfEprDXKDOA&s",
  "Nusantara Gemilang": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP11eiXIcGub2JAaovfFTaD03hdYqmTAVEbw&s", // placeholder
  "Zhongtong": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Zhongtong_logo_placeholder.png", // placeholder
};

const logoOperator = {
  "DAMRI": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3W_7so1RHIYKRUmu4d-u_znAJ_iy-aTnCyA&s", // placeholder
  "Mayasari Bakti": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMgJIInaKA-3ZEH-4EHVN5HCcEDONluWsBEg&s", // placeholder
  "Sinar Jaya": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYRJ-Q-FsRKcr_h3T0kg9Mq6gncMktniU3-Q&s", // Sinar Jaya
  "Steady Safe": "https://steadysafetbk.co.id/wp-content/uploads/2022/08/LOGO-PT.-STEADY-SAFE-Tbk-Color-1.png", // Steady Safe
  "Bianglala Metropolitan": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPIPrMJa-hFy3Bgn4-iuybIpOneKEspkGiGw&s", // BMP
  "Pahala Kencana Transportation": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbu5QUTsaredjAkDMv8QN54ZJaZwMMR91F6w&s", // PKT
};

// Mapping logo chasis (brand)
const logoChasis = {
  "Skywell": "https://i.namu.wiki/i/kVKeJelXva9NOvjlNXfOCAA674UhYmjn4j1LwSgvlJwAKU_8DQIrYPpKP9s_WjEXTsJHNgEVo4p3whuk6lghlA.webp",
  "Zhongtong": "https://www.carlogos.org/car-logos/zhongtong-logo-1400x1100.png",
  "Scania": "https://logos-world.net/wp-content/uploads/2022/12/Scania-Logo.png", // Scania
  "Mercedes-Benz": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0KKy7H6VeaJ7qYw8kcq_C-Vgmb6o9dqov5uLkUZIKCX-URZTroCSPrv2Rdtv35VMeUmcGRrWc9p4xzh71_p5r7zm8GH9m1rcrGmYrwF_33nMrCLKTIhqOf7iMvl4SEXxbH0fJlv1xHX6Ti7tY4oopw-esuO8XAPmQDRoNZttmfuFBsSSr8NALxA/w320-h247/Mercedes-Benz-(Koleksilogo.com).png",
  "Hino": "https://upload.wikimedia.org/wikipedia/id/5/5d/Logo_Hino.png",
  "MAN": "https://upload.wikimedia.org/wikipedia/commons/2/2a/MAN_logo_placeholder.png",
  "VKTR": "https://e-ipo.co.id/en/pipeline/get-logo?id=237", // VKTR
  "Volvo": "https://images.seeklogo.com/logo-png/15/2/volvo-logo-png_seeklogo-150600.png", // Volvo
};

// Contoh cara pakai di render:
// <img src="${logoKaroseri[bus.karoseri] || logoKaroseri['CBU']}" alt="${bus.karoseri}" ... />
// <img src="${logoOperator[bus.operator] || 'default.png'}" alt="${bus.operator}" ... />
// <img src="${gambarChasis[bus.tipe] || 'default_chasis.png'}" alt="${bus.tipe}" ... />

function searchBusByNumber(input) {
    const norm = input.trim().toUpperCase().replace(/_/g, '-');
    // Skywell
    const matchSkywell = norm.match(/^(DMR)[- ]?(\d{6})$/);
    if (matchSkywell) {
        const code = matchSkywell[1];
        const numStr = matchSkywell[2];
        const num = parseInt(numStr, 10);
        if (num >= 230099 && num <= 230124) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Skywell NJL6129BEV',
                warna: 'Putih Orange',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                isSkywellNonBRT: true
            }];
        }
    }
    // Sinar Jaya VKTR BYD D9
    const matchSJM = norm.match(/^(SJM)[- ]?(\d{6})$/);
    if (matchSJM) {
        const code = matchSJM[1];
        const numStr = matchSJM[2];
        const num = parseInt(numStr, 10);
        if (num >= 240001 && num <= 240020) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Sinar Jaya',
                busNumber: num,
                tipe: 'VKTR BYD D9',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'Listrik',
                karoseri: 'Laksana',
                isSinarJaya: true
            }];
        }
    }
    // Steady Safe Volvo B11R
    const matchSAF = norm.match(/^(SAF)[- ]?(\d{3})$/);
    if (matchSAF) {
        const code = matchSAF[1];
        const numStr = matchSAF[2];
        const num = parseInt(numStr, 10);
        if (num >= 1 && num <= 119) {
            return [{
                operatorCode: code,
                number: numStr.padStart(3, '0'),
                operator: 'Steady Safe',
                busNumber: num,
                tipe: 'Volvo B11R',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                isSteadySafe: true
            }];
        }
    }
    // Mayasari Bakti Mercedes-Benz OH 1626
    const matchMYS = norm.match(/^(MYS)[- ]?(\d{5})$/);
    if (matchMYS) {
        const code = matchMYS[1];
        const numStr = matchMYS[2];
        const num = parseInt(numStr, 10);
        if ((num >= 19203 && num <= 19233) || (num >= 21224 && num <= 21333)) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'Mercedes-Benz OH 1626',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                isMayasari: true
            }];
        }
    }
    // Tambahkan logic Scania K320IA (MB-1601 s/d MB-1656)
    // Scania K320IA MB-1601 s/d MB-1656
    const matchMB = norm.match(/^(MB)[- ]?(\d{4})$/);
    if (matchMB) {
        const code = matchMB[1];
        const numStr = matchMB[2];
        const num = parseInt(numStr, 10);
        if (num >= 1601 && num <= 1656) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'Scania K320IA',
                warna: 'Putih-Biru Muda',
                bahanBakar: 'BBG',
                karoseri: 'Laksana',
                catatan: 'Bus Gandeng',
                isScaniaK320: true
            }];
        }
    }
    // Tambahkan logic Scania K310IB (MYS-17001 s/d 17110, 18111 s/d 18150)
    const matchMYSK310 = norm.match(/^(MYS)[- ]?(\d{5})$/);
    if (matchMYSK310) {
        const code = matchMYSK310[1];
        const numStr = matchMYSK310[2];
        const num = parseInt(numStr, 10);
        if ((num >= 17001 && num <= 17110) || (num >= 18111 && num <= 18150)) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'Scania K310IB',
                warna: '',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                isScaniaK310: true
            }];
        }
    }
    // BMP Mercedes Benz OH 1626 A/T
    const matchBMP3 = norm.match(/^(BMP)[- ]?(\d{3})$/);
    if (matchBMP3) {
        const code = matchBMP3[1];
        const numStr = matchBMP3[2];
        const num = parseInt(numStr, 10);
        if (num >= 242 && num <= 251) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1626 A/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Tri Sakti',
                isBMP: true
            }];
        } else {
            // Fallback: Hino RK8 R260, tampilkan semua karoseri
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'Hino RK8 R260',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Rahayu Sentosa / Restu Ibu Pusaka / Laksana',
                isBMP: true
            }];
        }
    }
    const matchBMP6 = norm.match(/^(BMP)[- ]?(\d{6})$/);
    if (matchBMP6) {
        const code = matchBMP6[1];
        const numStr = matchBMP6[2];
        const num = parseInt(numStr, 10);
        if (num >= 220252 && num <= 220292) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1626 A/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Tri Sakti',
                isBMP: true
            }];
        }
    }
    // VKTR BYD B12 Mayasari Bakti
    const matchMYSVKTR = norm.match(/^(MYS)[- ]?(\d{5,6})$/);
    if (matchMYSVKTR) {
        const code = matchMYSVKTR[1];
        const numStr = matchMYSVKTR[2];
        const num = parseInt(numStr, 10);
        if (num >= 22334 && num <= 22363) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'VKTR BYD B12',
                warna: 'Tosca',
                bahanBakar: 'Listrik',
                karoseri: '',
                catatan: 'Non BRT',
                isMayasariVKTR: true
            }];
        } else if (num >= 22364 && num <= 23385) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'VKTR BYD B12',
                warna: 'Putih Orange',
                bahanBakar: 'Listrik',
                karoseri: '',
                catatan: 'Non BRT',
                isMayasariVKTR: true
            }];
        }
    }
    // DAMRI Bus Gandeng Zhongtong LCK6180GC
    const matchDMRGandeng = norm.match(/^(DMR)[- ]?(\d{4})$/);
    if (matchDMRGandeng) {
        const code = matchDMRGandeng[1];
        const numStr = matchDMRGandeng[2];
        const num = parseInt(numStr, 10);
        if (num >= 704 && num <= 763) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Zhongtong Bus LCK6180GC',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'BBG',
                karoseri: 'CBU',
                pool: 'Klender',
                catatan: 'Bus Gandeng',
                isZhongtongGandeng: true
            }];
        }
    }
    // DAMRI Skywell & Zhongtong BRT
    const matchDMRBRT = norm.match(/^(DMR)[- ]?(\d{6})$/);
    if (matchDMRBRT) {
        const code = matchDMRBRT[1];
        const numStr = matchDMRBRT[2];
        const num = parseInt(numStr, 10);
        // Skywell BRT: 240155-240214
        if (num >= 240155 && num <= 240214) {
            const urut = num - 240155 + 1;
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Skywell NJL6126BEV',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                pool: 'Cakung',
                catatan: `BRT, Bus ke ${urut}`,
                urutan: urut,
                isSkywell: true
            }];
        }
        // Zhongtong Gen 1: 240125-240154
        if (num >= 240125 && num <= 240154) {
            const urut = num - 240125 + 1;
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Zhongtong Bus LCK6126EVGRA1',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                pool: 'Klender',
                catatan: `BRT, Bus ke ${urut}`,
                urutan: urut,
                isZhongtong: true
            }];
        }
        // Zhongtong Gen 2: 250155-250224
        if (num >= 250155 && num <= 250224) {
            const urut = num - 250155 + 1;
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Zhongtong Bus LCK6126EVGRA2',
                warna: 'Putih-Biru Tua',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                pool: 'Klender',
                catatan: `BRT, Bus ke ${urut}`,
                urutan: urut,
                isZhongtong: true
            }];
        }
    }
    // PKT Mercedes-Benz OH 1626 M/T
    const matchPKT = norm.match(/^(PKT)[- ]?(\d{3})$/);
    if (matchPKT) {
        const code = matchPKT[1];
        const numStr = matchPKT[2];
        const num = parseInt(numStr, 10);
        if (num >= 101 && num <= 115) {
            const urut = num - 100;
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Pahala Kencana Transportation',
                busNumber: num,
                tipe: 'Mercedes-Benz OH 1626 M/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                depo: 'Pegangsaan Dua',
                catatan: `Bus ke ${urut} PKT`,
                urutan: urut,
                isPKT: true
            }];
        }
    }
    return [];
}

function detectLogoByTipe(tipe) {
  if (!tipe) return null;
  const lower = tipe.toLowerCase();
  if (lower.includes('zhongtong')) return logoKaroseri['Zhongtong'];
  if (lower.includes('skywell')) return logoKaroseri['Skywell'];
  if (lower.includes('scania')) return logoKaroseri['Scania'];
  if (lower.includes('mercedes')) return logoKaroseri['Mercedes-Benz'];
  if (lower.includes('man')) return logoKaroseri['MAN'];
  if (lower.includes('nusantara')) return logoKaroseri['Nusantara Gemilang'];
  if (lower.includes('laksana')) return logoKaroseri['Laksana'];
  return null;
}

function detectLogoChasis(tipe) {
  if (!tipe) return null;
  const lower = tipe.toLowerCase();
  if (lower.includes('skywell')) return logoChasis['Skywell'];
  if (lower.includes('zhongtong')) return logoChasis['Zhongtong'];
  if (lower.includes('scania')) return logoChasis['Scania'];
  if (lower.includes('mercedes')) return logoChasis['Mercedes-Benz'];
  if (lower.includes('hino')) return logoChasis['Hino'];
  if (lower.includes('man')) return logoChasis['MAN'];
  if (lower.includes('vktr')) return logoChasis['VKTR'];
  if (lower.includes('volvo')) return logoChasis['Volvo'];
  return null;
}

function renderBusSearchResults(results) {
    if (!results.length) return '<div class="alert alert-warning">Belum ada data bus.</div>';
    const bus = results[0];
    // Logo
    const logoKar = bus.karoseri && bus.karoseri !== 'CBU' ? (logoKaroseri[bus.karoseri] || '') : '';
    const logoSasis = detectLogoChasis(bus.tipe) || '';
    const logoOp = logoOperator[bus.operator] || '';
    // Nomor bus
    const nomorBus = bus.number;
    // Info ringkas
    let infoRingkas = '';
    if (bus.operator === 'Mayasari Bakti') {
        const tahun = '20' + nomorBus.slice(0, 2);
        const urut = parseInt(nomorBus.slice(-3), 10);
        infoRingkas = `Bus ke ${urut} Mayasari Bakti tahun ${tahun}`;
    } else if (bus.operator === 'DAMRI') {
        const tahun = '20' + nomorBus.slice(0, 2);
        const urut = parseInt(nomorBus.slice(-3), 10);
        const ke = urut - 98;
        infoRingkas = `Bus nomor ${urut} / bus ke ${ke} Tahun ${tahun} Milik DAMRI`;
    } else if (bus.operator === 'Steady Safe') {
        const urut = parseInt(nomorBus, 10);
        infoRingkas = `Bus ke ${urut} Steady Safe`;
    } else if (bus.operator === 'Pahala Kencana Transportation') {
        const urut = parseInt(nomorBus, 10) - 100;
        infoRingkas = `Bus ke ${urut} Pahala Kencana Transportation`;
    }
    // Deteksi tahun bus
    let tahunBus = null;
    if (bus.operator === 'Mayasari Bakti' || bus.operator === 'DAMRI') {
        tahunBus = parseInt('20' + nomorBus.slice(0, 2), 10);
    } else if (bus.operator === 'Sinar Jaya') {
        tahunBus = parseInt('20' + nomorBus.slice(0, 2), 10);
    }
    // Mapping warna bodi ke warna background card
    function getCardBgColor(warna) {
        if (!warna) return 'rgba(133, 151, 255, 0.7)';
        const w = warna.toLowerCase();
        if (w.includes('tosca')) return 'rgba(0, 200, 180, 0.18)';
        if (w.includes('putih') && w.includes('biru tua')) return 'rgba(79, 168, 222, 0.18)'; // biru tua
        if (w.includes('putih') && w.includes('biru muda')) return 'rgba(133, 151, 255, 0.18)'; // biru muda
        if (w.includes('putih') && w.includes('orange')) return 'rgba(255, 183, 77, 0.18)'; // orange
        if (w.includes('putih') && w.includes('biru')) return 'rgba(79, 168, 222, 0.13)'; // biru umum
        if (w.includes('biru tua')) return 'rgba(79, 168, 222, 0.18)';
        if (w.includes('biru muda')) return 'rgba(133, 151, 255, 0.18)';
        if (w.includes('biru')) return 'rgba(79, 168, 222, 0.13)';
        if (w.includes('orange')) return 'rgba(255, 183, 77, 0.18)';
        if (w.includes('kuning')) return 'rgba(255, 235, 59, 0.18)';
        if (w.includes('hijau')) return 'rgba(76, 175, 80, 0.13)';
        if (w.includes('merah')) return 'rgba(244, 67, 54, 0.13)';
        if (w.includes('abu')) return 'rgba(120, 144, 156, 0.13)';
        if (w.includes('hitam')) return 'rgba(33, 33, 33, 0.13)';
        return 'rgba(133, 151, 255, 0.13)'; // fallback biru muda
    }
    return `
    <div class="bus-result-card mt-2 p-3 mb-3 border rounded shadow-sm text-center position-relative" style="background:${getCardBgColor(bus.warna)};backdrop-filter:blur(12px);border-radius:1.2em;box-shadow:0 2px 8px 0 #0001;overflow:hidden;">
      ${logoSasis ? `<img src="${logoSasis}" alt="Sasis Watermark" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:70%;max-width:320px;opacity:0.10;z-index:1;pointer-events:none;user-select:none;" />` : ''}
      <div class="d-flex justify-content-center align-items-center mb-2 gap-2" style="padding:0 8px;position:relative;z-index:2;">
        ${logoKar ? `<img src="${logoKar}" alt="Karoseri" style="max-height:40px;max-width:100%;object-fit:contain;" class="rounded-2" />` : ''}
        ${logoOp ? `<img src="${logoOp}" alt="Operator" style="max-height:40px;max-width:100%;object-fit:contain;" class="rounded-2" />` : ''}
      </div>
      <div class="mb-2">
        <span class="badge rounded-5 bg-primary fs-3 px-4 py-2"
          style="${
            (bus.operator === 'Mayasari Bakti' && tahunBus && tahunBus >= 2021)
              ? "font-family:'PT Sans Narrow',sans-serif;"
              : (bus.operatorCode === 'SAF' || bus.operatorCode === 'BMP' || (tahunBus && tahunBus < 2021 && bus.operatorCode !== 'MB' && bus.operatorCode !== 'MYS' && bus.operatorCode !== 'DMR'))
                ? "font-family:'Rubik','New Rubik',sans-serif;"
                : ((bus.operatorCode === 'MB' || bus.operatorCode === 'MYS' || (bus.operatorCode === 'DMR' && nomorBus.length === 3))
                  ? "font-family:'Roboto',sans-serif;"
                  : (bus.operatorCode === 'PKT' ? "font-family:'New Rubik','Rubik',sans-serif;" : "")
                )
          }"
        >${bus.operatorCode || ''}-${nomorBus}</span>
        ${bus.operator === 'Sinar Jaya' ? '<div class="fw-bold mt-1">Sinar Jaya</div>' : ''}
      </div>
      <div class="mb-2 fw-bold">${infoRingkas}</div>
      <div class="mb-2">
        <div>${bus.tipe}</div>
        <div>${bus.warna}</div>
        <div>${bus.bahanBakar}</div>
        ${bus.depo ? `<div>Depo: ${bus.depo}</div>` : (bus.pool ? `<div>Depo: ${bus.pool}</div>` : '')}
        ${bus.karoseri && bus.karoseri !== 'CBU' ? `<div>${bus.karoseri}</div>` : ''}
        ${bus.catatan ? `<div>${bus.catatan}</div>` : ''}
      </div>
      <div class="d-flex flex-wrap gap-2 justify-content-center">
        ${bus.bahanBakar === 'Listrik' ? '<span class="badge bg-warning text-dark">Listrik</span>' : ''}
        ${bus.bahanBakar === 'Diesel' ? '<span class="badge bg-secondary">Diesel</span>' : ''}
        ${bus.bahanBakar === 'BBG' ? '<span class="badge bg-info text-dark">BBG</span>' : ''}
        ${
          (bus.catatan && bus.catatan.toLowerCase().includes('non brt')) || bus.isSkywellNonBRT
            ? '<span class="badge bg-success">Non BRT</span>'
            : ''
        }
        ${bus.catatan && bus.catatan.toLowerCase().includes('gandeng') ? '<span class="badge bg-primary">Bus Gandeng</span>' : ''}
      </div>
    </div>
    `;
}