// Raylı Sistemler Rehberi - İnteraktif Portal Uygulama Motoru

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚄 Raylı Sistemler Rehberi Portalı Yüklendi!");
    
    // --- 1. SEKMELER (TABS) KONTROLÜ ---
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetPane = document.getElementById(target);
            if (targetPane) targetPane.classList.add('active');
            
            // Eğer tren simülasyonu sekmesine geçildiyse ve grafik yoksa yeniden boyutlandır
            if (target === 'train-sim' && motionChart) {
                setTimeout(() => motionChart.resize(), 100);
            }
        });
    });

    // --- 2. MÜFREDAT TAKİPÇİSİ VE ACCORDION ---
    // Accordion Açma/Kapama Fonksiyonu (Global olarak da tanımlanmalı)
    window.toggleAccordion = function(id) {
        const item = document.getElementById(`acc-${id}`).parentElement;
        const isActive = item.classList.contains('active');
        
        // Diğerlerini kapat
        document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
        
        if (!isActive) {
            item.classList.add('active');
        }
    };

    const checkboxes = document.querySelectorAll('.curriculum-check');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');

    function updateProgress() {
        const total = checkboxes.length;
        let checkedCount = 0;
        
        checkboxes.forEach(cb => {
            if (cb.checked) checkedCount++;
        });
        
        const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.innerText = `${percent}%`;
    }

    // Checkbox durumlarını yükle
    checkboxes.forEach(cb => {
        const id = cb.getAttribute('data-id');
        const saved = localStorage.getItem(`curric_${id}`);
        if (saved === 'true') {
            cb.checked = true;
        }
        
        cb.addEventListener('change', () => {
            localStorage.setItem(`curric_${id}`, cb.checked);
            updateProgress();
        });
    });
    updateProgress();


    // --- 3. TREN DİNAMİĞİ VE SÜRÜŞ SİMÜLATÖRÜ ---
    // Tren Modelleri Veritabanı
    const trainPresets = {
        metro: { mass: 120, traction: 120, braking: 150, area: 11.5, name: "Milli Metro Seti (TÜRASAŞ)" },
        yht: { mass: 450, traction: 320, braking: 400, area: 11.0, name: "Siemens Velaro TR (YHT)" },
        freight: { mass: 1500, traction: 650, braking: 800, area: 12.5, name: "Wabtec Yük Treni" },
        custom: { mass: 200, traction: 180, braking: 220, area: 12.0, name: "Özel Tasarım Tren" }
    };

    // DOM Elemanları
    const trainTypeSel = document.getElementById('train-type');
    const inputMass = document.getElementById('sim-mass');
    const inputTraction = document.getElementById('sim-traction');
    const inputBraking = document.getElementById('sim-braking');
    const inputGradient = document.getElementById('sim-gradient');
    const inputCurve = document.getElementById('sim-curve');
    const selectWeather = document.getElementById('sim-weather');
    
    const valGradient = document.getElementById('val-gradient');
    const valCurve = document.getElementById('val-curve');
    
    const btnPower = document.getElementById('btn-power');
    const btnCoast = document.getElementById('btn-coast');
    const btnBrake = document.getElementById('btn-brake');
    const btnEmergency = document.getElementById('btn-emergency');
    
    const btnSimStart = document.getElementById('btn-sim-start');
    const btnSimReset = document.getElementById('btn-sim-reset');
    const checkAuto = document.getElementById('sim-auto');

    const gaugeSpeed = document.getElementById('gauge-speed');
    const gaugeAcc = document.getElementById('gauge-acc');
    const gaugeDist = document.getElementById('gauge-dist');
    const gaugeRes = document.getElementById('gauge-res');
    
    const animTrain = document.getElementById('anim-train');
    const animStation = document.getElementById('anim-station');
    const trainBubble = document.getElementById('train-bubble');
    const gradientInfobar = document.getElementById('gradient-infobar');
    const tunnelOverlay = document.getElementById('tunnel-overlay');

    // Simülasyon Durum Değişkenleri
    let simInterval = null;
    let isRunning = false;
    let timeElapsed = 0; // saniye
    let currentSpeed = 0; // m/s
    let currentPosition = 0; // m
    let currentAcceleration = 0; // m/s2
    let drivingMode = 'coast'; // power, coast, brake, emergency
    
    // Grafik Verileri
    let chartTime = [];
    let chartSpeed = [];
    let chartDistance = [];

    // Grafik İlklendirme
    const ctx = document.getElementById('motionChart').getContext('2d');
    const motionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartTime,
            datasets: [
                {
                    label: 'Hız (km/h)',
                    data: chartSpeed,
                    borderColor: '#00d2ff',
                    backgroundColor: 'rgba(0, 210, 255, 0.05)',
                    borderWidth: 2,
                    yAxisID: 'y-speed',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Mesafe (m)',
                    data: chartDistance,
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    yAxisID: 'y-dist',
                    tension: 0.3,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Zaman (sn)', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                'y-speed': {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Hız (km/h)', color: '#00d2ff' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                'y-dist': {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Mesafe (m)', color: '#10b981' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            }
        }
    });

    // Preset seçici
    trainTypeSel.addEventListener('change', () => {
        const preset = trainPresets[trainTypeSel.value];
        if (preset) {
            inputMass.value = preset.mass;
            inputTraction.value = preset.traction;
            inputBraking.value = preset.braking;
            
            if (trainTypeSel.value === 'custom') {
                inputMass.disabled = false;
                inputTraction.disabled = false;
                inputBraking.disabled = false;
            } else {
                inputMass.disabled = true;
                inputTraction.disabled = true;
                inputBraking.disabled = true;
            }
        }
    });

    // Slider Güncellemeleri
    inputGradient.addEventListener('input', () => {
        const val = parseInt(inputGradient.value);
        valGradient.innerText = val >= 0 ? `‰${val}` : `-‰${Math.abs(val)}`;
        gradientInfobar.innerText = val >= 0 ? `Eğim: Rampa Yukarı (‰${val})` : `Eğim: Rampa Aşağı (-‰${Math.abs(val)})`;
    });

    inputCurve.addEventListener('input', () => {
        const val = parseInt(inputCurve.value);
        valCurve.innerText = val === 0 ? "Düz Hat" : `${val}m Yarıçap`;
    });

    // Sürüş Kabini Buton Dinamikleri
    const driveBtns = [btnPower, btnCoast, btnBrake, btnEmergency];
    function setDrivingMode(mode) {
        drivingMode = mode;
        driveBtns.forEach(btn => btn.classList.remove('active'));
        if (mode === 'power') btnPower.classList.add('active');
        if (mode === 'coast') btnCoast.classList.add('active');
        if (mode === 'brake') btnBrake.classList.add('active');
        if (mode === 'emergency') btnEmergency.classList.add('active');
    }

    btnPower.addEventListener('click', () => setDrivingMode('power'));
    btnCoast.addEventListener('click', () => setDrivingMode('coast'));
    btnBrake.addEventListener('click', () => setDrivingMode('brake'));
    btnEmergency.addEventListener('click', () => setDrivingMode('emergency'));

    // Fizik Motoru Simülasyon Döngüsü (100ms zaman adımı)
    function simulateStep() {
        const mass = parseFloat(inputMass.value) * 1000; // kg
        const maxTraction = parseFloat(inputTraction.value) * 1000; // N
        const maxBraking = parseFloat(inputBraking.value) * 1000; // N
        const gradient = parseFloat(inputGradient.value); // promil
        const curve = parseFloat(inputCurve.value); // m
        const weather = selectWeather.value;
        const preset = trainPresets[trainTypeSel.value] || trainPresets.custom;
        const area = preset.area;

        const dt = 0.1; // zaman adımı 100ms
        
        // 1. Hava ve Adhezyon Katsayısı Belirleme (Fren ve Çekiş gücünü sınırlar)
        let mu = 0.25; // kuru ray
        if (weather === 'wet') mu = 0.15;
        if (weather === 'icy') mu = 0.05;
        const adhesionLimitForce = mass * 9.81 * mu;

        // 2. Davis Direnci Katsayıları (Mekanik ve Aerodinamik direnç)
        const davis_A = 6.4 * (mass / 1000) * 0.001 * 9.81; // N
        const davis_B = 0.18 * (mass / 1000) * 0.001 * 9.81; // N / (m/s)
        const davis_C = 0.35 * area; // N / (m/s)^2
        
        const r_davis = davis_A + (davis_B * currentSpeed) + (davis_C * (currentSpeed ** 2));

        // 3. Eğim Direnci
        const r_grade = mass * 9.81 * (gradient / 1000.0);

        // 4. Kurp Direnci
        let r_curve = 0.0;
        if (curve > 300) {
            r_curve = (mass / 1000.0) * (650.0 / (curve - 55.0)) * 9.81;
        } else if (curve > 0) {
            r_curve = (mass / 1000.0) * (500.0 / (curve - 30.0)) * 9.81;
        }

        const totalResistance = r_davis + r_grade + r_curve;

        // 5. Uygulanan Kuvvet
        let appliedForce = 0.0;
        if (drivingMode === 'power') {
            appliedForce = Math.min(maxTraction, adhesionLimitForce);
        } else if (drivingMode === 'coast') {
            appliedForce = 0.0;
        } else if (drivingMode === 'brake') {
            appliedForce = -Math.min(maxBraking * 0.6, adhesionLimitForce); // Servis freni %60 güç
        } else if (drivingMode === 'emergency') {
            appliedForce = -Math.min(maxBraking, adhesionLimitForce); // Acil fren %100 güç
        }

        // 6. Net Kuvvet ve İvme Hesaplama (F = m * a)
        const netForce = appliedForce - totalResistance;
        currentAcceleration = netForce / mass;

        // Hız güncelleme
        currentSpeed += currentAcceleration * dt;
        if (currentSpeed < 0.01) {
            currentSpeed = 0.0;
            currentAcceleration = 0.0;
        }

        // Konum güncelleme
        currentPosition += currentSpeed * dt;

        // 7. Otopilot / Senaryo Modu (Otomatik sürüş mantığı)
        if (checkAuto.checked) {
            // Basit Senaryo: 1500m uzaklıkta bir istasyon var.
            // 0 - 600m arası: Hızlan
            // 600 - 1100m arası: Boşa al (coasting)
            // 1100m - Durana kadar: Fren yap ve istasyonda dur
            if (currentPosition < 600) {
                setDrivingMode('power');
            } else if (currentPosition < 1100) {
                setDrivingMode('coast');
            } else {
                // İstasyona yaklaşırken hıza göre fren ayarla
                if (currentSpeed > 5) {
                    setDrivingMode('brake');
                } else if (currentSpeed > 0) {
                    setDrivingMode('brake');
                } else {
                    setDrivingMode('coast');
                    pauseSimulation();
                    alert("🤖 Otopilot Senaryosu Başarıyla Tamamlandı: Tren B İstasyonunda emniyetli şekilde durduruldu!");
                    checkAuto.checked = false;
                }
            }
        }

        // 8. Göstergeleri Güncelle
        const speedKmh = currentSpeed * 3.6;
        gaugeSpeed.innerHTML = `${speedKmh.toFixed(1)} <small>km/h</small>`;
        gaugeAcc.innerHTML = `${currentAcceleration.toFixed(2)} <small>m/s²</small>`;
        gaugeDist.innerHTML = `${currentPosition.toFixed(0)} <small>m</small>`;
        gaugeRes.innerHTML = `${(totalResistance / 1000).toFixed(1)} <small>kN</small>`;

        // 9. Görsel Animasyonu Güncelle
        // İstasyon mesafesini 1500m kabul edelim.
        const targetDistance = 1500;
        const progressFactor = (currentPosition % targetDistance) / targetDistance;
        const leftPercent = progressFactor * 85; // %85 ekran sınırı
        
        if (animTrain) {
            animTrain.style.left = `${leftPercent}%`;
            const wheelsList = animTrain.querySelectorAll('.wheel');
            wheelsList.forEach(w => {
                if (currentSpeed > 0) {
                    w.style.animationPlayState = 'running';
                    // Dönüş hızını trenin hızına göre ayarla
                    w.style.animationDuration = `${Math.max(0.1, 2 / (currentSpeed + 1))}s`;
                } else {
                    w.style.animationPlayState = 'paused';
                }
            });
        }
        
        if (trainBubble) {
            trainBubble.innerText = `${speedKmh.toFixed(0)} km/h`;
        }

        // Tünel efekti (örneğin 400m-700m arası tünel olsun)
        const currentModPos = currentPosition % targetDistance;
        if (currentModPos > 400 && currentModPos < 800) {
            if (tunnelOverlay) tunnelOverlay.style.opacity = 1;
        } else {
            if (tunnelOverlay) tunnelOverlay.style.opacity = 0;
        }

        // B İstasyon tabelasını konumlandır
        if (animStation) {
            const stationLeft = 85;
            animStation.style.left = `${stationLeft}%`;
            animStation.innerText = currentPosition < targetDistance ? "B İstasyonu" : "C İstasyonu";
        }

        // 10. Grafik Verilerini Kaydet (Her 1 saniyede bir)
        timeElapsed += dt;
        if (Math.round(timeElapsed * 10) % 10 === 0) {
            chartTime.push(Math.round(timeElapsed));
            chartSpeed.push(speedKmh.toFixed(1));
            chartDistance.push(currentPosition.toFixed(0));

            // Grafikte maksimum 60 veri noktası göster
            if (chartTime.length > 60) {
                chartTime.shift();
                chartSpeed.shift();
                chartDistance.shift();
            }
            motionChart.update('none'); // Anlık performans için yumuşak güncelleme
        }
    }

    function startSimulation() {
        if (!isRunning) {
            isRunning = true;
            btnSimStart.innerText = "⏸️ Duraklat";
            btnSimStart.className = "action-btn success pause";
            simInterval = setInterval(simulateStep, 100);
        }
    }

    function pauseSimulation() {
        if (isRunning) {
            isRunning = false;
            btnSimStart.innerText = "▶️ Başlat";
            btnSimStart.className = "action-btn success";
            clearInterval(simInterval);
        }
    }

    btnSimStart.addEventListener('click', () => {
        if (isRunning) {
            pauseSimulation();
        } else {
            startSimulation();
        }
    });

    btnSimReset.addEventListener('click', () => {
        pauseSimulation();
        timeElapsed = 0;
        currentSpeed = 0;
        currentPosition = 0;
        currentAcceleration = 0;
        setDrivingMode('coast');
        
        gaugeSpeed.innerHTML = `0.0 <small>km/h</small>`;
        gaugeAcc.innerHTML = `0.00 <small>m/s²</small>`;
        gaugeDist.innerHTML = `0 <small>m</small>`;
        gaugeRes.innerHTML = `0.0 <small>kN</small>`;
        
        if (animTrain) animTrain.style.left = `-150px`;
        
        // Grafik temizleme
        chartTime.length = 0;
        chartSpeed.length = 0;
        chartDistance.length = 0;
        motionChart.update();
    });


    // --- 4. SİNYALİZASYON VE ANKLAŞMAN SİMÜLATÖRÜ ---
    // İstasyon Sahası Modeli
    const sections = {
        in: { id: "Giris_Blogu", occupied: false, locked: false, elSvg: document.getElementById('svg-sec-in'), elLbl: document.getElementById('lbl-sec-in'), name: "Giriş Bloğu" },
        main: { id: "Ana_Hat_T1", occupied: false, locked: false, elSvg: document.getElementById('svg-sec-main'), elLbl: document.getElementById('lbl-sec-main'), name: "Ana Hat (T1)" },
        loop: { id: "Istasyon_Yolu_T2", occupied: false, locked: false, elSvg: document.getElementById('svg-sec-loop'), elLbl: document.getElementById('lbl-sec-loop'), name: "İstasyon Yolu (T2)" },
        out: { id: "Cikis_Blogu", occupied: false, locked: false, elSvg: document.getElementById('svg-sec-out'), elLbl: document.getElementById('lbl-sec-out'), name: "Çıkış Bloğu" }
    };

    const switches = {
        in: { id: "Makas_Giris", position: "NORMAL", locked: false, elLbl: document.getElementById('lbl-sw-in') },
        out: { id: "Makas_Cikis", position: "NORMAL", locked: false, elLbl: document.getElementById('lbl-sw-out') }
    };

    const signals = {
        in: { id: "sig-in", aspect: "RED", el: document.getElementById('sig-in') },
        out1: { id: "sig-out-1", aspect: "RED", el: document.getElementById('sig-out-1') },
        out2: { id: "sig-out-2", aspect: "RED", el: document.getElementById('sig-out-2') }
    };

    let activeRoute = null; // 'main' or 'loop'

    // Olay Günlüğüne Yaz
    function logInterlocking(msg, type = 'info') {
        const logWindow = document.getElementById('interlocking-logs');
        if (logWindow) {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const line = document.createElement('div');
            line.className = `log-line ${type}`;
            line.innerText = `[${timeStr}] ${msg}`;
            logWindow.appendChild(line);
            logWindow.scrollTop = logWindow.scrollHeight;
        }
    }

    // Arayüz Tablosunu ve SVG'leri Güncelle
    function updateInterlockingUI() {
        // Tablo güncelleme
        document.getElementById('tbl-sec-in-state').innerText = sections.in.occupied ? "İŞGAL" : "BOŞ";
        document.getElementById('tbl-sec-in-state').className = sections.in.occupied ? "text-danger" : "";
        document.getElementById('tbl-sec-in-lock').innerText = sections.in.locked ? "KİLİTLİ" : "AÇIK";
        
        document.getElementById('tbl-sec-main-state').innerText = sections.main.occupied ? "İŞGAL" : "BOŞ";
        document.getElementById('tbl-sec-main-state').className = sections.main.occupied ? "text-danger" : "";
        document.getElementById('tbl-sec-main-lock').innerText = sections.main.locked ? "KİLİTLİ" : "AÇIK";
        
        document.getElementById('tbl-sec-loop-state').innerText = sections.loop.occupied ? "İŞGAL" : "BOŞ";
        document.getElementById('tbl-sec-loop-state').className = sections.loop.occupied ? "text-danger" : "";
        document.getElementById('tbl-sec-loop-lock').innerText = sections.loop.locked ? "KİLİTLİ" : "AÇIK";

        document.getElementById('tbl-sec-out-state').innerText = sections.out.occupied ? "İŞGAL" : "BOŞ";
        document.getElementById('tbl-sec-out-state').className = sections.out.occupied ? "text-danger" : "";
        document.getElementById('tbl-sec-out-lock').innerText = sections.out.locked ? "KİLİTLİ" : "AÇIK";

        document.getElementById('tbl-sw-in-state').innerText = switches.in.position;
        document.getElementById('tbl-sw-in-lock').innerText = switches.in.locked ? "KİLİTLİ" : "AÇIK";

        // SVG Renklerini Güncelle
        Object.keys(sections).forEach(key => {
            const sec = sections[key];
            if (sec.elSvg) {
                sec.elSvg.className.baseVal = "track-sec"; // reset class
                if (sec.occupied) {
                    sec.elSvg.classList.add('occupied');
                    if (sec.elLbl) sec.elLbl.textContent = `${sec.name.toUpperCase()} (İşgal)`;
                } else if (sec.locked) {
                    sec.elSvg.classList.add('locked');
                    if (sec.elLbl) sec.elLbl.textContent = `${sec.name.toUpperCase()} (Kilitli)`;
                    
                    // Eğer rota kurulduysa ve bu hat rota üzerindeyse established rengi ver
                    if (activeRoute === 'main' && (key === 'in' || key === 'main' || key === 'out')) {
                        sec.elSvg.classList.remove('locked');
                        sec.elSvg.classList.add('established');
                    }
                    if (activeRoute === 'loop' && (key === 'in' || key === 'loop' || key === 'out')) {
                        sec.elSvg.classList.remove('locked');
                        sec.elSvg.classList.add('established');
                    }
                } else {
                    if (sec.elLbl) sec.elLbl.textContent = `${sec.name.toUpperCase()} (Boş)`;
                }
            }
        });

        // Makas Çizimlerini Güncelle
        const swInMain = document.querySelector('.track-switch-main');
        const swInDiv = document.querySelector('.track-switch-div');
        const swOutMain = document.querySelectorAll('.track-switch-main')[1];
        const swOutDiv = document.querySelectorAll('.track-switch-div')[1];

        if (switches.in.position === "NORMAL") {
            if (swInMain) swInMain.classList.add('active');
            if (swInDiv) swInDiv.classList.remove('active');
            switches.in.elLbl.textContent = "Makas Giriş: DÜZ";
        } else {
            if (swInMain) swInMain.classList.remove('active');
            if (swInDiv) swInDiv.classList.add('active');
            switches.in.elLbl.textContent = "Makas Giriş: SAPMA";
        }

        if (switches.out.position === "NORMAL") {
            if (swOutMain) swOutMain.classList.add('active');
            if (swOutDiv) swOutDiv.classList.remove('active');
            switches.out.elLbl.textContent = "Makas Çıkış: DÜZ";
        } else {
            if (swOutMain) swOutMain.classList.remove('active');
            if (swOutDiv) swOutDiv.classList.add('active');
            switches.out.elLbl.textContent = "Makas Çıkış: SAPMA";
        }

        // Sinyalleri Güncelle
        Object.keys(signals).forEach(key => {
            const sig = signals[key];
            if (sig.el) {
                sig.el.className.baseVal = "signal-lamp";
                sig.el.classList.add(sig.aspect.toLowerCase());
            }
        });
    }

    // Hat bloklarına tıklayarak işgal durumunu tetikleme
    Object.keys(sections).forEach(key => {
        const sec = sections[key];
        if (sec.elSvg) {
            sec.elSvg.addEventListener('click', () => {
                // Eğer rota aktif ve kilitliyse işgal durumu sadece tren geçerken değişmeli, elle değil uyarısı ver
                if (sec.locked && !sec.occupied) {
                    logInterlocking(`⚠️ UYARI: Kilitli ${sec.name} kesimi manuel işgal edilemez!`, 'warn');
                    return;
                }
                sec.occupied = !sec.occupied;
                logInterlocking(`${sec.name} durumu değiştirildi: ${sec.occupied ? "İŞGAL EDİLDİ" : "BOŞALTILDI"}`);
                updateInterlockingUI();
                
                // Eğer tren hareket halindeyse ve önüne engel çıktıysa sinyalleri kırmızıya çevir!
                if (sec.occupied && isTrainMovingInInterlocking) {
                    logInterlocking(`🚨 ACİL DURUM: Rota üzerinde beklenmedik işgal tespit edildi!`, 'error');
                    signals.in.aspect = "RED";
                    updateInterlockingUI();
                }
            });
        }
    });

    // Rota Kurma Talebi (Ana Hat)
    document.getElementById('btn-route-main').addEventListener('click', () => {
        logInterlocking("🔍 Rota Talebi alındı: [Giriş -> Ana Hat T1 -> Çıkış]");
        
        // 1. Emniyet Koşulları
        if (sections.in.occupied || sections.main.occupied || sections.out.occupied) {
            logInterlocking("❌ HATA: Rota üzerindeki bir veya daha fazla hat bölümü dolu!", "error");
            return;
        }
        if (sections.in.locked || sections.main.locked || sections.out.locked) {
            logInterlocking("❌ HATA: Rota üzerindeki hat bölümleri başka bir rota için kilitli!", "error");
            return;
        }
        if (switches.in.locked && switches.in.position !== "NORMAL") {
            logInterlocking("❌ HATA: Giriş makası başka bir rotada sapmaya kilitlenmiş!", "error");
            return;
        }

        // 2. Koşullar sağlandı, makasları ayarla ve kilitle
        switches.in.position = "NORMAL";
        switches.out.position = "NORMAL";
        switches.in.locked = true;
        switches.out.locked = true;
        
        // Hat bölümlerini kilitle
        sections.in.locked = true;
        sections.main.locked = true;
        sections.out.locked = true;

        activeRoute = 'main';
        signals.in.aspect = "GREEN";
        
        logInterlocking("⚙️ Giriş ve Çıkış makasları NORMAL konuma alındı ve kilitlendi.", "system");
        logInterlocking("🔒 Rota hat bölümleri kilitlendi.", "system");
        logInterlocking("✅ ROTA ONAYLANDI: RSR-EN-50129-SIL4 Anklaşman Onayı. Giriş sinyali: YEŞİL.", "success");
        
        document.getElementById('btn-route-main').classList.add('active');
        document.getElementById('btn-route-loop').classList.remove('active');
        document.getElementById('btn-route-release').disabled = false;
        document.getElementById('btn-send-train').disabled = false;
        
        updateInterlockingUI();
    });

    // Rota Kurma Talebi (İstasyon Yolu / Sapma)
    document.getElementById('btn-route-loop').addEventListener('click', () => {
        logInterlocking("🔍 Rota Talebi alındı: [Giriş -> İstasyon Yolu T2 -> Çıkış]");
        
        // 1. Emniyet Koşulları
        if (sections.in.occupied || sections.loop.occupied || sections.out.occupied) {
            logInterlocking("❌ HATA: Rota üzerindeki bir veya daha fazla hat bölümü dolu!", "error");
            return;
        }
        if (sections.in.locked || sections.loop.locked || sections.out.locked) {
            logInterlocking("❌ HATA: Rota üzerindeki hat bölümleri başka bir rota için kilitli!", "error");
            return;
        }
        if (switches.in.locked && switches.in.position !== "REVERSE") {
            logInterlocking("❌ HATA: Giriş makası başka bir rotada düz hatta kilitlenmiş!", "error");
            return;
        }

        // 2. Koşullar sağlandı, makasları ayarla ve kilitle
        switches.in.position = "REVERSE";
        switches.out.position = "REVERSE";
        switches.in.locked = true;
        switches.out.locked = true;
        
        // Hat bölümlerini kilitle
        sections.in.locked = true;
        sections.loop.locked = true;
        sections.out.locked = true;

        activeRoute = 'loop';
        signals.in.aspect = "YELLOW"; // Sapmalı rotalarda sarı sinyal verilir
        
        logInterlocking("⚙️ Giriş ve Çıkış makasları SAPMA (Reverse) konumuna alındı ve kilitlendi.", "system");
        logInterlocking("🔒 Rota hat bölümleri kilitlendi.", "system");
        logInterlocking("✅ ROTA ONAYLANDI: RSR-EN-50129-SIL4 Anklaşman Onayı. Giriş sinyali: SARI.", "success");
        
        document.getElementById('btn-route-main').classList.remove('active');
        document.getElementById('btn-route-loop').classList.add('active');
        document.getElementById('btn-route-release').disabled = false;
        document.getElementById('btn-send-train').disabled = false;
        
        updateInterlockingUI();
    });

    // Rota Kilitlerini Çözme
    function releaseAllLocks() {
        switches.in.locked = false;
        switches.out.locked = false;
        
        Object.keys(sections).forEach(key => {
            sections[key].locked = false;
        });

        activeRoute = null;
        signals.in.aspect = "RED";
        signals.out1.aspect = "RED";
        signals.out2.aspect = "RED";

        logInterlocking("🔓 Rota kilitleri çözüldü. Tüm sinyaller KIRMIZI.");
        
        document.getElementById('btn-route-main').classList.remove('active');
        document.getElementById('btn-route-loop').classList.remove('active');
        document.getElementById('btn-route-release').disabled = true;
        document.getElementById('btn-send-train').disabled = true;
        
        updateInterlockingUI();
    }

    document.getElementById('btn-route-release').addEventListener('click', releaseAllLocks);

    // İnteraktif Anklaşman Tren Gönderme Animasyonu
    let isTrainMovingInInterlocking = false;
    document.getElementById('btn-send-train').addEventListener('click', () => {
        if (isTrainMovingInInterlocking || !activeRoute) return;
        
        isTrainMovingInInterlocking = true;
        document.getElementById('btn-send-train').disabled = true;
        document.getElementById('btn-route-release').disabled = true;
        
        const svgTrain = document.getElementById('svg-train-entity');
        svgTrain.style.opacity = 1;
        
        logInterlocking("🚂 Simüle tren yola çıktı. Giriş bloğuna giriyor...");
        
        let pathProgress = 0;
        let speed = 4; // Piksel/adım
        let x = 50;
        let y = 142;
        
        sections.in.occupied = true;
        updateInterlockingUI();

        const animationInterval = setInterval(() => {
            // Eğer yoldayken sinyal aniden kırmızıya dönerse tren acil fren yapar!
            if (signals.in.aspect === "RED" && x < 280) {
                clearInterval(animationInterval);
                logInterlocking("🚨 ACİL FREN: Tren kırmızı sinyal nedeniyle acil durduruldu!", "error");
                isTrainMovingInInterlocking = false;
                return;
            }

            x += speed;
            
            // Yol ayrımı (Makas 1)
            if (x >= 300 && x < 350) {
                if (activeRoute === 'loop') {
                    // Sapmaya gir (Yükseklik 142'den 82'ye azalıyor)
                    y = 142 - ((x - 300) / 50) * 60;
                }
            }
            
            // Blok doluluk simülasyonları
            if (x === 200) {
                logInterlocking("ℹ️ Tren Giriş bloğunu işgal ediyor.");
            }
            if (x === 300) {
                sections.in.occupied = false;
                if (activeRoute === 'main') {
                    sections.main.occupied = true;
                    logInterlocking("ℹ️ Tren Ana Hat T1 bloğuna girdi. Giriş bloğu boşaldı.");
                } else {
                    sections.loop.occupied = true;
                    logInterlocking("ℹ️ Tren İstasyon Yolu T2 bloğuna girdi. Giriş bloğu boşaldı.");
                }
                updateInterlockingUI();
            }
            
            // Çıkış Makas birleşimi
            if (x >= 650 && x < 700) {
                if (activeRoute === 'loop') {
                    y = 82 + ((x - 650) / 50) * 60;
                }
            }

            if (x === 660) {
                if (activeRoute === 'main') {
                    sections.main.occupied = false;
                    signals.out1.aspect = "GREEN";
                } else {
                    sections.loop.occupied = false;
                    signals.out2.aspect = "GREEN";
                }
                sections.out.occupied = true;
                logInterlocking("ℹ️ Tren Çıkış bloğuna girdi. İstasyon yolları temiz.");
                updateInterlockingUI();
            }

            // Sınır sınır konumlandırma
            svgTrain.setAttribute('x', x);
            svgTrain.setAttribute('y', y);
            
            if (x >= 950) {
                clearInterval(animationInterval);
                svgTrain.style.opacity = 0;
                sections.out.occupied = false;
                logInterlocking("✅ Tren istasyon bölgesini emniyetle terk etti.", "success");
                isTrainMovingInInterlocking = false;
                
                // Rotayı otomatik çöz
                releaseAllLocks();
            }
        }, 30);
    });

    updateInterlockingUI();


    // --- 5. TEKNİK SÖZLÜK ---
    const glossaryData = [
        { tr: "Boji", en: "Bogie / Truck", cat: "traction", desc: "Tekerlek takımlarını taşıyan ve vagon gövdesine esnek bir şekilde yataklık eden, süspansiyon elemanlarını barındıran kritik taşıyıcı mekanik alt sistem." },
        { tr: "Cer", en: "Traction", cat: "traction", desc: "Trenin hareket etmesini sağlayan çekiş gücü ve bununla ilgili motor, invertör ve dişli kutusu sistemleri." },
        { tr: "Katener", en: "Catenary", desc: "Elektrikli trenlere havai hat üzerinden pantoğraf vasıtasıyla yüksek gerilim (örn: 25kV AC) besleyen askı telleri sistemi.", cat: "infrastructure" },
        { tr: "Anklaşman", en: "Interlocking", desc: "Sinyaller, makaslar ve ray devreleri arasında elektriksel veya yazılımsal kilitlemeler kurarak çelişen rota taleplerini engelleyen güvenlik sistemi.", cat: "signaling" },
        { tr: "Makas", en: "Turnout / Switch", desc: "Trenin bir ray hattından diğer bir ray hattına emniyetle geçmesini sağlayan hareketli ray dillerinden oluşan mekanizma.", cat: "infrastructure" },
        { tr: "Üçüncü Ray", en: "Third Rail", desc: "Genellikle metrolarda tünel tabanında konumlandırılan, trenlerin akım toplama pabuçları yardımıyla enerji aldığı (örn: 750V DC) korumalı bara hattı.", cat: "infrastructure" },
        { tr: "Balast", en: "Ballast", desc: "Traverlerin altına serilen, raydan gelen yükü tabana dağıtan, drenaj sağlayan ve ot oluşumunu engelleyen köşeli kırmataş tabakası.", cat: "infrastructure" },
        { tr: "Aks Sayıcı", en: "Axle Counter", desc: "Rayın iki noktasına yerleştirilen sensörlerle tekerlek akslarını sayarak bir bloğa giren ve çıkan tren aksı eşitliğini denetleyen tren tespit sistemi.", cat: "signaling" },
        { tr: "Ray Devresi", en: "Track Circuit", desc: "Rayları elektrik devresi olarak kullanarak tekerlek aksının devreyi kısa devre etmesi prensibiyle trenin varlığını saptayan klasik blok kontrol sistemi.", cat: "signaling" },
        { tr: "Pantoğraf", en: "Pantograph", desc: "Katener teline yay gücüyle basarak trendeki cer transformatörüne yüksek gerilim akımını aktaran çatı üstü akım toplama kolu.", cat: "traction" },
        { tr: "RAMS", en: "RAMS", desc: "Demiryolu emniyet standartlarının temeli olan Güvenilirlik (Reliability), Kullanılabilirlik (Availability), Bakım Yapılabilirlik (Maintainability) ve Emniyet (Safety) kelimelerinin kısaltması.", cat: "safety" },
        { tr: "SIL", en: "Safety Integrity Level", desc: "EN 50126/128/129 standartlarına göre bir sistemin emniyet bütünlük seviyesi (SIL1 en düşük, SIL4 en yüksek emniyet seviyesidir).", cat: "safety" },
        { tr: "ERTMS", en: "European Rail Traffic Management System", desc: "Avrupa demiryollarında sınır geçişlerini kolaylaştırmak ve hız güvenliğini artırmak için geliştirilen, Eurobalise ve GSM-R tabanlı standart sinyalizasyon sistemi.", cat: "signaling" },
        { tr: "CBTC", en: "Communication Based Train Control", desc: "Haberleşme tabanlı tren kontrolü. Tren ve hat boyu bilgisayarlarının sürekli Wi-Fi iletişimiyle otonom (GoA4) sürüş sağlayan metro sinyalizasyon mimarisi.", cat: "signaling" }
    ];

    const glossaryBody = document.getElementById('glossary-body');
    const searchInput = document.getElementById('glossary-search');
    const filterTags = document.querySelectorAll('.filter-tag');

    function populateGlossary(filterCat = 'all', query = '') {
        if (!glossaryBody) return;
        glossaryBody.innerHTML = '';
        
        const filtered = glossaryData.filter(item => {
            const matchesCat = filterCat === 'all' || item.cat === filterCat;
            const matchesQuery = item.tr.toLowerCase().includes(query.toLowerCase()) || 
                                 item.en.toLowerCase().includes(query.toLowerCase()) ||
                                 item.desc.toLowerCase().includes(query.toLowerCase());
            return matchesCat && matchesQuery;
        });

        if (filtered.length === 0) {
            glossaryBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">Eşleşen terim bulunamadı.</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.tr}</strong></td>
                <td><em>${item.en}</em></td>
                <td><span class="cat-badge ${item.cat}">${item.cat.toUpperCase()}</span></td>
                <td>${item.desc}</td>
            `;
            glossaryBody.appendChild(tr);
        });
    }

    // Arama ve filtre tetikleyicileri
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const activeCat = document.querySelector('.filter-tag.active').getAttribute('data-cat');
            populateGlossary(activeCat, searchInput.value);
        });
    }

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            const cat = tag.getAttribute('data-cat');
            populateGlossary(cat, searchInput ? searchInput.value : '');
        });
    });

    populateGlossary();


    // --- 6. BİLGİ YARIŞMASI (QUIZ) ---
    const quizQuestions = [
        {
            q: "Trenlerin aerodinamik ve mekanik dirençlerini hesaplamak için kullanılan standart formül aşağıdakilerden hangisidir?",
            opts: ["Newton Kanunu", "Davis Denklemi", "Bernoulli Eşitliği", "Hertzian Gerilme Formülü"],
            answer: 1
        },
        {
            q: "EN 50126, EN 50128 ve EN 50129 standartları demiryolu mühendisliğinde hangi alanın temelini oluşturur?",
            opts: ["Hat Geometrisi Tasarımı", "RAMS ve Sistem Emniyeti", "Katener Akım Toplama Limitleri", "Boji Şasisi Statik Yükleri"],
            answer: 1
        },
        {
            q: "Sürücüsüz metrolarda (GoA Seviye 4) trenler arası güvenlik mesafesini en aza indiren sinyalizasyon çalışma prensibi nedir?",
            opts: ["Sabit Blok (Fixed Block)", "Ray Devresi (Track Circuit)", "Hareketli Blok (Moving Block)", "Mekanik Anklaşman"],
            answer: 2
        },
        {
            q: "Katener telinden akım toplayarak cer transformatörüne aktaran çatı üstü hareketli kolun adı nedir?",
            opts: ["Boji", "Aks Sayıcı", "Travers", "Pantoğraf"],
            answer: 3
        },
        {
            q: "Ray çeliklerinin tekerlek teması altında maruz kaldığı aşınma ve ezilme gerilmelerini inceleyen mekanik dalı hangisidir?",
            opts: ["Hertzian Temas Mekaniği", "Davis Aerodinamiği", "Akışkanlar Dinamiği", "Termodinamik Çevrimler"],
            answer: 0
        }
    ];

    let currentQuestionIdx = 0;
    let quizScore = 0;

    const quizStart = document.getElementById('quiz-start');
    const quizPlay = document.getElementById('quiz-play');
    const quizEnd = document.getElementById('quiz-end');
    const qText = document.getElementById('q-text');
    const qCurrent = document.getElementById('q-current');
    const quizOptionsContainer = document.querySelector('.quiz-options');
    const quizScoreText = document.getElementById('quiz-score-text');
    const certBadge = document.getElementById('cert-badge');

    const certModal = document.getElementById('cert-modal');
    const closeCert = document.getElementById('close-cert');

    document.getElementById('btn-start-quiz').addEventListener('click', () => {
        quizStart.style.display = 'none';
        quizPlay.style.display = 'block';
        loadQuestion(0);
    });

    function loadQuestion(idx) {
        currentQuestionIdx = idx;
        const q = quizQuestions[idx];
        qText.innerText = q.q;
        qCurrent.innerText = idx + 1;
        
        quizOptionsContainer.innerHTML = '';
        q.opts.forEach((opt, oIdx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.innerText = opt;
            btn.addEventListener('click', () => selectAnswer(oIdx));
            quizOptionsContainer.appendChild(btn);
        });
    }

    function selectAnswer(optIdx) {
        const q = quizQuestions[currentQuestionIdx];
        const buttons = quizOptionsContainer.querySelectorAll('.quiz-opt');
        
        // Şıkları kilitle
        buttons.forEach((btn, bIdx) => {
            btn.disabled = true;
            if (bIdx === q.answer) {
                btn.classList.add('correct');
            } else if (bIdx === optIdx) {
                btn.classList.add('incorrect');
            }
        });

        if (optIdx === q.answer) {
            quizScore++;
        }

        setTimeout(() => {
            if (currentQuestionIdx < quizQuestions.length - 1) {
                loadQuestion(currentQuestionIdx + 1);
            } else {
                showQuizResults();
            }
        }, 1200);
    }

    function showQuizResults() {
        quizPlay.style.display = 'none';
        quizEnd.style.display = 'block';
        
        quizScoreText.innerText = `5 sorudan ${quizScore} tanesine doğru cevap verdiniz.`;
        
        // Eğer 5/5 yaptıysa sertifikayı göster ve modalı aç
        if (quizScore === 5) {
            certBadge.style.display = 'block';
            
            // Rastgele sertifika numarası üret
            const serialNum = `RSR-${Math.floor(10000 + Math.random() * 90000)}-2026`;
            document.getElementById('cert-serial').innerText = `Seri No: ${serialNum}`;
            
            setTimeout(() => {
                const name = prompt("Tebrikler! Kusursuz bir skor aldınız. Sertifikanız için lütfen adınızı soyadınızı girin:");
                if (name) {
                    document.getElementById('cert-name-input').innerText = name.toUpperCase();
                    const studentNames = document.querySelectorAll('.student-name');
                    studentNames.forEach(el => el.innerText = name);
                }
                certModal.style.display = 'flex';
            }, 500);
        } else {
            certBadge.style.display = 'none';
        }
    }

    document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        quizScore = 0;
        quizEnd.style.display = 'none';
        quizStart.style.display = 'block';
    });

    if (closeCert) {
        closeCert.addEventListener('click', () => {
            certModal.style.display = 'none';
        });
    }

    window.onclick = function(event) {
        if (event.target === certModal) {
            certModal.style.display = 'none';
        }
    }


    // --- 7. CO2 & ENERJİ TASARRUFU HESAPLAYICI ---
    const calcType = document.getElementById('calc-type');
    const inputQty = document.getElementById('calc-qty');
    const inputDist = document.getElementById('calc-dist');
    const lblQty = document.getElementById('lbl-calc-qty');
    const btnCalculate = document.getElementById('btn-calculate-emissions');
    const calcResultsDiv = document.getElementById('calc-results');

    calcType.addEventListener('change', () => {
        if (calcType.value === 'passenger') {
            lblQty.innerText = "Yolcu Sayısı (Kişi)";
            inputQty.value = "500";
        } else {
            lblQty.innerText = "Yük Miktarı (Ton)";
            inputQty.value = "1200";
        }
    });

    btnCalculate.addEventListener('click', () => {
        const type = calcType.value;
        const qty = parseFloat(inputQty.value);
        const dist = parseFloat(inputDist.value);
        
        if (isNaN(qty) || isNaN(dist) || qty <= 0 || dist <= 0) {
            alert("Lütfen geçerli miktar ve mesafe değerleri girin.");
            return;
        }

        // Emisyon Faktörleri (kg CO2 / birim-km)
        // Yolcu için: yolcu-km başına CO2 salınımı
        // Yük için: ton-km başına CO2 salınımı
        let co2AirFactor = 0.15; // Havayolu yolcu-km
        let co2RoadFactor = 0.11; // Karayolu otomobil yolcu-km
        let co2RailFactor = 0.015; // Elektrikli demiryolu yolcu-km

        if (type === 'freight') {
            co2AirFactor = 0.60; // Uçak kargo ton-km
            co2RoadFactor = 0.08; // Kamyon ton-km
            co2RailFactor = 0.012; // Elektrikli yük treni ton-km
        }

        const totalAir = qty * dist * co2AirFactor;
        const totalRoad = qty * dist * co2RoadFactor;
        const totalRail = qty * dist * co2RailFactor;

        // Barların genişlik oranlarını en büyük değere göre ayarla
        const maxVal = Math.max(totalAir, totalRoad, totalRail);
        const widthAir = (totalAir / maxVal) * 100;
        const widthRoad = (totalRoad / maxVal) * 100;
        const widthRail = (totalRail / maxVal) * 100;

        document.getElementById('res-val-air').innerText = `${Math.round(totalAir).toLocaleString()} kg CO₂`;
        document.getElementById('res-val-road').innerText = `${Math.round(totalRoad).toLocaleString()} kg CO₂`;
        document.getElementById('res-val-rail').innerText = `${Math.round(totalRail).toLocaleString()} kg CO₂`;

        document.getElementById('res-bar-air').style.width = `${widthAir}%`;
        document.getElementById('res-bar-road').style.width = `${widthRoad}%`;
        document.getElementById('res-bar-rail').style.width = `${widthRail}%`;

        // Tasarruf Analizi
        const savingsRoad = totalRoad - totalRail;
        // 1 ağacın yılda yaklaşık 20 kg CO2 absorbe ettiği varsayılır
        const treesSaved = Math.round(savingsRoad / 20);

        const summaryText = document.getElementById('saving-summary');
        if (type === 'passenger') {
            summaryText.innerHTML = `Bu seyahatte demiryolu seçilerek karayoluna kıyasla <strong>${Math.round(savingsRoad).toLocaleString()} kg CO₂</strong> daha az salınım yapılmıştır. Bu çevre tasarrufu, <strong>${treesSaved.toLocaleString()} adet ağacın</strong> 1 yılda absorbe edebileceği karbon miktarına eşdeğerdir!`;
        } else {
            summaryText.innerHTML = `Bu yük taşımasında elektrikli demiryolu seçilerek karayoluna (kamyon) kıyasla <strong>${Math.round(savingsRoad).toLocaleString()} kg CO₂</strong> daha az salınım yapılmıştır. Bu çevre tasarrufu, <strong>${treesSaved.toLocaleString()} adet ağacın</strong> 1 yılda absorbe edebileceği karbon miktarına eşdeğerdir!`;
        }

        calcResultsDiv.style.display = 'block';
    });

});

