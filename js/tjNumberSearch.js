// Mapping logo/gambar karoseri, operator, chasis
const logoKaroseri = {
  "Laksana": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpn7XVnx7AM_AGSwg1jw5VF6-VfEprDXKDOA&s",
  "Nusantara Gemilang": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP11eiXIcGub2JAaovfFTaD03hdYqmTAVEbw&s", // placeholder
  "Zhongtong": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Zhongtong_logo_placeholder.png", // placeholder
  "Rahayu Sentosa": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCLGI0la88DadG0Wd8RNxBYethXJLxaMB69Q&s",
  "Tentrem": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxYpv4FydL2AGy2rSplzmWVMO92LhcUVzInQ&s",
  "Restu Ibu": "https://karoseribusrestuibu.wordpress.com/wp-content/uploads/2013/03/logo-1-copy_1.png",
};

const logoOperator = {
  "DAMRI": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3W_7so1RHIYKRUmu4d-u_znAJ_iy-aTnCyA&s", // placeholder
  "Mayasari Bakti": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMgJIInaKA-3ZEH-4EHVN5HCcEDONluWsBEg&s", // placeholder
  "Sinar Jaya": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYRJ-Q-FsRKcr_h3T0kg9Mq6gncMktniU3-Q&s", // Sinar Jaya
  "Steady Safe": "https://steadysafetbk.co.id/wp-content/uploads/2022/08/LOGO-PT.-STEADY-SAFE-Tbk-Color-1.png", // Steady Safe
  "Bianglala Metropolitan": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPIPrMJa-hFy3Bgn4-iuybIpOneKEspkGiGw&s", // BMP
  "Pahala Kencana Transportation": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbu5QUTsaredjAkDMv8QN54ZJaZwMMR91F6w&s", // PKT
  "PT Transportasi Jakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/TransJakarta_Logo.svg/2560px-TransJakarta_Logo.svg.png",
  "Swakelola Transjakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/TransJakarta_Logo.svg/2560px-TransJakarta_Logo.svg.png",
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
  "Golden Dragon": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Golden_Dragon_logo_2.png/1200px-Golden_Dragon_logo_2.png", // Golden Dragon
  "Mitsubishi": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Mitsubishi_motors_new_logo.svg",
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
            const karoseriArr = ['Rahayu Sentosa', 'Restu Ibu Pusaka', 'Laksana'];
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'Hino RK8 R260',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: karoseriArr,
                isBMP: true
            }];
        }
    }
    const matchBMP6 = norm.match(/^(BMP)[- ]?(\d{6})$/);
    if (matchBMP6) {
        const code = matchBMP6[1];
        const numStr = matchBMP6[2];
        const num = parseInt(numStr, 10);
        if (num >= 220252 && num <= 220300) {
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
    // Mayasari Bakti Mercedes-Benz OH 1626 M/T (MYS-18151 s/d MYS-18202)
    const matchMYSBRT = norm.match(/^(MYS)[- ]?(\d{5})$/);
    if (matchMYSBRT) {
        const code = matchMYSBRT[1];
        const numStr = matchMYSBRT[2];
        const num = parseInt(numStr, 10);
        if (num >= 18151 && num <= 18202) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Mayasari Bakti',
                busNumber: num,
                tipe: 'Mercedes-Benz OH 1626 M/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                catatan: 'BRT',
                isMayasariBRT: true
            }];
        }
    }
    // DAMRI Hino RK8 R260
    const matchDMRHino = norm.match(/^(DMR)[- ]?(\d{3,4})$/);
    if (matchDMRHino) {
        const code = matchDMRHino[1];
        const numStr = matchDMRHino[2];
        const num = parseInt(numStr, 10);
        if (num >= 104 && num <= 153) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Hino RK8 R260',
                warna: 'Biru',
                bahanBakar: 'Diesel',
                karoseri: 'Restu Ibu Pusaka',
                isDMRHino: true
            }];
        } else if (num >= 154 && num <= 353) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Hino RK8 R260',
                warna: 'Biru',
                bahanBakar: 'Diesel',
                karoseri: 'Rahayu Sentosa',
                isDMRHino: true
            }];
        } else if ((num >= 354 && num <= 503) || (num >= 604 && num <= 703)) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'DAMRI',
                busNumber: num,
                tipe: 'Hino RK8 R260',
                warna: 'Biru',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                isDMRHino: true
            }];
        }
    }
    // Bianglala Metropolitan SAG Golden Dragon Pivot E12
    const matchBMPGoldenDragon = norm.match(/^(BMP)[- ]?(\d{6})$/);
    if (matchBMPGoldenDragon) {
        const code = matchBMPGoldenDragon[1];
        const numStr = matchBMPGoldenDragon[2];
        const num = parseInt(numStr, 10);
        if (num >= 240322 && num <= 240411) {
            // BRT
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'SAG Golden Dragon Pivot E12',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                catatan: 'BRT',
                isBMPGoldenDragon: true
            }];
        } else if (num >= 230300 && num <= 230321) {
            // Non BRT
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Bianglala Metropolitan',
                busNumber: num,
                tipe: 'SAG Golden Dragon Pivot E12',
                warna: 'Putih Orange',
                bahanBakar: 'Listrik',
                karoseri: 'CBU',
                catatan: 'Non BRT',
                isBMPGoldenDragon: true
            }];
        }
    }
    // Transjakarta (PT Transportasi Jakarta) - kode TJ
    const matchTJ = norm.match(/^(TJ)[- ]?(\d{1,4})$/); // Ubah jadi 1-4 digit
    if (matchTJ) {
        const code = matchTJ[1];
        let numStr = matchTJ[2].replace(/^0+/, ''); // Hilangkan leading zero
        const num = parseInt(numStr, 10);
        // SCANIA K340IA: TJ187
        if (num === 187) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Scania K340IA',
                warna: 'Putih Biru Muda',
                bahanBakar: 'BBG',
                karoseri: 'Gemilang Coachworks',
                pool: 'Pulo Gadung',
                catatan: '',
                isTJ: true
            }];
        }
        // SCANIA K320IA: TJ0188-TJ0238
        if (num >= 188 && num <= 238) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Scania K320IA',
                warna: 'Putih Biru Muda',
                bahanBakar: 'BBG',
                karoseri: 'Laksana',
                pool: 'Pulo Gadung',
                catatan: '',
                isTJ: true
            }];
        }
        // MAN R37: TJ0347-TJ0354 (Nusantara Gemilang)
        if (num >= 347 && num <= 354) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'MAN R37',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Nusantara Gemilang',
                pool: 'Cawang',
                catatan: 'Bus Wisata',
                isTJ: true
            }];
        }
        // Mercedes Benz OC 500 RF 2542: TJ0351 (Nusantara Gemilang)
        if (num === 351) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OC 500 RF 2542',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Nusantara Gemilang',
                pool: 'Cawang',
                catatan: 'Bus Wisata',
                isTJ: true
            }];
        }
        // Mercedes Benz OC 500 RF 2542: TJ0381-TJ0387 (New Armada)
        if (num >= 381 && num <= 387) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OC 500 RF 2542',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'New Armada',
                pool: 'Cawang',
                catatan: 'Bus Wisata',
                isTJ: true
            }];
        }
        if (num === 884) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'SCANIA K310UB',
                warna: 'Merah Putih',
                bahanBakar: 'Diesel',
                karoseri: 'Adi Putro',
                pool: 'Cawang',
                catatan: 'Bus Wisata',
                isTJ: true
            }];
        }
        if (num >= 247 && num <= 346) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1526 M/T',
                warna: 'Putih Biru Muda',
                bahanBakar: 'BBG',
                karoseri: ['Laksana', 'Rahayu Sentosa','Tri Sakti','Tentrem'],
                pool: 'Cawang',
                catatan: 'Bus BRT',
                isTJ: true
            }];
        }
        if (num >= 355 && num <= 380) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OC 500 RF 2542',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Nusantara Gemilang',
                pool: 'Cawang',
                catatan: 'Bus BRT Maxi',
                isTJ: true
            }];
        }
        if (num >= 388 && num <= 408) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1626 A/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                pool: 'Cawang',
                catatan: 'Bus BRT',
                isTJ: true
            }];
        }
        if (num >= 469 && num <= 482) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1626 A/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Restu Ibu Pusaka',
                pool: 'Cawang',
                catatan: 'Bus BRT',
                isTJ: true
            }];
        }
        if (num >= 872 && num <= 881) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OH 1626 M/T',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                pool: 'Cawang',
                catatan: 'Bus BRT',
                isTJ: true
            }];
        }
        if (num >= 409 && num <= 468) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'HINO RK1 JSNL',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'New Armada',
                pool: 'Kedaung Kali Angke',
                catatan: 'Bus BRT',
                isTJ: true
            }];
        }
        if (num >= 483 && num <= 531) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz O 500U 1726',
                warna: 'Putih Orange',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                pool: ['Kedaung Kali Angke', 'Kampung Rambutan'],
                catatan: 'Bus-BRT',
                isTJ: true
            }];
        }
        if (num >= 782 && num <= 871) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz O 500U 1726',
                warna: 'Putih Orange',
                bahanBakar: 'Diesel',
                karoseri: 'Nusantara Gemilang',
                pool: ['Kedaung Kali Angke', 'Kampung Rambutan'],
                catatan: 'Bus Non-BRT',
                isTJ: true
            }];
        }
        if (num >= 532 && num <= 631) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'Mercedes Benz OF 917',
                warna: 'Putih Ungu',
                bahanBakar: 'Diesel',
                karoseri: ['Tentrem', 'New Armada'],
                pool: ['Kedaung Kali Angke', 'Kampung Rambutan'],
                catatan: 'Bus Royaltrans',
                isTJ: true
            }];
        }
        if (num >= 632 && num <= 781) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'PT Transportasi Jakarta',
                busNumber: num,
                tipe: 'SCANIA K250UB',
                warna: 'Putih Orange',
                bahanBakar: 'Diesel',
                karoseri: 'Laksana',
                pool: ['Kedaung Kali Angke', 'Pinang Ranti'],
                catatan: 'Bus Non-BRT',
                isTJ: true
            }];
        }
        // SCANIA K310UB (adi putro), merah putih, Diesel, Pool Cawang, Bus Wisata
        // Placeholder: jika ingin range, tambahkan di sini
    }
    // Swakelola Transjakarta (TSW/Trans Swadaya) - kode TSW
    const matchTSW = norm.match(/^(TSW)[- ]?(\d{3})$/);
    if (matchTSW) {
        const code = matchTSW[1];
        const numStr = matchTSW[2];
        const num = parseInt(numStr, 10);
        if (num === 1) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Swakelola Transjakarta',
                busNumber: num,
                tipe: 'Mitsubishi Colt FE 84G',
                warna: 'Putih Biru Tua',
                bahanBakar: 'Diesel',
                karoseri: 'New Armada',
                pool: 'Pulo Gadung',
                catatan: 'Non BRT',
                isTSW: true
            }];
        } else if (num >= 2 && num <= 100) {
            return [{
                operatorCode: code,
                number: numStr,
                operator: 'Swakelola Transjakarta',
                busNumber: num,
                tipe: 'Mitsubishi Colt FE 84G',
                warna: 'Putih Orange',
                bahanBakar: 'Diesel',
                karoseri: 'New Armada',
                pool: 'Kedaung Kali Angke',
                catatan: 'Non BRT',
                isTSW: true
            }];
        }
    }
    return [];
}

function detectLogoByTipe(tipe) {
  if (!tipe) return null;
  const lower = tipe.toLowerCase();
  if (lower.includes('golden dragon')) return logoKaroseri['Golden Dragon'];
  if (lower.includes('zhongtong')) return logoKaroseri['Zhongtong'];
  if (lower.includes('skywell')) return logoKaroseri['Skywell'];
  if (lower.includes('scania')) return logoKaroseri['Scania'];
  if (lower.includes('mercedes')) return logoKaroseri['Mercedes-Benz'];
  if (lower.includes('man')) return logoKaroseri['MAN'];
  if (lower.includes('nusantara')) return logoKaroseri['Nusantara Gemilang'];
  if (lower.includes('laksana')) return logoKaroseri['Laksana'];
  if (lower.includes('rahayu sentosa')) return logoKaroseri['Rahayu Sentosa'];
  if (lower.includes('tentrem')) return logoKaroseri['Tentrem'];
  if (lower.includes('restu ibu')) return logoKaroseri['Restu Ibu'];
  if (lower.includes('mitsubishi')) return logoKaroseri['Mitsubishi'];
  return null;
}

function detectLogoChasis(tipe) {
  if (!tipe) return null;
  const lower = tipe.toLowerCase();
  if (lower.includes('golden dragon')) return logoChasis['Golden Dragon'];
  if (lower.includes('skywell')) return logoChasis['Skywell'];
  if (lower.includes('zhongtong')) return logoChasis['Zhongtong'];
  if (lower.includes('scania')) return logoChasis['Scania'];
  if (lower.includes('mercedes')) return logoChasis['Mercedes-Benz'];
  if (lower.includes('hino')) return logoChasis['Hino'];
  if (lower.includes('man')) return logoChasis['MAN'];
  if (lower.includes('vktr')) return logoChasis['VKTR'];
  if (lower.includes('volvo')) return logoChasis['Volvo'];
  if (lower.includes('mitsubishi')) return logoChasis['Mitsubishi'];
  return null;
}

function renderBusSearchResults(results) {
    if (!results.length) return '<div class="alert alert-warning">Belum ada data bus.</div>';
    const bus = results[0];
    // Logo
    // Render logo operator di baris sendiri
    const logoOp = logoOperator[bus.operator] || '';
    // Render semua logo karoseri di baris terpisah setelah operator
    let logoKar = '';
    if (Array.isArray(bus.karoseri)) {
      logoKar = bus.karoseri.map(k => logoKaroseri[k.trim()] ? `<img src="${logoKaroseri[k.trim()]}" alt="Karoseri" style="max-height:40px;max-width:100%;object-fit:contain;" class="rounded-2 me-1" />` : '').join('');
    } else if (bus.karoseri && bus.karoseri !== 'CBU') {
      logoKar = bus.karoseri.split(/[\/|,]/).map(k => logoKaroseri[k.trim()] ? `<img src="${logoKaroseri[k.trim()]}" alt="Karoseri" style="max-height:40px;max-width:100%;object-fit:contain;" class="rounded-2 me-1" />` : '').join('');
    }
    const logoSasis = detectLogoChasis(bus.tipe) || '';
    // Nomor bus
    let nomorBus = bus.number;
    // Hilangkan 0 di depan nomor bus TJ (paksa hilangkan semua leading zero)
    if (bus.operator === 'PT Transportasi Jakarta') {
      nomorBus = nomorBus.replace(/^0+/, '');
    }
    // Pastikan badge tetap format TJ-xxx
    const badgeNomor = `${bus.operatorCode || ''}-${nomorBus}`;
    // Info ringkas
    let infoRingkas = '';
    // Perbaiki deteksi Bus Maxi agar lebih fleksibel
    const busMaxiTypes = [
      'SCANIAK310IB',
      'VOLVOB11R',
      'MERCEDESBENZOC500RF2542',
      'MERCEDESBENZOC500RF2542',
      'MERCEDESBENZOC500RF2542',
      'MERCEDESBENZOC500RF2542'
    ];
    const tipeNormalized = (bus.tipe || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isBusMaxi = busMaxiTypes.some(t => tipeNormalized.includes(t));

    // Gambar bus jika ada
    // Pencocokan key mapping gambar lebih fleksibel (case-insensitive, tanpa spasi)
    function findBusImageKey(tipe) {
      if (!tipe) return undefined;
      const norm = tipe.replace(/\s+/g, ' ').trim().toUpperCase();
      for (const key in busImages) {
        if (key.replace(/\s+/g, ' ').trim().toUpperCase() === norm) return key;
      }
      return undefined;
    }
    let busImg = undefined;
    const imgKey = findBusImageKey(bus.tipe);
    if (imgKey) busImg = busImages[imgKey];
    // Fallback: jika tipe mengandung 'Mercedes' dan 'OH 1626', pakai gambar Mercedes-Benz OH 1626
    if (!busImg && /mercedes.*oh 1626/i.test(bus.tipe)) {
      // Cek varian M/T atau A/T
      if (/m\/t/i.test(bus.tipe)) {
        busImg = busImages['Mercedes Benz OH 1626 M/T'] || busImg;
      } else if (/a\/t/i.test(bus.tipe)) {
        busImg = busImages['Mercedes Benz OH 1626 A/T'] || busImg;
      } else {
        busImg = busImages['Mercedes Benz 1626 TJ'] || busImages['Mercedes-Benz OH 1626'] || busImages['Mercedes Benz OH 1626'] || busImages['Mercedes-Benz OH 1626 M/T'] || busImages['Mercedes-Benz OH 1626 A/T'] || busImg;
      }
    }
    // Khusus gambar TJ by tipe & range (standarisasi key mapping)
    if (bus.operator === 'PT Transportasi Jakarta') {
      const tipeKey = (bus.tipe || '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (tipeKey === 'SCANIA K340IA') {
        busImg = busImages['SCANIA K340IA'] || busImg;
      } else if (tipeKey === 'SCANIA K320IA') {
        busImg = busImages['SCANIA K320IA'] || busImg;
      } else if (tipeKey === 'MAN R37') {
        busImg = busImages['MAN R37'] || busImg;
      } else if (tipeKey === 'MERCEDES BENZ OC 500 RF 2542') {
        if (bus.number === '351') {
          busImg = busImages['Mercedes Benz OC 500 RF 2542'] || busImg;
        } else if (parseInt(bus.number, 10) >= 381 && parseInt(bus.number, 10) <= 387) {
          busImg = busImages['Mercedes Benz OC 500 RF 2542 0381-0387'] || busImg;
        } else {
          busImg = busImages['Mercedes Benz OC 500 RF 2542 LAIN'] || busImg;
        }
      } else if (tipeKey === 'SCANIA K310UB') {
        busImg = busImages['SCANIA K310UB'] || busImg;
      } else if (tipeKey === 'MERCEDES BENZ OH 1526 M/T') {
        busImg = busImages['Mercedes Benz OH 1526 M/T'] || busImg;
      } else if (tipeKey === 'MERCEDES BENZ 1626 TJ') {
        busImg = busImages['Mercedes Benz 1626 TJ'] || busImg;
      } else if (tipeKey === 'HINO RK1 JSNL') {
        busImg = busImages['Hino RK1 JSNL'] || busImg;
      } else if (tipeKey === 'MERCEDES BENZ O 500U 1726') {
        // Cek karoseri
        if ((bus.karoseri || '').toLowerCase().includes('laksana')) {
          busImg = busImages['Mercedes Benz O 500U 1726 Laksana'] || busImg;
        } else if ((bus.karoseri || '').toLowerCase().includes('nusantara gemilang')) {
          busImg = busImages['Mercedes Benz O 500U 1726 Nusantara Gemilang'] || busImg;
        }
      } else if (tipeKey === 'MERCEDES BENZ OF 917') {
        busImg = busImages['Mercedes Benz OF 917'] || busImg;
      } else if (tipeKey === 'SCANIA K250UB') {
        busImg = busImages['SCANIA K250UB'] || busImg;
      }
    }
    // Khusus Bianglala Metropolitan Golden Dragon Non BRT (23xxxx)
    if (
      bus.operator === 'Bianglala Metropolitan' &&
      bus.tipe === 'SAG Golden Dragon Pivot E12' &&
      /^23/.test(bus.number)
    ) {
      busImg = busImages['SAG Golden Dragon Pivot E12 Non BRT'] || busImg;
    }
    // Khusus Mayasari Bakti Mercedes-Benz OH 1626 21xxx
    if (
      bus.operator === 'Mayasari Bakti' &&
      /mercedes.*oh 1626/i.test(bus.tipe) &&
      /^21/.test(bus.number)
    ) {
      busImg = busImages['Mercedes-Benz OH 1626 21xxx'] || busImg;
    }
    // Khusus BMP Mercedes Benz OH 1626
    if (
      bus.operator === 'Bianglala Metropolitan' &&
      /mercedes.*oh 1626/i.test(bus.tipe)
    ) {
      busImg = busImages['BMP Mercedes Benz OH 1626'] || busImg;
    }
    // Khusus Mayasari Bakti VKTR BYD B12
    if (
      bus.operator === 'Mayasari Bakti' &&
      bus.tipe === 'VKTR BYD B12'
    ) {
      if ((bus.warna || '').toLowerCase().includes('tosca')) {
        busImg = busImages['Mayasari VKTR BYD B12 Tosca'] || busImg;
      } else if ((bus.warna || '').toLowerCase().includes('putih orange')) {
        busImg = busImages['Mayasari VKTR BYD B12 Putih Orange'] || busImg;
      }
    }
    // Khusus Swakelola Transjakarta (TSW)
    if (
      bus.operator === 'Swakelola Transjakarta' &&
      bus.tipe && bus.tipe.toLowerCase().includes('mitsubishi')
    ) {
      if ((bus.warna || '').toLowerCase().includes('biru')) {
        busImg = busImages['TSW Biru'] || busImg;
      } else if ((bus.warna || '').toLowerCase().includes('putih orange')) {
        busImg = busImages['TSW Putih Orange'] || busImg;
      }
    }
    // Khusus PKT Mercedes Benz OH 1626 M/T
    if (
      bus.operator === 'Pahala Kencana Transportation' &&
      /mercedes.*oh 1626/i.test(bus.tipe)
    ) {
      busImg = busImages['PKT Mercedes Benz OH 1626 M/T'] || busImg;
    }
    // Khusus DAMRI Hino RK8 R260 karoseri
    if (
      bus.operator === 'DAMRI' &&
      /hino.*rk8.*r260/i.test(bus.tipe)
    ) {
      if ((bus.karoseri || '').toLowerCase().includes('restu ibu')) {
        busImg = busImages['DAMRI Hino RK8 R260 Restu Ibu Pusaka'] || busImg;
      } else if ((bus.karoseri || '').toLowerCase().includes('rahayu sentosa')) {
        busImg = busImages['DAMRI Hino RK8 R260 Rahayu Sentosa'] || busImg;
      } else if ((bus.karoseri || '').toLowerCase().includes('laksana')) {
        busImg = busImages['DAMRI Hino RK8 R260 Laksana'] || busImg;
      }
    }

    if (bus.operator === 'PT Transportasi Jakarta' && bus.tipe === 'Scania K340IA') {
        const urut = parseInt(bus.number, 10) - 187 + 1;
        infoRingkas = `Bus ke ${urut} PT Transportasi Jakarta`;
    } else if (bus.operator === 'PT Transportasi Jakarta' && bus.tipe === 'Scania K320IA') {
        const urut = parseInt(bus.number, 10) - 187;
        infoRingkas = `Bus ke ${urut} PT Transportasi Jakarta`;
    } else if (bus.operator === 'Mayasari Bakti') {
        const tahun = '20' + nomorBus.slice(0, 2);
        const urut = parseInt(nomorBus.slice(-3), 10);
        infoRingkas = `Bus ke ${urut} Mayasari Bakti tahun ${tahun}`;
    } else if (bus.operator === 'DAMRI') {
        // Jika nomor bus 4 digit (misal 0703, 0530, dst), tampilkan ringkas sederhana
        if (/^\d{4}$/.test(nomorBus)) {
            infoRingkas = `Bus DAMRI No. ${nomorBus}`;
        } else {
            const tahun = '20' + nomorBus.slice(0, 2);
            const urut = parseInt(nomorBus.slice(-3), 10);
            const ke = urut - 98;
            infoRingkas = `Bus nomor ${urut} / bus ke ${ke} Tahun ${tahun} Milik DAMRI`;
        }
    } else if (bus.operator === 'Steady Safe') {
        const urut = parseInt(nomorBus, 10);
        infoRingkas = `Bus ke ${urut} Steady Safe`;
    } else if (bus.operator === 'Pahala Kencana Transportation') {
        const urut = parseInt(nomorBus, 10) - 100;
        infoRingkas = `Bus ke ${urut} Pahala Kencana Transportation`;
    } else if (bus.operator === 'Bianglala Metropolitan' && nomorBus.length === 6) {
        // Khusus BMP 6 digit (SAG Golden Dragon Pivot E12)
        const tahun = '20' + nomorBus.slice(0, 2);
        let urut = null;
        if (nomorBus.startsWith('24') && parseInt(nomorBus, 10) >= 240322 && parseInt(nomorBus, 10) <= 240411) {
            urut = parseInt(nomorBus, 10) - 240321; // urutan mulai dari 1 di 240322
        } else if (nomorBus.startsWith('23') && parseInt(nomorBus, 10) >= 230300 && parseInt(nomorBus, 10) <= 230321) {
            urut = parseInt(nomorBus, 10) - 230299; // urutan mulai dari 1 di 230300
        }
        if (urut !== null) {
            infoRingkas = `Bus ke ${urut} bianglala metropolitan tahun ${tahun}`;
        }
    }
    if (bus.operator === 'PT Transportasi Jakarta' && (bus.catatan && bus.catatan.toLowerCase().includes('wisata'))) {
        const urut = parseInt(bus.number, 10);
        infoRingkas = `Bus ke ${urut} PT Transportasi Jakarta, Bus Wisata`;
    }
    if (bus.operator === 'Swakelola Transjakarta') {
        const urut = parseInt(bus.number, 10);
        infoRingkas = `Bus ke ${urut} Swakelola Transjakarta`;
    }
    if (isBusMaxi) {
        infoRingkas += (infoRingkas ? ', ' : '') + 'Bus Maxi';
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
      ${busImg ? `<img src="${busImg}" alt="${bus.tipe}" style="max-width:100%;max-height:120px;object-fit:cover;border-radius:0.7em;margin-bottom:8px;" class="bus-photo mb-2" />` : ''}
      ${logoSasis ? `<img src="${logoSasis}" alt="Sasis Watermark" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:70%;max-width:320px;opacity:0.10;z-index:1;pointer-events:none;user-select:none;" />` : ''}
      <div class="d-flex justify-content-center align-items-center mb-2 gap-2" style="padding:0 8px;position:relative;z-index:2;">
        ${logoOp ? `<img src="${logoOp}" alt="Operator" style="max-height:40px;max-width:100%;object-fit:contain;" class="rounded-2" />` : ''}
      </div>
      ${logoKar ? `<div class="d-flex justify-content-center align-items-center mb-2 gap-2">${logoKar}</div>` : ''}
      <div class="mb-2">
        <span class="badge rounded-5 bg-primary fs-3 px-4 py-2"
          style="${
            (bus.operator === 'Mayasari Bakti' && tahunBus && tahunBus >= 2021)
              ? "font-family:'PT Sans Narrow',sans-serif;"
              : (bus.operatorCode === 'SAF' || bus.operatorCode === 'BMP' || (tahunBus && tahunBus < 2021 && bus.operatorCode !== 'MB' && bus.operatorCode !== 'MYS' && bus.operatorCode !== 'DMR'))
                ? (
                    bus.operator === 'Bianglala Metropolitan' && nomorBus.length === 6 && (nomorBus.startsWith('23') || nomorBus.startsWith('24'))
                      ? "font-family:'PT Sans Narrow',sans-serif;"
                      : "font-family:'Rubik','New Rubik',sans-serif;"
                  )
                : ((bus.operatorCode === 'MB' || bus.operatorCode === 'MYS' || (bus.operatorCode === 'DMR' && nomorBus.length === 3))
                  ? "font-family:'Roboto',sans-serif;"
                  : (bus.operatorCode === 'PKT' ? "font-family:'New Rubik','Rubik',sans-serif;" : "")
                )
          }"
        >${badgeNomor}</span>
        ${bus.operator === 'Sinar Jaya' ? '<div class="fw-bold mt-1">Sinar Jaya</div>' : ''}
      </div>
      <div class="mb-2 fw-bold" style="${bus.operator === 'Bianglala Metropolitan' && nomorBus.length === 6 && (nomorBus.startsWith('23') || nomorBus.startsWith('24')) ? "font-family:'PT Sans Narrow',sans-serif;" : ''}">${infoRingkas}</div>
      <div class="mb-2">
        <div>${bus.tipe}</div>
        <div>${bus.warna}</div>
        <div class="fw-bold">
          ${bus.bahanBakar === 'Listrik' ? '<span style="font-family:\'PT Sans Narrow\',sans-serif;">Bus Listrik <iconify-icon inline icon="streamline:electric-cord-3-remix"></iconify-icon></span>' : ''}
          ${bus.bahanBakar === 'BBG' ? 'Bus BBG / Gas Alam Terkompresi <iconify-icon inline icon="icon-park-outline:gas"></iconify-icon>' : ''}
          ${bus.bahanBakar === 'Diesel' ? 'Diesel <iconify-icon inline icon="bi:fuel-pump-diesel"></iconify-icon>' : ''}
        </div>
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

// Mapping gambar bus per tipe utama
const busImages = {
  'VKTR BYD D9': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Transjakarta_SJM-240012.jpg/1280px-Transjakarta_SJM-240012.jpg',
  'Volvo B11R': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Transjakarta_Steady_Safe_Cityline_2_Laksana.jpg/1280px-Transjakarta_Steady_Safe_Cityline_2_Laksana.jpg',
  'Mercedes-Benz OH 1626 A/T': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Transjakarta_Mercedes_Benz_OH_1626_Ng_MYS-19220_at_Cibubur_junction.jpg/1280px-Transjakarta_Mercedes_Benz_OH_1626_Ng_MYS-19220_at_Cibubur_junction.jpg',
  'Mercedes Benz OH 1626 M/T': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Transjakarta_Mercedes_Benz_OH_1626_Ng_MYS-19220_at_Cibubur_junction.jpg/1280px-Transjakarta_Mercedes_Benz_OH_1626_Ng_MYS-19220_at_Cibubur_junction.jpg',
  'Scania K320IA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Transjakarta_-_MB-1601_Scania_K320IA.jpg/1280px-Transjakarta_-_MB-1601_Scania_K320IA.jpg',
  'Scania K310IB': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Transjakarta_Scania_K310IB_%2851211368992%29.jpg/1280px-Transjakarta_Scania_K310IB_%2851211368992%29.jpg',
  'SAG Golden Dragon Pivot E12': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Transjakarta_BMP-240388.jpg/1280px-Transjakarta_BMP-240388.jpg',
  'Hino RK8 R260': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Transjakarta_14_and_14A_Buses_at_JIS.jpg/1280px-Transjakarta_14_and_14A_Buses_at_JIS.jpg',
  'Zhongtong Bus LCK6180GC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Monas_Zhongtong_Transjakarta.jpg/1280px-Monas_Zhongtong_Transjakarta.jpg',
  'Zhongtong Bus LCK6126EVGRA1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Transjakarta_Perum_DAMRI_Zhongtong_Bus.jpg/1280px-Transjakarta_Perum_DAMRI_Zhongtong_Bus.jpg',
  'Zhongtong Bus LCK6126EVGRA2': 'https://img.okezone.com/content/2025/06/20/1/3148864/bus_listrik_damri-peyD_large.jpg',
  'Skywell NJL6126BEV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Transjakarta_-_DMR-240156.jpg/1280px-Transjakarta_-_DMR-240156.jpg',
  'Skywell NJL6129BEV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Transjakarta_Metrotrans_Skywell_Electric_Bus.jpg/1280px-Transjakarta_Metrotrans_Skywell_Electric_Bus.jpg',
  'SAG Golden Dragon Pivot E12 Non BRT': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Bus_Metrotrans_di_rute_4B.jpg/1280px-Bus_Metrotrans_di_rute_4B.jpg',
  'Mercedes-Benz OH 1626 21xxx': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Transjakarta_-_MYS-21263_Daimler_OH_1626.jpg/1280px-Transjakarta_-_MYS-21263_Daimler_OH_1626.jpg',
  'BMP Mercedes Benz OH 1626': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Bianglala_TJ_6H_4-7-2022_Gondangdia.jpg/1280px-Bianglala_TJ_6H_4-7-2022_Gondangdia.jpg',
  'Mayasari VKTR BYD B12 Tosca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Transjakarta_-_MYS-22345_BYD_B12.jpg/1280px-Transjakarta_-_MYS-22345_BYD_B12.jpg',
  'Mayasari VKTR BYD B12 Putih Orange': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mayasari_TJ_EV_2022-07-07.jpg/1280px-Mayasari_TJ_EV_2022-07-07.jpg',
  'TSW Biru': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHqWx5PtUeP3W28ZCr5zNokG47IXWku43HqQ&s',
  'TSW Putih Orange': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/MiniTrans.jpg/1280px-MiniTrans.jpg',
  'PKT Mercedes Benz OH 1626 M/T': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Transjakarta_PKT_106_at_Gambir.jpg/1280px-Transjakarta_PKT_106_at_Gambir.jpg',
  'DAMRI Hino RK8 R260 Restu Ibu Pusaka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Transjakarta_Hino_RK8_R260_Restu_Ibu_Integra_%2851378826230%29.jpg/1280px-Transjakarta_Hino_RK8_R260_Restu_Ibu_Integra_%2851378826230%29.jpg',
  'DAMRI Hino RK8 R260 Rahayu Sentosa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Transjakarta_14_and_14A_Buses_at_JIS.jpg/1280px-Transjakarta_14_and_14A_Buses_at_JIS.jpg',
  'DAMRI Hino RK8 R260 Laksana': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Transjakarta_Perum_DAMRI_Discovery_Laksana.jpg/1280px-Transjakarta_Perum_DAMRI_Discovery_Laksana.jpg',
  'SCANIA K340IA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/TransJakarta_Scania_K340IA_Euro_6.jpg/1280px-TransJakarta_Scania_K340IA_Euro_6.jpg',
  'SCANIA K320IA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Transjakarta_Scania_K320iA.jpg/1280px-Transjakarta_Scania_K320iA.jpg',
  'MAN R37': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Transjakarta_Wisata_-_MAN_RR4.jpg/1280px-Transjakarta_Wisata_-_MAN_RR4.jpg',
  'Mercedes Benz OC 500 RF 2542': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Transjakarta_Wisata_-_TJ_0351_MB_OC500RF_2542.jpg/1280px-Transjakarta_Wisata_-_TJ_0351_MB_OC500RF_2542.jpg',
  'Mercedes Benz OC 500 RF 2542 0381-0387': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Transjakarta_Wisata_-_TJ384_Daimler_OC500RF_2542.jpg/1280px-Transjakarta_Wisata_-_TJ384_Daimler_OC500RF_2542.jpg',
  'SCANIA K310UB': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Transjakarta_Wisata_-_TJ884_Scania_K310UB.jpg/1280px-Transjakarta_Wisata_-_TJ884_Scania_K310UB.jpg',
  'Mercedes Benz OH 1526 M/T': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Transjakarta1526.jpg/1280px-Transjakarta1526.jpg',
  'Mercedes Benz OC 500 RF 2542 LAIN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Transjakarta_2542.jpg/1280px-Transjakarta_2542.jpg',
  'Mercedes Benz 1626 TJ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/TJ_1626.jpg/1280px-TJ_1626.jpg',
  'Hino RK1 JSNL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/TJ_RK_CNG.jpg/1280px-TJ_RK_CNG.jpg',
  'Mercedes Benz O 500U 1726 Laksana': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/TJ_LD_Menwa_UI_20220924.jpg/1280px-TJ_LD_Menwa_UI_20220924.jpg',
  'Mercedes Benz O 500U 1726 Nusantara Gemilang': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/TJ_0791_at_Senayan.jpg/1280px-TJ_0791_at_Senayan.jpg',
  'Mercedes Benz OF 917': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Royal_Trans_TJ_536.jpg/1280px-Royal_Trans_TJ_536.jpg',
  'SCANIA K250UB': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Transjakarta_-_TJ632_Scania_K250UB.jpg/1280px-Transjakarta_-_TJ632_Scania_K250UB.jpg',
};
busImages['Mercedes Benz OH 1626 M/T'] = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/TJ_1626.jpg/1280px-TJ_1626.jpg';
busImages['Mercedes Benz OH 1626 A/T'] = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/TJ_1626.jpg/1280px-TJ_1626.jpg';

// --- RENDER BUS LIST PER OPERATOR (dengan rentang nomor bus & gambar) ---
function renderBusListByOperator(operator) {
  const buses = filterBusesByOperator(operator);
  if (!buses.length) return '<div class="alert alert-warning">Tidak ada data bus untuk operator ini.</div>';
  // Kelompokkan berdasarkan tipe bus
  const typeMap = {};
  buses.forEach(bus => {
    if (!typeMap[bus.tipe]) typeMap[bus.tipe] = [];
    typeMap[bus.tipe].push(bus);
  });
  let html = `<h5 class="fw-bold mb-2">${operator} <span class="badge bg-primary">${buses.length} bus</span></h5>`;
  html += '<ul class="list-group mb-3">';
  Object.keys(typeMap).forEach(tipe => {
    const tipeBuses = typeMap[tipe];
    // Ambil rentang nomor bus
    const numbers = tipeBuses.map(b => b.number).sort((a, b) => a - b);
    const minNum = numbers[0];
    const maxNum = numbers[numbers.length - 1];
    // Gambar bus jika ada
    const img = busImages[tipe] ? `<img src="${busImages[tipe]}" alt="${tipe}" style="max-height:48px;max-width:80px;object-fit:cover;border-radius:0.5em;margin-right:10px;" class="me-2" />` : '';
    html += `<li class="list-group-item d-flex justify-content-between align-items-center flex-wrap">
      <span class="d-flex align-items-center">${img}<span>${tipe}<br><small class="text-muted">No. ${minNum} - ${maxNum}</small></span></span>
      <span class="badge bg-info">${tipeBuses.length} bus</span>
    </li>`;
  });
  html += '</ul>';
  return html;
}